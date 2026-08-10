import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import { PrismaClient, CustomerType, CustomerStatus } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();
const prisma = new PrismaClient();

// All customer routes require authentication
router.use(authenticate);

// GET /api/customers — List with search & filter
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, status, type, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { business_name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status as CustomerStatus;
    if (type) where.type = type as CustomerType;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id as string},
      include: { salesChallans: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }
    res.json({ success: true, data: customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/customers — Create
router.post(
  '/',
  authorize('ADMIN', 'SALES'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('mobile').notEmpty().withMessage('Mobile is required'),
    body('type').isIn(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']).withMessage('Invalid customer type'),
    body('status').optional().isIn(['LEAD', 'ACTIVE', 'INACTIVE']),
    body('email').optional().isEmail(),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const customer = await prisma.customer.create({ data: req.body });
      res.status(201).json({ success: true, data: customer });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// PUT /api/customers/:id — Update
router.put(
  '/:id',
  authorize('ADMIN', 'SALES'),
  [
    body('name').optional().notEmpty(),
    body('type').optional().isIn(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
    body('status').optional().isIn(['LEAD', 'ACTIVE', 'INACTIVE']),
    body('email').optional().isEmail(),
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const customer = await prisma.customer.update({
        where: { id: req.params.id as string },
        data: req.body,
      });
      res.json({ success: true, data: customer });
    } catch {
      res.status(404).json({ success: false, message: 'Customer not found' });
    }
  }
);

// DELETE /api/customers/:id
router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id as string } });
    res.json({ success: true, message: 'Customer deleted' });
  } catch {
    res.status(404).json({ success: false, message: 'Customer not found' });
  }
});

// POST /api/customers/:id/notes — Add/Update notes
router.post(
  '/:id/notes',
  authorize('ADMIN', 'SALES'),
  [body('notes').notEmpty().withMessage('Notes cannot be empty')],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const customer = await prisma.customer.update({
        where: { id: req.params.id as string },
        data: { notes: req.body.notes },
      });
      res.json({ success: true, data: customer });
    } catch {
      res.status(404).json({ success: false, message: 'Customer not found' });
    }
  }
);

export default router;
