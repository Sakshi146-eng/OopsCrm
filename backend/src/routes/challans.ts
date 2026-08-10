import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { PrismaClient, ChallanStatus } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// Helper: generate challan number
async function generateChallanNumber(): Promise<string> {
  const count = await prisma.salesChallan.count();
  return `CHN-${1001 + count}`;
}

// GET /api/challans — List all challans
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, customer_id, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Record<string, unknown> = {};
    if (status) where.status = status as ChallanStatus;
    if (customer_id) where.customer_id = customer_id;

    const [challans, total] = await Promise.all([
      prisma.salesChallan.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { name: true, business_name: true } },
          created_by_user: { select: { name: true } },
          items: { include: { product: { select: { name: true, sku: true } } } },
        },
      }),
      prisma.salesChallan.count({ where }),
    ]);

    res.json({
      success: true,
      data: challans,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/challans/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const challan = await prisma.salesChallan.findUnique({
      where: { id: req.params.id as string },
      include: {
        customer: true,
        created_by_user: { select: { name: true, email: true } },
        items: { include: { product: { select: { name: true, sku: true, current_stock: true } } } },
      },
    });
    if (!challan) {
      res.status(404).json({ success: false, message: 'Challan not found' });
      return;
    }
    res.json({ success: true, data: challan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/challans — Create Draft or Confirmed
router.post(
  '/',
  authorize('ADMIN', 'SALES'),
  [
    body('customer_id').notEmpty().withMessage('Customer ID required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item required'),
    body('items.*.product_id').notEmpty().withMessage('Product ID required for each item'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('status').optional().isIn(['DRAFT', 'CONFIRMED']),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { customer_id, items, status = 'DRAFT' } = req.body;
      const userId = req.user!.userId;

      // Validate customer exists
      const customer = await prisma.customer.findUnique({ where: { id: customer_id } });
      if (!customer) {
        res.status(404).json({ success: false, message: 'Customer not found' });
        return;
      }

      // Fetch all products
      const productIds: string[] = items.map((i: { product_id: string }) => i.product_id);
      const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
      if (products.length !== productIds.length) {
        res.status(404).json({ success: false, message: 'One or more products not found' });
        return;
      }

      const challan_number = await generateChallanNumber();
      const total_quantity = items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

      const customer_snapshot = {
        id: customer.id,
        name: customer.name,
        business_name: customer.business_name,
        mobile: customer.mobile,
        email: customer.email,
        gst_number: customer.gst_number,
        address: customer.address,
      };

      const challanItemsData = items.map((item: { product_id: string; quantity: number }) => {
        const product = products.find(p => p.id === item.product_id)!;
        return {
          product_id: item.product_id,
          product_name_snapshot: product.name,
          unit_price_snapshot: product.unit_price,
          quantity: item.quantity,
        };
      });

      if (status === 'CONFIRMED') {
        // ── ATOMIC TRANSACTION ──────────────────────────────────
        const result = await prisma.$transaction(async (tx) => {
          // 1. Stock check
          for (const item of items) {
            const product = products.find(p => p.id === item.product_id)!;
            if (product.current_stock < item.quantity) {
              throw new Error(`Insufficient stock for product: ${product.name} (available: ${product.current_stock})`);
            }
          }

          // 2. Create challan with items
          const newChallan = await tx.salesChallan.create({
            data: {
              challan_number,
              customer_id,
              customer_snapshot,
              total_quantity,
              status: 'CONFIRMED',
              created_by: userId,
              items: { create: challanItemsData },
            },
            include: { items: true },
          });

          // 3. Deduct stock & create OUT movements for each item
          for (const item of challanItemsData) {
            await tx.product.update({
              where: { id: item.product_id },
              data: { current_stock: { decrement: item.quantity } },
            });
            await tx.stockMovement.create({
              data: {
                product_id: item.product_id,
                quantity_changed: item.quantity,
                movement_type: 'OUT',
                reason: `Sales Challan ${challan_number}`,
                created_by: userId,
              },
            });
          }

          return newChallan;
        });

        res.status(201).json({ success: true, data: result });
      } else {
        // Draft — no stock deduction
        const challan = await prisma.salesChallan.create({
          data: {
            challan_number,
            customer_id,
            customer_snapshot,
            total_quantity,
            status: 'DRAFT',
            created_by: userId,
            items: { create: challanItemsData },
          },
          include: { items: true },
        });
        res.status(201).json({ success: true, data: challan });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Server error';
      const isStockError = message.startsWith('Insufficient stock');
      res.status(isStockError ? 400 : 500).json({ success: false, message });
    }
  }
);

// PUT /api/challans/:id/status — Update status
router.put(
  '/:id/status',
  authorize('ADMIN', 'SALES'),
  [body('status').isIn(['CONFIRMED', 'CANCELLED']).withMessage('Status must be CONFIRMED or CANCELLED')],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status } = req.body;
      const userId = req.user!.userId;

      const challan = await prisma.salesChallan.findUnique({
        where: { id: req.params.id as string },
        include: { items: { include: { product: true } } },
      });

      if (!challan) {
        res.status(404).json({ success: false, message: 'Challan not found' });
        return;
      }

      if (challan.status !== 'DRAFT') {
        res.status(400).json({ success: false, message: 'Only DRAFT challans can be updated' });
        return;
      }

      if (status === 'CONFIRMED') {
        // ── ATOMIC TRANSACTION ──────────────────────────────────
        const result = await prisma.$transaction(async (tx) => {
          // 1. Re-fetch fresh stock counts
          const productIds = challan.items.map(i => i.product_id);
          const freshProducts = await tx.product.findMany({ where: { id: { in: productIds } } });

          // 2. Stock check
          for (const item of challan.items) {
            const product = freshProducts.find(p => p.id === item.product_id)!;
            if (product.current_stock < item.quantity) {
              throw new Error(`Insufficient stock for product: ${product.name} (available: ${product.current_stock})`);
            }
          }

          // 3. Deduct stock & create OUT movements
          for (const item of challan.items) {
            await tx.product.update({
              where: { id: item.product_id },
              data: { current_stock: { decrement: item.quantity } },
            });
            await tx.stockMovement.create({
              data: {
                product_id: item.product_id,
                quantity_changed: item.quantity,
                movement_type: 'OUT',
                reason: `Sales Challan ${challan.challan_number}`,
                created_by: userId,
              },
            });
          }

          // 4. Update challan status
          return tx.salesChallan.update({
            where: { id: challan.id },
            data: { status: 'CONFIRMED' },
          });
        });

        res.json({ success: true, data: result });
      } else {
        // CANCELLED — just update status, no stock reversal for draft
        const updated = await prisma.salesChallan.update({
          where: { id: req.params.id as string },
          data: { status: 'CANCELLED' },
        });
        res.json({ success: true, data: updated });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Server error';
      const isStockError = message.startsWith('Insufficient stock');
      res.status(isStockError ? 400 : 500).json({ success: false, message });
    }
  }
);

export default router;
