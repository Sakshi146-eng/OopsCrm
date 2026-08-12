# ⚡ OpsPortal – Mini ERP + CRM Operations Portal

## 📦 Submission Details

| Item | Value |
|---|---|
| **GitHub Repository** | https://github.com/Sakshi146-eng/crm |
| **Live Frontend URL** | https://crm-ou6j.vercel.app/login |
| **Live Backend API URL** | https://crm-h0pj.onrender.com |
| **Postman Collection** | `docs/postman_collection.json` |

### 🔐 Test Login Credentials

| Role | Email | Password |
|---|---|---|
| **ADMIN** | admin@company.com | password123 |
| **SALES** | sales@company.com | password123 |
| **WAREHOUSE** | warehouse@company.com | password123 |
| **ACCOUNTS** | accounts@company.com | password123 |

---

## 🌟 Overview

**OpsPortal** is a scalable, role-based ERP + CRM operations platform designed for wholesale and distribution companies.

It addresses the critical gap in internal business visibility by introducing a structured, real-time system that digitises the full business flow — from customer relationship management and product inventory to sales challan generation and stock movement tracking — all under a single, secure, role-aware interface.

Designed for the complete sales-to-delivery lifecycle, OpsPortal helps internal teams (Sales, Warehouse, Accounts, Admin) collaborate efficiently with clearly defined responsibilities, real-time inventory alerts, and an atomic transactional challan engine that prevents stock inconsistencies.

---

## 🧩 Background

Wholesale and distribution businesses face persistent operational challenges when managing customers, stock, and order fulfilment through disconnected tools:

- Customer data and follow-up notes are scattered across spreadsheets and messaging apps — with no unified CRM view.
- There is no structured digital mechanism to track stock movements (IN/OUT) with reason logs and timestamps.
- Sales challans are manually prepared, making it impossible to prevent overselling or track confirmed vs. draft orders in real time.
- Managers lack actionable dashboards or low-stock alerts to make timely restocking decisions.

This leads to:

- Stock inconsistencies and overselling due to lack of atomic order confirmation
- Customer follow-up delays and missed leads with no organised CRM workflow
- No audit trail for inventory changes, making financial reconciliation difficult
- Inability to separate access and responsibilities across teams securely

---

## 🎯 Vision

To build a secure, data-driven operations portal that:

- Centralises customer CRM, product inventory, and sales challan workflows under a single system
- Enforces role-based access so each team (Sales, Warehouse, Accounts) sees only what they need
- Guarantees stock consistency through atomic transactional challan confirmation
- Delivers real-time low-stock alerts, movement history, and revenue reports for leadership decisions

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                           │
│   React 18 + TypeScript + Vite                                  │
│   • React Router v7 (SPA routing)                               │
│   • AuthContext (JWT stored in localStorage)                    │
│   • Role-based UI rendering                                     │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS REST (JSON)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BACKEND API SERVER                          │
│   Node.js 20 + TypeScript + Express.js 5                        │
│   • JWT middleware (verify token on every protected route)      │
│   • RBAC authorize() middleware per route                       │
│   • express-validator (input validation + sanitisation)         │
│   • Routes: /auth  /customers  /products  /challans             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Prisma ORM (SQL queries)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
│   PostgreSQL 15 (Supabase free tier)                            │
│   • Transaction Pooler (port 6543) — runtime queries           │
│   • Direct connection (port 5432) — Prisma migrations          │
│   • 7 models: User, Customer, Product, StockMovement,           │
│     Challan, ChallanItem, FollowUpNote                          │
└─────────────────────────────────────────────────────────────────┘

Hosting:
  Frontend  → Vercel (global CDN, auto-deploy from GitHub)
  Backend   → Render Web Service (Docker container or Node build)
  Database  → Supabase (managed PostgreSQL, free tier)
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Prisma `$transaction` for challan confirm | Guarantees all-or-nothing stock deduction — no partial writes |
| Customer + product snapshots in ChallanItem | Challan history stays accurate even after customer/product edits |
| Stock changes only via `stock-movement` route | Maintains a complete, tamper-proof audit log |
| JWT in `Authorization: Bearer` header | Stateless auth that works across Vercel + Render without session sharing |
| Separate `DATABASE_URL` and `DIRECT_URL` | Allows Prisma migrations to bypass the connection pooler |

