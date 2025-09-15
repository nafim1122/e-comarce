import { describe, it, expect, beforeEach } from 'vitest';
import { addProduct, updateProduct, deleteProduct, onProductsSnapshot, isForceLocal } from './lib/product';
import { Product } from './types';

process.env.VITE_FORCE_LOCAL = 'true';

describe('sanity product tests (root)', () => {
  beforeEach(() => localStorage.clear());

  it('force local works and add/update/delete cycle', async () => {
    expect(isForceLocal()).toBe(true);
    const id = await addProduct({ name: 'root', price: 1, oldPrice: 1, img: '', description: '', category: 't', inStock: true, basePricePerKg: 0, unit: 'kg' } as Omit<Product, 'id'>);
    expect(id).toBeTruthy();
    await updateProduct(id, { price: 2 });
    await deleteProduct(id);
    // attach snapshot to ensure no errors
    await new Promise<void>((resolve) => onProductsSnapshot(() => resolve()));
  });
});
