import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { OrderModel } from '../models/Order';
import { Product } from '../models/Product';
import { AuthRequest } from '../middleware/auth';

type ItemShape = { productId: string | mongoose.Types.ObjectId; name: string; quantity: number; unit: 'kg' | 'piece'; unitPriceAtTime: number; totalPriceAtTime: number };

export async function createOrderController(req: AuthRequest, res: Response) {
  const { items, paymentMethod, transactionId, address, phone } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error('Order items required') as Error & { status?: number };
    err.status = 400; throw err;
  }

  // Validate items and recompute prices server-side
  const validatedItems: ItemShape[] = [];
  let total = 0;
  for (const it of items) {
    if (!it.productId || !it.quantity) {
      const err = new Error('Invalid item') as Error & { status?: number };
      err.status = 400; throw err;
    }
    const prod = await Product.findById(it.productId);
    if (!prod) {
      const err = new Error('Product not found') as Error & { status?: number };
      err.status = 404; throw err;
    }
    const unit = it.unit === 'piece' ? 'piece' : 'kg';
    const qty = Number(it.quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      const err = new Error('Invalid quantity') as Error & { status?: number };
      err.status = 400; throw err;
    }
    const unitPrice = unit === 'kg' ? (prod.basePricePerKg || prod.price || 0) : (prod.unit === 'piece' ? (prod.basePricePerKg || prod.price || 0) : (prod.basePricePerKg || prod.price || 0));
    const itemTotal = Math.round((unitPrice * qty) * 100) / 100;
    validatedItems.push({ productId: prod._id, name: prod.name, quantity: qty, unit, unitPriceAtTime: unitPrice, totalPriceAtTime: itemTotal });
    total += itemTotal;
  }

  const userId = req.user?.id;
  const created = await OrderModel.create({ userId, items: validatedItems, total, paymentMethod, transactionId, address, phone });
  // Optionally emit an event
  if (globalThis.io) globalThis.io.emit('order:created', { id: created._id, userId, total, createdAt: created.createdAt });
  res.status(201).json({ id: created._id, total, items: validatedItems, createdAt: created.createdAt });
}

export async function listOrdersController(_req: Request, res: Response) {
  const all = await OrderModel.find().sort({ createdAt: -1 }).lean();
  res.json(all);
}

export async function deleteOrderController(req: Request, res: Response) {
  const del = await OrderModel.findByIdAndDelete(req.params.id);
  if (!del) {
    const err = new Error('Order not found') as Error & { status?: number };
    err.status = 404; throw err;
  }
  res.json({ message: 'Deleted' });
}

export async function updateOrderStatusController(req: Request, res: Response) {
  const id = req.params.id;
  const { status } = req.body;
  if (!['pending','confirmed','delivered'].includes(status)) {
    const err = new Error('Invalid status') as Error & { status?: number };
    err.status = 400; throw err;
  }
  const updated = await OrderModel.findByIdAndUpdate(id, { status }, { new: true });
  if (!updated) {
    const err = new Error('Order not found') as Error & { status?: number };
    err.status = 404; throw err;
  }
  if (globalThis.io) globalThis.io.emit('order:updated', { id: updated._id, status: updated.status });
  res.json({ id: updated._id, status: updated.status });
}
