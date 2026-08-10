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

## Docker (Local)

```bash
# From root — ensure .env exists in project root with DATABASE_URL, DIRECT_URL, JWT_SECRET
cp backend/.env.example .env

docker-compose up --build
```

- Frontend: http://localhost:80
- Backend: http://localhost:5000

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
