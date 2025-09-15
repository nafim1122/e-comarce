import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { addProduct, updateProduct, deleteProduct, fetchProducts, onProductsSnapshot, isForceLocal } from '../product';
import { Product } from '../../types';

// Simulate import.meta.env for Node tests
process.env.VITE_FORCE_LOCAL = 'true';

describe('product.local (force local) CRUD', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('isForceLocal returns true in test env', () => {
    expect(isForceLocal()).toBe(true);
  });

  it('addProduct stores and returns local id', async () => {
    const id = await addProduct({ name: 'Test', price: 10, oldPrice: 10, img: '', description: '', category: 't', inStock: true, basePricePerKg: 0, unit: 'kg' });
    expect(id).toBeTruthy();
  const list = JSON.parse(localStorage.getItem('products') || '[]') as Product[];
    expect(list.length).toBe(1);
    expect(list[0].id).toBe(id);
  });

  it('updateProduct updates existing product', async () => {
    const id = await addProduct({ name: 'ToUpdate', price: 5, oldPrice: 5, img: '', description: '', category: 't', inStock: true, basePricePerKg: 0, unit: 'kg' });
    await updateProduct(id, { name: 'Updated', price: 7 });
  const list = JSON.parse(localStorage.getItem('products') || '[]') as Product[];
  const found = list.find((p: Product) => p.id === id);
    expect(found).toBeDefined();
    expect(found.name).toBe('Updated');
  });

  it('deleteProduct removes product', async () => {
    const id = await addProduct({ name: 'ToDelete', price: 1, oldPrice: 1, img: '', description: '', category: 't', inStock: true, basePricePerKg: 0, unit: 'kg' });
    await deleteProduct(id);
  const list = JSON.parse(localStorage.getItem('products') || '[]') as Product[];
  expect(list.find((p: Product) => p.id === id)).toBeUndefined();
  });

  it('onProductsSnapshot immediately calls back with local list', async () => {
    const id = await addProduct({ name: 'Snap', price: 2, oldPrice: 2, img: '', description: '', category: 't', inStock: true, basePricePerKg: 0, unit: 'kg' });
    await new Promise<void>((resolve, reject) => {
      try {
        onProductsSnapshot((list) => {
          try {
            expect(Array.isArray(list)).toBe(true);
            expect(list.find(p => p.id === id)).toBeTruthy();
            resolve();
          } catch (e) { reject(e); }
        });
      } catch (e) { reject(e); }
    });
  });
});
