# OpsPortal — Mini ERP + CRM Operations Portal

A production-ready **Mini ERP + CRM** built with Node.js/Express/Prisma (backend) and React/Tailwind/Shadcn (frontend), designed for managing customers, inventory, and sales challans with full role-based access control.

---

## Architecture

```
crm/
├── backend/          # Node.js + Express + TypeScript + Prisma ORM
│   ├── src/
│   │   ├── index.ts               # Express entry
│   │   ├── middleware/
│   │   │   ├── auth.ts            # JWT + RBAC middleware
│   │   │   └── validate.ts        # express-validator wrapper
│   │   └── routes/
│   │       ├── auth.ts            # POST /api/auth/login
│   │       ├── customers.ts       # CRUD + Notes + Search
│   │       ├── products.ts        # CRUD + Stock movements
│   │       └── challans.ts        # CRUD + Atomic confirm transaction
│   └── prisma/
│       ├── schema.prisma          # 6 models
│       └── seed.ts               # Seed data
├── frontend/         # React + TypeScript + Tailwind + Radix UI
│   └── src/
│       ├── pages/                 # Login, Dashboard, Customers, Inventory, Challans, Reports
│       ├── components/            # Layout, Sidebar, StatusPill, RoleSwitcher
│       ├── context/               # AuthContext
│       └── lib/                   # api.ts, utils.ts
├── docs/
│   └── postman_collection.json
├── docker-compose.yml
├── render.yaml
└── vercel.json
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Clone & Setup

```bash
git clone <your-repo-url>
cd crm
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and fill in:
- `DATABASE_URL` — your Supabase **Transaction Pooler** connection string (port 6543)
- `DIRECT_URL` — your Supabase **Direct** connection string (port 5432)
- `JWT_SECRET` — any random 32+ character string

```bash
# Push schema to database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed the database
npx ts-node prisma/seed.ts

# Start dev server
npm run dev
```

Backend runs on **http://localhost:5000**

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
VITE_API_URL=http://localhost:5000/api
```

```bash
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase Transaction Pooler URI (port 6543) |
| `DIRECT_URL` | Supabase Direct URI (port 5432) — for migrations |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) |
| `JWT_EXPIRES_IN` | Token expiry (default: `7d`) |
| `PORT` | Server port (default: `5000`) |
| `NODE_ENV` | `development` or `production` |
| `FRONTEND_URL` | Frontend URL for CORS (e.g. `http://localhost:5173`) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |

---

## Default Login Credentials

| Role | Email | Password |
|---|---|---|
| **ADMIN** | admin@company.com | password123 |
| **SALES** | sales@company.com | password123 |
| **WAREHOUSE** | warehouse@company.com | password123 |
| **ACCOUNTS** | accounts@company.com | password123 |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login and get JWT |
| GET | `/api/auth/me` | Bearer | Get current user |
| GET | `/api/customers` | Any | List + search + filter |
| POST | `/api/customers` | ADMIN/SALES | Create customer |
| PUT | `/api/customers/:id` | ADMIN/SALES | Update customer |
| DELETE | `/api/customers/:id` | ADMIN | Delete customer |
| POST | `/api/customers/:id/notes` | ADMIN/SALES | Add/update notes |
| GET | `/api/products` | Any | List products (w/ `is_low_stock` flag) |
| POST | `/api/products` | ADMIN/WAREHOUSE | Create product |
| PUT | `/api/products/:id` | ADMIN/WAREHOUSE | Update product |
| DELETE | `/api/products/:id` | ADMIN | Delete product |
| POST | `/api/products/stock-movement` | ADMIN/WAREHOUSE | Manual stock IN/OUT |
| GET | `/api/products/movements/history` | Any | Stock movement history |
| GET | `/api/challans` | Any | List challans |
| POST | `/api/challans` | ADMIN/SALES | Create Draft or Confirmed |
| GET | `/api/challans/:id` | Any | Get challan details |
| PUT | `/api/challans/:id/status` | ADMIN/SALES | Confirm or Cancel challan |

### Atomic Transaction Logic
When a challan is confirmed (`PUT /api/challans/:id/status` with `status: CONFIRMED`):
1. Prisma `$transaction` begins
2. For each line item: checks `current_stock >= quantity`. If **any** fail → returns **HTTP 400** with `"Insufficient stock for product: [Name]"`
3. Deducts `current_stock` on each Product
4. Creates `StockMovement` OUT records auto-linking to challan
5. Updates Challan status to `CONFIRMED`

---

## Docker (Backend only)

The `docker-compose.yml` containerises **only the backend API**. The frontend is deployed separately to a static host (Vercel / Netlify).

```bash
# Fill in your backend environment variables first
cp backend/.env.example backend/.env
# Edit backend/.env: set DATABASE_URL, DIRECT_URL, JWT_SECRET

# Build and start the backend container
docker-compose up --build
```

- Backend API: **http://localhost:5000**
- The `Dockerfile` in `backend/` is a multi-stage build (builder → production).
- `wget` is installed in the production image to satisfy the Docker health-check.

---

## Deployment

### Backend → Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your repo, set root dir to `backend`
4. Build command: `npm install && npx prisma generate && npx prisma db push && npm run build`
5. Start command: `node dist/index.js`
6. Add environment variables from `backend/.env.example`

Or use the included `render.yaml` with **Render Blueprints**.

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Set **Root Directory** to `frontend`
4. Add env var: `VITE_API_URL=https://your-render-backend.onrender.com/api`
5. Deploy

Or update `vercel.json` with your Render backend URL.

---

## RBAC Roles

| Role | Access |
|---|---|
| **ADMIN** | Full access to all modules |
| **SALES** | Customers (CRUD), Challans (Create/Confirm), Reports (read) |
| **WAREHOUSE** | Products (CRUD), Stock Movements, Reports (read) |
| **ACCOUNTS** | Read-only access to all modules |

---

## Postman Collection

Import `docs/postman_collection.json` into Postman. The Login — Admin request auto-saves the JWT token to a collection variable for subsequent requests.

---

## Assumptions

- **Database**: Supabase (free tier) is used for PostgreSQL. The schema uses both a Transaction Pooler URL (port 6543) and a Direct URL (port 5432) to support Prisma migrations alongside a connection pooler.
- **No invoice model**: The spec mentions "invoices" in the business context but does not require a separate Invoice module in core features. Confirmed challans serve as the invoice-equivalent document.
- **PDF Export**: The Reports page exposes a **Print / Save as PDF** button that invokes `window.print()` with print-optimised CSS. This leverages the browser's native PDF export rather than a server-side PDF library.
- **Customer detail page**: A dedicated `/customers/:id` route was not explicitly required; the customer list shows all key fields inline, and follow-up notes are editable from the list view. The backend `GET /api/customers/:id` endpoint (including last 5 challans) is ready if a detail page is added.
- **Frontend is not containerised**: Docker is provided for the backend only. The frontend is a static React/Vite build deployed to Vercel (no server required), making a frontend container unnecessary.
- **Role permissions for Reports**: The Reports page is read-only and accessible to all authenticated roles. Revenue and challan data is filtered by what the API returns for the logged-in user's role.
- **Stock manipulation via API only**: Direct `current_stock` updates via `PUT /api/products/:id` are blocked; all stock changes must go through `POST /api/products/stock-movement` or the challan confirmation flow, ensuring the movement log is always populated.
