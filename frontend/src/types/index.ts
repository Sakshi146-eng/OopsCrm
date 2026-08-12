// ── Types shared between frontend components ──────────────────────────────

export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
export type MovementType = 'IN' | 'OUT';
export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  business_name?: string;
  gst_number?: string;
  type: CustomerType;
  address?: string;
  status: CustomerStatus;
  follow_up_date?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  salesChallans?: SalesChallan[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit_price: number | string;
  current_stock: number;
  min_stock_alert: number;
  location?: string;
  is_low_stock?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity_changed: number;
  movement_type: MovementType;
  reason?: string;
  created_by: string;
  timestamp: string;
  product?: { name: string; sku: string };
  user?: { name: string };
}

export interface ChallanItem {
  id: string;
  challan_id: string;
  product_id: string;
  product_name_snapshot: string;
  unit_price_snapshot: number | string;
  quantity: number;
  product?: { name: string; sku: string; current_stock: number };
}

export interface SalesChallan {
  id: string;
  challan_number: string;
  customer_id: string;
  customer_snapshot: Record<string, unknown>;
  total_quantity: number;
  status: ChallanStatus;
  created_by: string;
  createdAt: string;
  updatedAt: string;
  customer?: { name: string; business_name?: string };
  created_by_user?: { name: string };
  items?: ChallanItem[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: Pagination;
}

export interface AuthToken {
  token: string;
  user: User;
}