---

## 🚀 Objectives

### 1. Customer Relationship Management
Digitise the full customer lifecycle — from lead capture to active account — with:
- Full customer profile: contact, GST, business name, address, type, and status
- CRM follow-up system with date tracking and persistent notes
- Search, filter, and dedicated customer detail pages showing challan history

### 2. Product & Inventory Management
Maintain real-time, auditable stock levels with:
- SKU-based product catalogue with category, price, and warehouse location
- Manual stock IN/OUT movements with reason logging and created-by tracking
- Automatic `is_low_stock` flag when `current_stock < min_stock_alert`
- Bell notification in the header with live low-stock product list

### 3. Sales Challan Engine
Replace manual order documents with a structured, atomic challan system:
- Multi-product line items with quantity, unit price snapshot, and customer snapshot
- Draft → Confirmed → Cancelled lifecycle with role-restricted status transitions
- Atomic `$transaction` on confirmation: validates stock, deducts inventory, creates StockMovement records — all or nothing

### 4. Role-Based Access Control (RBAC)
Secure every route with JWT authentication and four distinct roles:
- **ADMIN** — full system access
- **SALES** — CRM and challan operations
- **WAREHOUSE** — inventory and stock movements
- **ACCOUNTS** — read-only access to all modules

### 5. Reporting & Analytics
Provide actionable business intelligence through a dedicated Reports page:
- Revenue trend (Monthly bar chart)
- Top customers by order volume
- Low-stock product table
- Challan status breakdown (confirmed vs. draft vs. cancelled)
- Print-to-PDF export for HR and leadership review

---

## ⚙️ How the Business Flow Works in OpsPortal

### 🧱 1. Customer Onboarding
Sales team adds a customer profile (name, mobile, email, GST, business type, status). Status progresses from `LEAD → ACTIVE` as the relationship matures. Follow-up dates and notes are updated inline throughout the lifecycle.

### 📦 2. Product & Inventory Setup
Warehouse team creates products with SKU, category, unit price, and minimum stock alert. Initial stock is set on creation; subsequent changes go through the stock movement log (IN/OUT with reason), ensuring every change is auditable.

### 📋 3. Challan Creation
Sales team selects a customer, adds multiple product lines with quantity, and saves as **Draft** (no stock impact) or directly **Confirms** (triggers atomic stock deduction). The challan number is auto-generated (`CHN-1001`, `CHN-1002`, ...).

### ⚡ 4. Challan Confirmation (Atomic Transaction)
When a draft challan is confirmed:
1. System checks every line item: `current_stock >= quantity`
2. If **any** product has insufficient stock → HTTP 400 returned, nothing is changed
3. All stock levels are deducted atomically
4. `StockMovement` OUT records are auto-created, linked to the challan
5. Challan status updates to `CONFIRMED`

### 📊 5. Reports & Monitoring
Admin and management access revenue analytics, top customers, low-stock alerts, and the full movement history — all computed from live database state, exportable as PDF via browser print.

---

## 🧮 Challan Item Attributes

| Attribute | Description |
|---|---|
| Challan Number | Auto-generated unique identifier (e.g., `CHN-1001`) |
| Customer | Linked by ID; customer name/business snapshot stored at creation |
| Products | One or more line items with product name, SKU, unit price snapshot |
| Quantity | Per-item quantity; drives stock deduction on confirmation |
| Status | `DRAFT` / `CONFIRMED` / `CANCELLED` |
| Total Quantity | Sum of all line item quantities |
| Created By | User who created the challan (with role context) |

---

## 👥 Role-Wise Access and Responsibilities

| Role | Module Access | Key Actions |
|---|---|---|
| **ADMIN** | All modules | Full CRUD everywhere; delete products/customers; unlock/cancel challans |
| **SALES** | Customers, Challans, Reports (read) | Add/edit customers, create/confirm challans, add follow-up notes |
| **WAREHOUSE** | Inventory, Stock Movements, Reports (read) | Add/edit products, record stock IN/OUT movements |
| **ACCOUNTS** | All modules (read-only) | View customers, products, challans, reports — no write access |

---

## 🏗️ Stock Movement Types

