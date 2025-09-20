import type { Product } from '../types';

const KEY = 'products';

export function readLocalProducts(): Product[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as Product[] : [];
  } catch (e) {
    console.warn('[local-products] read failed', e);
    return [];
  }
}

export function writeLocalProducts(list: Product[]) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(list));
    try { window.dispatchEvent(new Event('products-local-update')); } catch (e) { /* ignore */ }
  } catch (e) {
    console.warn('[local-products] write failed', e);
  }
}

export function upsertLocalProduct(p: Product) {
  try {
    const list = readLocalProducts();
    const idx = list.findIndex(x => String(x.id) === String(p.id));
    if (idx >= 0) {
      list[idx] = p;
    } else {
      list.unshift(p);
    }
    writeLocalProducts(list);
  } catch (e) { console.warn('[local-products] upsert failed', e); }
}

export function removeLocalProduct(id: string | number) {
  try {
    const list = readLocalProducts();
    const next = list.filter(x => String(x.id) !== String(id));
    writeLocalProducts(next);
  } catch (e) { console.warn('[local-products] remove failed', e); }
}

export default { readLocalProducts, writeLocalProducts, upsertLocalProduct, removeLocalProduct };
