import type { ApiResponse, AuthToken, Customer, Product, SalesChallan, StockMovement } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('crm_token');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

// ── Auth ───────────────────────────────────────────────────
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<AuthToken>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<AuthToken['user']>('/auth/me'),
  },

  // ── Customers ────────────────────────────────────────────
  customers: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<Customer[]>(`/customers${qs}`);
    },
    get: (id: string) => request<Customer>(`/customers/${id}`),
    create: (data: Partial<Customer>) =>
      request<Customer>('/customers', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Customer>) =>
      request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/customers/${id}`, { method: 'DELETE' }),
    addNote: (id: string, notes: string) =>
      request<Customer>(`/customers/${id}/notes`, { method: 'POST', body: JSON.stringify({ notes }) }),
  },

  // ── Products ─────────────────────────────────────────────
  products: {
    list: () => request<Product[]>('/products'),
    get: (id: string) => request<Product>(`/products/${id}`),
    create: (data: Partial<Product>) =>
      request<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Product>) =>
      request<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/products/${id}`, { method: 'DELETE' }),
    stockMovement: (data: { product_id: string; quantity_changed: number; movement_type: 'IN' | 'OUT'; reason?: string }) =>
      request<{ movement: StockMovement; product: Product }>('/products/stock-movement', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    movements: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<StockMovement[]>(`/products/movements/history${qs}`);
    },
  },

  // ── Challans ─────────────────────────────────────────────
  challans: {
    list: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return request<SalesChallan[]>(`/challans${qs}`);
    },
    get: (id: string) => request<SalesChallan>(`/challans/${id}`),
    create: (data: {
      customer_id: string;
      items: { product_id: string; quantity: number }[];
      status?: 'DRAFT' | 'CONFIRMED';
    }) => request<SalesChallan>('/challans', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id: string, status: 'CONFIRMED' | 'CANCELLED') =>
      request<SalesChallan>(`/challans/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
  },
};