| Movement Type | Description | Triggered By |
|---|---|---|
| `IN` | Stock added to inventory | Manual entry by Warehouse/Admin |
| `OUT` | Stock deducted from inventory | Manual entry OR automatic on challan confirmation |

Every movement records: product, quantity changed, type, reason, created-by user, and timestamp.

---

## 🖥️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Lucide Icons, Sonner (toasts), React Router v7 |
| **Backend** | Node.js 20, TypeScript, Express.js 5, express-validator |
| **ORM** | Prisma 6 with PostgreSQL adapter |
| **Database** | PostgreSQL 15 (hosted on Supabase — free tier) |
| **Authentication** | JWT (jsonwebtoken), bcryptjs |
| **Deployment** | Render.com (backend), Vercel (frontend) |
| **Containerisation** | Docker multi-stage build (backend only) |

---

## 🏗️ Project Structure

```
crm/
├── backend/                    # Node.js + Express + TypeScript + Prisma ORM
│   ├── src/
│   │   ├── index.ts            # Express entry point + middleware setup
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT verification + RBAC authorize()
│   │   │   └── validate.ts     # express-validator wrapper
│   │   └── routes/
│   │       ├── auth.ts         # POST /login, GET /me
│   │       ├── customers.ts    # CRUD + notes + search + challan history
│   │       ├── products.ts     # CRUD + stock movements + low-stock flag
│   │       └── challans.ts     # CRUD + atomic $transaction confirm
│   ├── prisma/
│   │   ├── schema.prisma       # 7 models (User, Customer, Product, etc.)
│   │   └── seed.ts             # 4 demo users + sample data
│   ├── .env.example            # Template for all required environment variables
│   ├── Dockerfile              # Multi-stage build (builder → production)
│   ├── docker-compose.yml      # Backend-only container orchestration
│   └── render.yaml             # Render Blueprint for one-click deploy
│
├── frontend/                   # React + TypeScript + Tailwind + Radix UI
│   └── src/
│       ├── pages/              # Login, Dashboard, Customers, CustomerDetail,
│       │                       # Inventory, Challans, Reports
│       ├── components/         # Layout, Sidebar, StatusPill, RoleSwitcher, LoginAlertDialog
│       ├── context/            # AuthContext, ThemeContext (light/dark mode)
│       └── lib/                # api.ts (typed fetch wrapper), utils.ts
│
├── docs/
│   └── postman_collection.json # Full API collection with auto-token saving
└── README.md
```

---

## 💻 Local Setup

### Prerequisites
- Node.js 18+
- npm 9+
- A [Supabase](https://supabase.com) account (free tier) **or** any PostgreSQL 15 instance

### 1. Clone & Enter

```bash
git clone https://github.com/Sakshi146-eng/crm
cd crm
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` with your values (see the **Environment Variables** section below):

```env
DATABASE_URL="postgresql://USER:PASS@HOST:6543/DB?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://USER:PASS@HOST:5432/DB?sslmode=require"
JWT_SECRET="your-random-32-char-secret-here"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

```bash
npx prisma db push          # Push schema to database (creates all tables)
npx prisma generate         # Generate Prisma client
npx ts-node prisma/seed.ts  # Seed 4 demo users + sample data
npm run dev                 # Start dev server on http://localhost:5000
```

Backend: **http://localhost:5000**

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev   # Start Vite dev server on http://localhost:5173
```

Frontend: **http://localhost:5173**

---

## 🌍 Environment Variables

### How Environment Variables Are Managed

- All environment variables are defined in `backend/.env.example` (committed to the repository as a safe template with no real secrets).
- Developers copy `.env.example` → `.env` locally and fill in their own values. The `.env` file is listed in `.gitignore` and is **never committed**.
- On Render (backend) and Vercel (frontend), environment variables are injected via their respective dashboards and are encrypted at rest.

### Backend (`backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | Supabase Transaction Pooler URI (port 6543) | ✅ |
| `DIRECT_URL` | Supabase Direct URI (port 5432) — for Prisma migrations | ✅ |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | ✅ |
| `JWT_EXPIRES_IN` | Token expiry duration (default: `7d`) | Optional |
| `PORT` | Server port (default: `5000`) | Optional |
| `NODE_ENV` | `development` or `production` | Optional |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `https://your-app.vercel.app`) | ✅ in prod |

