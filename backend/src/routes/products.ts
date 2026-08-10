import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { PrismaClient, MovementType } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

// GET /api/products — List all products (with low-stock flag)
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
    const enriched = products.map(p => ({
      ...p,
      is_low_stock: p.current_stock <= p.min_stock_alert,
    }));
    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id as string },
      include: {
        stockMovements: {
          orderBy: { timestamp: 'desc' },
          take: 20,
          include: { user: { select: { name: true } } },
        },
      },
    });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.json({ success: true, data: { ...product, is_low_stock: product.current_stock <= product.min_stock_alert } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/products — Create
router.post(
  '/',
  authorize('ADMIN', 'WAREHOUSE'),
  [
    body('name').notEmpty().withMessage('Name required'),
    body('sku').notEmpty().withMessage('SKU required'),
    body('category').notEmpty().withMessage('Category required'),
    body('unit_price').isNumeric().withMessage('Valid unit price required'),
    body('current_stock').isInt({ min: 0 }).withMessage('Valid stock required'),
    body('min_stock_alert').isInt({ min: 0 }).withMessage('Valid min stock alert required'),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const product = await prisma.product.create({ data: req.body });
      res.status(201).json({ success: true, data: product });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        res.status(409).json({ success: false, message: 'SKU already exists' });
        return;
      }
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /api/products/:id — Update
router.put(
  '/:id',
  authorize('ADMIN', 'WAREHOUSE'),
  [
    body('unit_price').optional().isNumeric(),
    body('min_stock_alert').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Prevent direct stock manipulation via this route
      const { current_stock, ...rest } = req.body;
      void current_stock;
      const product = await prisma.product.update({ where: { id: req.params.id as string }, data: rest });
      res.json({ success: true, data: product });
    } catch {
      res.status(404).json({ success: false, message: 'Product not found' });
    }
  }
);

// DELETE /api/products/:id
router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.product.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Product deleted' });
  } catch {
    res.status(404).json({ success: false, message: 'Product not found' });
  }
});

// POST /api/products/stock-movement — Manual stock IN/OUT
router.post(
  '/stock-movement',
  authorize('ADMIN', 'WAREHOUSE'),
  [
    body('product_id').notEmpty().withMessage('Product ID required'),
    body('quantity_changed').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('movement_type').isIn(['IN', 'OUT']).withMessage('movement_type must be IN or OUT'),
    body('reason').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { product_id, quantity_changed, movement_type, reason } = req.body;
      const userId = req.user!.userId;

      const product = await prisma.product.findUnique({ where: { id: product_id } });
      if (!product) {
        res.status(404).json({ success: false, message: 'Product not found' });
        return;
      }

      if (movement_type === 'OUT' && product.current_stock < quantity_changed) {
        res.status(400).json({
          success: false,
          message: `Insufficient stock. Available: ${product.current_stock}`,
        });
        return;
      }

      const [movement, updatedProduct] = await prisma.$transaction([
        prisma.stockMovement.create({
          data: {
            product_id,
            quantity_changed,
            movement_type: movement_type as MovementType,
            reason,
            created_by: userId,
          },
        }),
        prisma.product.update({
          where: { id: product_id },
          data: {
            current_stock:
              movement_type === 'IN'
                ? { increment: quantity_changed }
                : { decrement: quantity_changed },
          },
        }),
      ]);

      res.status(201).json({ success: true, data: { movement, product: updatedProduct } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// GET /api/products/movements — Stock movement history
router.get('/movements/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { product_id, page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = product_id ? { product_id } : {};

    const movements = await prisma.stockMovement.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { timestamp: 'desc' },
      include: {
        product: { select: { name: true, sku: true } },
        user: { select: { name: true } },
      },
    });
    res.json({ success: true, data: movements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
