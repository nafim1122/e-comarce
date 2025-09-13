import { computeUnitPrice, computeTotal } from '../src/lib/cartUtils';

describe('cart utils', () => {
  test('computeUnitPrice returns base price', () => {
    const prod = { basePricePerKg: 1200, price: 1200, unit: 'kg' as const };
    expect(computeUnitPrice(prod, 'kg')).toBe(1200);
  });

  test('computeTotal throws for invalid quantity', () => {
    expect(() => computeTotal(100, 0)).toThrow('Invalid quantity');
    expect(() => computeTotal(100, -1)).toThrow('Invalid quantity');
    expect(() => computeTotal(100, NaN)).toThrow('Invalid quantity');
  });

  test('computeTotal computes and rounds to 2 decimals', () => {
    expect(computeTotal(123.456, 2)).toBe(246.91);
    expect(computeTotal(100, 1)).toBe(100);
  });
});