### Frontend (`frontend/.env.local`)

| Variable | Description | Required |
|---|---|---|
| `VITE_API_URL` | Backend API base URL (e.g. `https://your-backend.onrender.com/api`) | ✅ |

---

## 📡 API Reference

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login — returns JWT |
| GET | `/api/auth/me` | All | Current authenticated user |
| GET | `/api/customers` | All | List with search, status, type, pagination |
| GET | `/api/customers/:id` | All | Customer detail with last 10 challans + items |
| POST | `/api/customers` | ADMIN / SALES | Create customer |
| PUT | `/api/customers/:id` | ADMIN / SALES | Update customer |
| DELETE | `/api/customers/:id` | ADMIN | Delete customer |
| POST | `/api/customers/:id/notes` | ADMIN / SALES | Add/update notes |
| GET | `/api/products` | All | List with `is_low_stock` flag |
| GET | `/api/products/:id` | All | Single product |
| POST | `/api/products` | ADMIN / WAREHOUSE | Create product |
| PUT | `/api/products/:id` | ADMIN / WAREHOUSE | Update product metadata (not stock) |
| DELETE | `/api/products/:id` | ADMIN | Delete product |
| POST | `/api/products/stock-movement` | ADMIN / WAREHOUSE | Manual stock IN / OUT |
| GET | `/api/products/movements/history` | All | Full stock movement log |
| GET | `/api/challans` | All | List with status filter, pagination |
| GET | `/api/challans/:id` | All | Challan with items + customer snapshot |
| POST | `/api/challans` | ADMIN / SALES | Create DRAFT or CONFIRMED challan |
| PUT | `/api/challans/:id/status` | ADMIN / SALES | Confirm or Cancel a challan |
| GET | `/api/health` | Public | Health-check probe |

### Atomic Confirmation Logic
When `PUT /api/challans/:id/status` with `{ "status": "CONFIRMED" }`:
1. Prisma `$transaction` begins
2. Each line item is checked: `current_stock >= quantity` — if **any** fail → **HTTP 400** `"Insufficient stock for product: [Name] (available: N)"`
3. All `current_stock` values are deducted atomically
4. `StockMovement` OUT records are auto-created for each item, linked to the challan
5. Challan status is updated to `CONFIRMED`

If any step fails, the entire transaction rolls back — stock is never partially deducted.

---

## 🐳 Docker (Backend Only)

The `backend/docker-compose.yml` containerises **only the backend API**. The frontend is a static build deployed to Vercel — no container needed.

```bash
# Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env: DATABASE_URL, DIRECT_URL, JWT_SECRET, FRONTEND_URL

# Build and start the backend container
cd backend
docker-compose up --build
```

- Backend API available at: **http://localhost:5000**
- `backend/Dockerfile` uses a multi-stage build: `builder` compiles TypeScript → `production` runs the lightweight Node.js image
- `wget` is installed in the production image to support the Docker healthcheck probe

---

## 🚀 Deployment

### Server Setup

The project uses a **fully managed, serverless hosting stack** — no manual server provisioning is required:

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Auto-deploys from `main` branch on every push |
| Backend | Render Web Service | Runs the Node.js build or Docker container |
| Database | Supabase | Managed PostgreSQL with connection pooler |

No SSH access, firewall rules, or OS-level configuration is needed. Each platform handles TLS, scaling, and uptime.

### Backend → Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect repository → set root directory to `backend`
4. Build command:
   ```
   npm install && npx prisma generate && npx prisma db push && npm run build
   ```
5. Start command: `node dist/index.js`
6. Add all environment variables from `backend/.env.example` via the Render dashboard

> Or use the included `backend/render.yaml` with **Render Blueprints** for one-click setup.

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Framework preset: **Vite** (auto-detected)
5. Build command: `npm run build`
6. Output directory: `dist`
7. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`
8. Deploy

The `frontend/vercel.json` handles SPA routing (React Router deep links don't 404 on refresh).

---

## ⚠️ Potential Challenges and Solutions

| Challenge | Solution |
|---|---|
| Render free tier cold start (~30s) | Ping `/api/health` every 10 min via [cron-job.org](https://cron-job.org) to keep warm |
| Stock overselling under concurrent requests | Prisma `$transaction` with pre-check + atomic deduction prevents race conditions |
| Customer data snapshot drift in challans | `customer_snapshot` JSON is captured at challan creation time — immune to later customer edits |
| CORS errors after deployment | Set `FRONTEND_URL` env var on Render to your exact Vercel deployment URL |

---

## 🔄 Workflow Reference

### Customer Lifecycle
```
LEAD → (Sales contacts) → ACTIVE → (Ongoing orders) → INACTIVE
         ↓
     Follow-up date set + notes added
