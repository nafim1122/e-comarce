import { describe, it, expect, beforeEach } from 'vitest';
import { addToCartAPI } from '../cart';

describe('cart persistence and addToCartAPI', () => {
  beforeEach(() => {
    // reset localStorage for each test
    localStorage.clear();
  });

  it('mock addToCartAPI returns cartItem with productId and totalPriceAtTime and localStorage can store cart', async () => {
    // arrange: set a product in localStorage that the mock will read
    const prod = { id: 'local-e2e-123', name: 'Test Tea', price: 200, basePricePerKg: 200 };
    localStorage.setItem('products', JSON.stringify([prod]));

    // act: call the mock addToCartAPI
    const res = await addToCartAPI({ productId: 'local-e2e-123', quantity: 0.5, unit: 'kg', calculatedTotalPrice: 100 });

    // assert response shape
    expect(res).toBeTruthy();
    expect(res.cartItem).toBeTruthy();
    expect(String(res.cartItem.productId)).toBe('local-e2e-123');
    expect(typeof res.cartItem.totalPriceAtTime).toBe('number');
    expect(res.cartItem.totalPriceAtTime).toBeCloseTo(100, 2);

    // emulate persistence (what Index does): write cart array to localStorage
    const cartArray = [{ productId: res.cartItem.productId, quantity: res.cartItem.quantity, unit: res.cartItem.unit, unitPriceAtTime: res.cartItem.unitPriceAtTime, totalPriceAtTime: res.cartItem.totalPriceAtTime }];
    localStorage.setItem('cart', JSON.stringify(cartArray));

    const stored = localStorage.getItem('cart');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].productId).toBe('local-e2e-123');
    expect(typeof parsed[0].totalPriceAtTime).toBe('number');
  });
});
