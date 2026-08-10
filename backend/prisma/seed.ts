import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── 1. Users ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@company.com' },
      update: {},
      create: { name: 'Admin User', email: 'admin@company.com', password_hash: passwordHash, role: 'ADMIN' },
    }),
    prisma.user.upsert({
      where: { email: 'sales@company.com' },
      update: {},
      create: { name: 'Sales Rep', email: 'sales@company.com', password_hash: passwordHash, role: 'SALES' },
    }),
    prisma.user.upsert({
      where: { email: 'warehouse@company.com' },
      update: {},
      create: { name: 'Warehouse Manager', email: 'warehouse@company.com', password_hash: passwordHash, role: 'WAREHOUSE' },
    }),
    prisma.user.upsert({
      where: { email: 'accounts@company.com' },
      update: {},
      create: { name: 'Accounts Executive', email: 'accounts@company.com', password_hash: passwordHash, role: 'ACCOUNTS' },
    }),
  ]);
  console.log(`✅ Created ${users.length} users`);

  // ── 2. Customers ─────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'cust-001' },
      update: {},
      create: {
        id: 'cust-001', name: 'Rajesh Sharma', mobile: '9876543210', email: 'rajesh@sharma.com',
        business_name: 'Sharma Traders', gst_number: '27AABCU9603R1ZX', type: 'WHOLESALE',
        address: '45 MG Road, Mumbai, MH 400001', status: 'ACTIVE', notes: 'Prefers bulk orders every month',
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-002' },
      update: {},
      create: {
        id: 'cust-002', name: 'Priya Patel', mobile: '9123456789', email: 'priya@patel.biz',
        business_name: 'Patel Enterprises', type: 'DISTRIBUTOR',
        address: '12 Ring Road, Ahmedabad, GJ 380001', status: 'ACTIVE',
        follow_up_date: new Date('2026-09-15'),
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-003' },
      update: {},
      create: {
        id: 'cust-003', name: 'Amit Kumar', mobile: '8899001122', email: 'amit.kumar@gmail.com',
        type: 'RETAIL', address: '7 Lajpat Nagar, Delhi 110024', status: 'LEAD',
        notes: 'Interested in electronics. Follow up next week.',
        follow_up_date: new Date('2026-08-20'),
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-004' },
      update: {},
      create: {
        id: 'cust-004', name: 'Sunita Mehta', mobile: '7001234567', email: 'sunita@mehta.in',
        business_name: 'Mehta General Store', type: 'RETAIL',
        address: '23 Brigade Road, Bengaluru, KA 560001', status: 'LEAD',
      },
    }),
    prisma.customer.upsert({
      where: { id: 'cust-005' },
      update: {},
      create: {
        id: 'cust-005', name: 'Vikram Singh', mobile: '9988776655', email: 'vikram@vsingh.com',
        business_name: 'VK Wholesale Hub', gst_number: '08AABCS1429B1ZK', type: 'WHOLESALE',
        address: 'Plot 5, Jaipur Industrial Area, RJ 302001', status: 'INACTIVE',
        notes: 'Account on hold due to outstanding payment.',
      },
    }),
  ]);
  console.log(`✅ Created ${customers.length} customers`);

  // ── 3. Products ──────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({
      where: { sku: 'ELEC-001' },
      update: {},
      create: { name: 'USB-C Fast Charger 65W', sku: 'ELEC-001', category: 'Electronics', unit_price: 1299, current_stock: 145, min_stock_alert: 20, location: 'Shelf A-1' },
    }),
    prisma.product.upsert({
      where: { sku: 'ELEC-002' },
      update: {},
      create: { name: 'Wireless Bluetooth Earbuds', sku: 'ELEC-002', category: 'Electronics', unit_price: 2499, current_stock: 78, min_stock_alert: 15, location: 'Shelf A-2' },
    }),
    prisma.product.upsert({
      where: { sku: 'ELEC-003' },
      update: {},
      create: { name: 'HDMI 4K Cable 2m', sku: 'ELEC-003', category: 'Electronics', unit_price: 499, current_stock: 320, min_stock_alert: 50, location: 'Shelf B-1' },
    }),
    prisma.product.upsert({
      where: { sku: 'ACC-001' },
      update: {},
      create: { name: 'Laptop Sleeve 15.6"', sku: 'ACC-001', category: 'Accessories', unit_price: 799, current_stock: 55, min_stock_alert: 10, location: 'Shelf C-1' },
    }),
    prisma.product.upsert({
      where: { sku: 'ACC-002' },
      update: {},
      create: { name: 'Mechanical Keyboard RGB', sku: 'ACC-002', category: 'Accessories', unit_price: 3999, current_stock: 28, min_stock_alert: 5, location: 'Shelf C-2' },
    }),
    prisma.product.upsert({
      where: { sku: 'MOB-001' },
      update: {},
      create: { name: 'Tempered Glass Screen Protector', sku: 'MOB-001', category: 'Mobile Accessories', unit_price: 199, current_stock: 500, min_stock_alert: 100, location: 'Shelf D-1' },
    }),
    prisma.product.upsert({
      where: { sku: 'MOB-002' },
      update: {},
      create: { name: 'Phone Back Cover (Universal)', sku: 'MOB-002', category: 'Mobile Accessories', unit_price: 299, current_stock: 8, min_stock_alert: 20, location: 'Shelf D-2' },
    }),
    prisma.product.upsert({
      where: { sku: 'NET-001' },
      update: {},
      create: { name: 'Wi-Fi Range Extender', sku: 'NET-001', category: 'Networking', unit_price: 1599, current_stock: 4, min_stock_alert: 10, location: 'Shelf E-1' },
    }),
    prisma.product.upsert({
      where: { sku: 'NET-002' },
      update: {},
      create: { name: 'CAT6 Ethernet Cable 10m', sku: 'NET-002', category: 'Networking', unit_price: 399, current_stock: 200, min_stock_alert: 30, location: 'Shelf E-2' },
    }),
    prisma.product.upsert({
      where: { sku: 'PWR-001' },
      update: {},
      create: { name: 'Power Bank 20000mAh', sku: 'PWR-001', category: 'Power', unit_price: 2999, current_stock: 42, min_stock_alert: 10, location: 'Shelf F-1' },
    }),
  ]);
  console.log(`✅ Created ${products.length} products (2 with low stock: MOB-002, NET-001)`);

  // ── 4. Sample Draft Challans ─────────────────────────────
  const adminUser = users[0];

  const challan1 = await prisma.salesChallan.upsert({
    where: { challan_number: 'CHN-1001' },
    update: {},
    create: {
      challan_number: 'CHN-1001',
      customer_id: 'cust-001',
      customer_snapshot: {
        id: 'cust-001', name: 'Rajesh Sharma', business_name: 'Sharma Traders',
        mobile: '9876543210', email: 'rajesh@sharma.com', gst_number: '27AABCU9603R1ZX',
      },
      total_quantity: 15,
      status: 'DRAFT',
      created_by: adminUser.id,
      items: {
        create: [
          { product_id: products[0].id, product_name_snapshot: products[0].name, unit_price_snapshot: products[0].unit_price, quantity: 10 },
          { product_id: products[1].id, product_name_snapshot: products[1].name, unit_price_snapshot: products[1].unit_price, quantity: 5 },
        ],
      },
    },
  });

  const challan2 = await prisma.salesChallan.upsert({
    where: { challan_number: 'CHN-1002' },
    update: {},
    create: {
      challan_number: 'CHN-1002',
      customer_id: 'cust-002',
      customer_snapshot: {
        id: 'cust-002', name: 'Priya Patel', business_name: 'Patel Enterprises',
        mobile: '9123456789', email: 'priya@patel.biz',
      },
      total_quantity: 8,
      status: 'DRAFT',
      created_by: adminUser.id,
      items: {
        create: [
          { product_id: products[2].id, product_name_snapshot: products[2].name, unit_price_snapshot: products[2].unit_price, quantity: 5 },
          { product_id: products[9].id, product_name_snapshot: products[9].name, unit_price_snapshot: products[9].unit_price, quantity: 3 },
        ],
      },
    },
  });

  console.log(`✅ Created 2 draft challans: ${challan1.challan_number}, ${challan2.challan_number}`);
  console.log('\n🎉 Seed complete!');
  console.log('\nDefault credentials:');
  console.log('  admin@company.com / password123 (ADMIN)');
  console.log('  sales@company.com / password123 (SALES)');
  console.log('  warehouse@company.com / password123 (WAREHOUSE)');
  console.log('  accounts@company.com / password123 (ACCOUNTS)');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