```

### Challan Lifecycle
```
DRAFT → (Sales confirms) → CONFIRMED  →  Stock deducted, Movement log created
  ↓                              ↓
Saved without stock         CANCELLED  →  No stock reversal (manual IN required)
impact
```

### Stock Movement Flow
```
Manual IN  ─────────────────────────────→ current_stock increases
Manual OUT ─────────────────────────────→ current_stock decreases
Challan CONFIRMED ──→ auto OUT records → current_stock decreases (atomic)
```

---

## 📮 Postman Collection

Import `docs/postman_collection.json` into Postman. The **Login — Admin** request auto-saves the returned JWT to a `{{token}}` collection variable used by all subsequent requests.

---

## 📋 Assumptions

- **Database**: Supabase free tier is used for PostgreSQL. The schema uses both a Transaction Pooler URL (port 6543) and a Direct URL (port 5432) to support Prisma migrations alongside a connection pooler.
- **No separate Invoice model**: The spec mentions "invoices" in business context but does not require a separate Invoice module in core features. Confirmed challans serve as the invoice-equivalent document with product snapshots and customer snapshots.
- **PDF Export**: The Reports page provides a **Print / Save as PDF** button via `window.print()` with print-optimised CSS — using the browser's native PDF export rather than a server-side library.
- **Customer Detail Page**: A dedicated `/customers/:id` route is implemented showing full profile, CRM fields, challan history with line-item breakdown, and inline edit/note modals.
- **Frontend is not containerised**: Docker is provided for the backend only. The React/Vite build is a set of static files — Vercel's CDN serves them with no container or server needed.
- **Stock write protection**: Direct `current_stock` updates via `PUT /api/products/:id` are blocked. All stock changes must go through `POST /api/products/stock-movement` or the challan confirmation flow — ensuring the audit log is always complete.
- **Role dashboard views**: The Dashboard renders four distinct views depending on the logged-in user's role, showing only relevant metrics and actions.

---

## ⚠️ Known Limitations & Incomplete Parts

| Item | Status | Notes |
|---|---|---|
| Invoice module | Not implemented | The assignment scope lists Challan as the core module; confirmed challans act as invoices with product/customer snapshots |
| PDF invoice export (server-side) | Not implemented | PDF export via `window.print()` is available on the Reports page; no dedicated per-challan PDF endpoint |
| Stock cancellation reversal | Manual only | Cancelling a confirmed challan does **not** auto-reverse stock deductions — a manual stock-IN movement is required |
| AWS S3 product images | Not implemented | Image upload is a bonus item; products use text-based SKU identification |
| GitHub Actions CI/CD | Not implemented | Deployment is manual push-to-Render/Vercel; Actions pipeline is a bonus item |
| Invoice numbering | Not implemented | Challans use auto-incremented CHN-XXXX numbers; a separate INV- series was not added |
| Accounts role reports | Read-only | Accounts users can view all data but cannot export or filter reports — this is by design |
| Render free-tier cold starts | Known | First request after inactivity may take ~30 seconds; use a keep-alive cron as documented above |

---

## 🏆 Expected Outcomes

- A unified, secure portal replacing disconnected spreadsheets and manual processes across Sales, Warehouse, and Accounts teams
- Real-time stock accuracy guaranteed by atomic transactional challan confirmation — eliminating overselling
- A 360° customer view combining CRM profile, follow-up history, and complete order/challan history in one place
- Full audit trail of every stock movement — enabling financial reconciliation and accountability
- Role-enforced workflows where each team member sees and does exactly what their role permits — nothing more
- A replicable, cloud-native architecture deployable for any wholesale or distribution organisation at zero infrastructure cost

> *"OpsPortal brings structure, speed, and accountability to wholesale operations — one challan at a time."*
