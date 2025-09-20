// Lightweight localStorage-backed data layer for products, orders, and admin settings
// Designed so it can later be swapped for a real database with the same API surface.

import { Product, Order } from '../types';

const PRODUCTS_KEY = 'products';
const ORDERS_KEY = 'orders';
const ADMIN_KEY = 'adminSettings';

function safeParse<T>(v: string | null): T | null {
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
}

export function getProducts(): Product[] {
  return safeParse<Product[]>(localStorage.getItem(PRODUCTS_KEY)) || [];
}

export function saveProducts(items: Product[]) {
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('products-local-update'));
}

export function addProductLocal(product: Product) {
  const items = getProducts();
  const added = { ...product };
  items.unshift(added);
  saveProducts(items);
  return added;
}

export function updateProductLocal(product: Product) {
  const items = getProducts();
  const idx = items.findIndex(p => String(p.id) === String(product.id));
  if (idx >= 0) items[idx] = product;
  else items.unshift(product);
  saveProducts(items);
  return product;
}

export function deleteProductLocal(id: string | number) {
  const items = getProducts().filter(p => String(p.id) !== String(id));
  saveProducts(items);
}

// Orders
export function getOrders(): Order[] {
  return safeParse<Order[]>(localStorage.getItem(ORDERS_KEY)) || [];
}

export function saveOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  window.dispatchEvent(new Event('orders-local-update'));
}

export function addOrderLocal(order: Order) {
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
  return order;
}

export function updateOrderStatusLocal(id: string, status: string) {
  const orders = getOrders().map(o => o.id === id ? { ...o, status } : o);
  saveOrders(orders);
}

export function deleteOrderLocal(id: string) {
  const orders = getOrders().filter(o => o.id !== id);
  saveOrders(orders);
}

// Admin settings & roles
export type Role = 'super' | 'manager' | 'none';
export type AdminSettings = { roles: Record<string, Role>, theme?: 'light' | 'dark' };

export function getAdminSettings(): AdminSettings {
  return safeParse<AdminSettings>(localStorage.getItem(ADMIN_KEY)) || { roles: {}, theme: 'light' };
}

export function saveAdminSettings(settings: AdminSettings) {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(settings));
  window.dispatchEvent(new Event('admin-settings-update'));
}

export function getRoleForEmail(email?: string): Role {
  if (!email) return 'none';
  const s = getAdminSettings();
  return s.roles[email] || 'none';
}

export function setRoleForEmail(email: string, role: Role) {
  const s = getAdminSettings();
  s.roles[email] = role;
  saveAdminSettings(s);
}

export function getTheme(): 'light' | 'dark' {
  return getAdminSettings().theme || 'light';
}

export function setTheme(theme: 'light' | 'dark') {
  const s = getAdminSettings();
  s.theme = theme;
  saveAdminSettings(s);
}

// Simple analytics helpers computed from orders list
export function computeAnalytics() {
  const orders = getOrders();
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const byDay: Record<string, number> = {};
  orders.forEach(o => {
    const d = new Date(o.date).toISOString().slice(0,10);
    byDay[d] = (byDay[d] || 0) + (o.total || 0);
  });
  // top products
  const productCounts: Record<string, number> = {};
  orders.forEach(o => {
    (o.items || []).forEach(i => {
      productCounts[i.name] = (productCounts[i.name] || 0) + (i.quantity || 0);
    });
  });
  const topProducts = Object.entries(productCounts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name,qty]) => ({ name, qty }));

  return { totalRevenue, byDay, topProducts, totalOrders: orders.length };
}

export default {
  getProducts,
  saveProducts,
  addProductLocal,
  updateProductLocal,
  deleteProductLocal,
  getOrders,
  saveOrders,
  addOrderLocal,
  updateOrderStatusLocal,
  deleteOrderLocal,
  getAdminSettings,
  saveAdminSettings,
  getRoleForEmail,
  setRoleForEmail,
  getTheme,
  setTheme,
  computeAnalytics,
};
