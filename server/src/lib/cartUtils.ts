export function computeUnitPrice(prod: { basePricePerKg?: number; price?: number; unit?: 'kg'|'piece' }, unit: 'kg'|'piece') {
  const base = prod.basePricePerKg ?? prod.price ?? 0;
  if (unit === 'piece') {
    // If product unit is 'piece', base is per-piece; otherwise treat base as per-kg but callers should supply proper unit
    return base;
  }
  return base;
}

export function computeTotal(unitPrice: number, quantity: number) {
  const qty = Number(quantity);
  if (Number.isNaN(qty) || qty <= 0) throw new Error('Invalid quantity');
  return Math.round(unitPrice * qty * 100) / 100;
}
