import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { CartItemModel } from '../models/CartItem';

import { AuthRequest } from '../middleware/auth';

export async function addToCartController(req: AuthRequest, res: Response) {
  const { productId, quantity, unit } = req.body;
  if (!productId) {
    const err = new Error('productId required') as Error & { status?: number };
    err.status = 400; throw err;
  }
  const qty = Number(quantity);
  if (Number.isNaN(qty) || qty <= 0) {
    const err = new Error('Invalid quantity') as Error & { status?: number };
    err.status = 400; throw err;
  }
  const prod = await Product.findById(productId);
  if (!prod) {
    const err = new Error('Product not found') as Error & { status?: number };
    err.status = 404; throw err;
  }
  // Enforce product-level min/max and kg step (server authoritative)
  if (prod.minQuantity !== undefined && prod.minQuantity !== null && qty < prod.minQuantity) {
    const err = new Error(`Quantity ${qty} is below product minimum of ${prod.minQuantity}`) as Error & { status?: number };
    err.status = 400; throw err;
  }
  if (prod.maxQuantity !== undefined && prod.maxQuantity !== null && qty > prod.maxQuantity) {
    const err = new Error(`Quantity ${qty} is above product maximum of ${prod.maxQuantity}`) as Error & { status?: number };
    err.status = 400; throw err;
  }
  if (prod.unit === 'kg' && prod.kgStep) {
    const step = Number(prod.kgStep);
    if (step > 0) {
      const quotient = qty / step;
      if (Math.abs(quotient - Math.round(quotient)) > 1e-8) {
        const err = new Error(`Quantity must be a multiple of ${step}`) as Error & { status?: number };
        err.status = 400; throw err;
      }
    }
  }
  const useUnit = unit === 'piece' ? 'piece' : 'kg';
  // determine unitPrice from server-side base price
  let unitPrice = 0;
  if (useUnit === 'piece') {
    // assume base price stored as basePricePerKg is price per kg; if product.unit === 'piece' and basePricePerKg present, treat basePricePerKg as per-piece
    if (prod.unit === 'piece') unitPrice = prod.basePricePerKg || prod.price || 0;
    else unitPrice = prod.basePricePerKg ? prod.basePricePerKg * 1 : prod.price || 0;
  } else {
    // kg: basePricePerKg is per kg; if quantity is fractional (like 0.5), this is fine
    unitPrice = prod.basePricePerKg || prod.price || 0;
  }
  // if incoming quantity is grams (client might send grams), support both: if qty > 0 and product.unit==='kg' but client sent grams, we expect quantity in kg for this API; front-end will send in kg
  // total price = unitPrice * quantity
  const total = Math.round((unitPrice * Number(qty)) * 100) / 100;
  const userId = (req.user && req.user.id) ? String(req.user.id) : undefined;
  const created = await CartItemModel.create({ productId: prod._id, userId, quantity: qty, unit: useUnit, unitPriceAtTime: unitPrice, totalPriceAtTime: total });
  res.status(201).json({
    _id: created._id,
    productId: created.productId,
    quantity: created.quantity,
    unit: created.unit,
    unitPriceAtTime: created.unitPriceAtTime,
    totalPriceAtTime: created.totalPriceAtTime,
    createdAt: created.createdAt
  });
}

export async function listCartController(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const items = await CartItemModel.find({ userId }).sort({ createdAt: -1 }).lean();
  res.json(items);
}

export async function deleteCartItemController(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const id = req.params.id;
  const item = await CartItemModel.findById(id);
  if (!item) return res.status(404).json({ message: 'Not found' });
  if (String(item.userId) !== String(userId)) return res.status(403).json({ message: 'Forbidden' });
  await CartItemModel.findByIdAndDelete(id);
  res.json({ message: 'Deleted' });
}

export async function mergeCartController(req: AuthRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  const { items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ message: 'Invalid payload' });
  // items: [{ productId, quantity, unit }]
  // Merge by productId+unit: if exists on server, increment quantity, else create
  for (const it of items) {
    const productId = it.productId;
    const qty = Number(it.quantity);
    const unit = it.unit === 'piece' ? 'piece' : 'kg';
    if (!productId || Number.isNaN(qty) || qty <= 0) continue;
    // fetch product to respect bounds/step during merge
    const prod = await Product.findById(productId);
    const existing = await CartItemModel.findOne({ userId, productId, unit });
    if (existing) {
      // calculate new quantity and enforce/adjust bounds
      let newQty = existing.quantity + qty;
      if (prod) {
        if (prod.maxQuantity !== undefined && prod.maxQuantity !== null && newQty > prod.maxQuantity) newQty = prod.maxQuantity;
        if (prod.minQuantity !== undefined && prod.minQuantity !== null && newQty < prod.minQuantity) newQty = prod.minQuantity;
        if (prod.unit === 'kg' && prod.kgStep) {
          const step = Number(prod.kgStep);
          if (step > 0) newQty = Math.round(newQty / step) * step;
        }
      }
      existing.quantity = newQty;
      existing.totalPriceAtTime = Math.round((existing.unitPriceAtTime * existing.quantity) * 100) / 100;
      await existing.save();
    } else {
      // compute unit price from product and clamp/round incoming quantity
      const unitPrice = prod ? (prod.basePricePerKg || prod.price || 0) : 0;
      let createQty = qty;
      if (prod) {
        if (prod.maxQuantity !== undefined && prod.maxQuantity !== null && createQty > prod.maxQuantity) createQty = prod.maxQuantity;
        if (prod.minQuantity !== undefined && prod.minQuantity !== null && createQty < prod.minQuantity) createQty = prod.minQuantity;
        if (prod.unit === 'kg' && prod.kgStep) {
          const step = Number(prod.kgStep);
          if (step > 0) createQty = Math.round(createQty / step) * step;
        }
      }
      const total = Math.round((unitPrice * createQty) * 100) / 100;
      await CartItemModel.create({ userId, productId, quantity: createQty, unit, unitPriceAtTime: unitPrice, totalPriceAtTime: total });
    }
  }
  const merged = await CartItemModel.find({ userId }).sort({ createdAt: -1 }).lean();
  res.json(merged);
}
