import { Request, Response } from 'express';
import { Product } from '../models/Product';
import { emitProductUpdate } from '../socket';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export async function listProducts(_req: Request, res: Response) {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
}

export async function addProductController(req: Request, res: Response) {
  const { name, description, price, oldPrice, category, inStock, basePricePerKg, unit, kgStep, minQuantity, maxQuantity } = req.body;
  const priceTiersRaw = req.body.priceTiers;
  if (!name || price === undefined) {
    const err = new Error('Name and price required') as Error & { status?: number };
    err.status = 400;
    throw err;
  }
  // Accept legacy `price` or new `basePricePerKg`
  const priceNum = basePricePerKg !== undefined ? Number(basePricePerKg) : Number(price);
  const oldPriceNum = oldPrice !== undefined ? Number(oldPrice) : undefined;
  if (Number.isNaN(priceNum) || priceNum < 0) {
    const err = new Error('Invalid price') as Error & { status?: number };
    err.status = 400; throw err;
  }
  if (oldPriceNum !== undefined && (Number.isNaN(oldPriceNum) || oldPriceNum < 0)) {
    const err = new Error('Invalid oldPrice') as Error & { status?: number };
    err.status = 400; throw err;
  }
  const mReq = req as MulterRequest;
  const photoPath = mReq.file ? `/uploads/${mReq.file.filename}` : undefined;
  let priceTiers = undefined;
  try { priceTiers = priceTiersRaw ? (typeof priceTiersRaw === 'string' ? JSON.parse(priceTiersRaw) : priceTiersRaw) : undefined; } catch { priceTiers = undefined; }
  const unitValue = unit === 'piece' ? 'piece' : 'kg';
  const kgStepNum = kgStep !== undefined ? Number(kgStep) : undefined;
  const minQNum = minQuantity !== undefined ? Number(minQuantity) : undefined;
  const maxQNum = maxQuantity !== undefined ? Number(maxQuantity) : undefined;
  // validate optional fields
  if (kgStepNum !== undefined && (Number.isNaN(kgStepNum) || kgStepNum <= 0)) { const err = new Error('Invalid kgStep') as Error & { status?: number }; err.status = 400; throw err; }
  if (minQNum !== undefined && (Number.isNaN(minQNum) || minQNum < 0)) { const err = new Error('Invalid minQuantity') as Error & { status?: number }; err.status = 400; throw err; }
  if (maxQNum !== undefined && (Number.isNaN(maxQNum) || maxQNum < 0)) { const err = new Error('Invalid maxQuantity') as Error & { status?: number }; err.status = 400; throw err; }
  if (minQNum !== undefined && maxQNum !== undefined && minQNum > maxQNum) { const err = new Error('minQuantity cannot be greater than maxQuantity') as Error & { status?: number }; err.status = 400; throw err; }
  const product = await Product.create({ name, description, price: priceNum, oldPrice: oldPriceNum, category, inStock: inStock === 'true' || inStock === true, photo: photoPath, priceTiers, basePricePerKg: priceNum, unit: unitValue, kgStep: kgStepNum, minQuantity: minQNum, maxQuantity: maxQNum });
  // Emit socket event for real-time updates
  emitProductUpdate('add', { 
    _id: product._id, 
    name: product.name, 
    price: product.price, 
    oldPrice: product.oldPrice, 
    photo: product.photo, 
    img: product.photo, 
    description: product.description, 
    category: product.category, 
    inStock: product.inStock, 
    basePricePerKg: product.basePricePerKg, 
    unit: product.unit, 
    kgStep: product.kgStep, 
    minQuantity: product.minQuantity, 
    maxQuantity: product.maxQuantity 
  });
  res.status(201).json(product);
}

export async function deleteProductController(req: Request, res: Response) {
  const deleted = await Product.findByIdAndDelete(req.params.id);
  if (!deleted) {
    const err = new Error('Product not found') as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  // Emit socket event for real-time updates
  emitProductUpdate('delete', req.params.id);
  res.json({ message: 'Deleted' });
}

export async function editProductController(req: Request, res: Response) {
  const { name, description, price, oldPrice, category, inStock, basePricePerKg, unit, kgStep, minQuantity, maxQuantity } = req.body;
  const priceTiersRaw = req.body.priceTiers;
  const mReq = req as MulterRequest;
  const photoPath = mReq.file ? `/uploads/${mReq.file.filename}` : undefined;
  const update: Partial<{ name: string; description: string; price: number; oldPrice: number; category: string; photo: string; inStock: boolean; priceTiers: unknown; basePricePerKg: number; unit: string; kgStep: number; minQuantity: number; maxQuantity: number }> = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (price !== undefined) {
    const pNum = Number(price); if (Number.isNaN(pNum) || pNum < 0) { const err = new Error('Invalid price') as Error & { status?: number }; err.status = 400; throw err; } update.price = pNum;
  }
  if (basePricePerKg !== undefined) { const bNum = Number(basePricePerKg); if (Number.isNaN(bNum) || bNum < 0) { const err = new Error('Invalid basePricePerKg') as Error & { status?: number }; err.status = 400; throw err; } update.basePricePerKg = bNum; update.price = bNum; }
  if (unit !== undefined) { update.unit = (unit === 'piece' ? 'piece' : 'kg'); }
  if (kgStep !== undefined) { const kNum = Number(kgStep); if (Number.isNaN(kNum) || kNum <= 0) { const err = new Error('Invalid kgStep') as Error & { status?: number }; err.status = 400; throw err; } update.kgStep = kNum; }
  if (minQuantity !== undefined) { const mq = Number(minQuantity); if (Number.isNaN(mq) || mq < 0) { const err = new Error('Invalid minQuantity') as Error & { status?: number }; err.status = 400; throw err; } update.minQuantity = mq; }
  if (maxQuantity !== undefined) { const mq2 = Number(maxQuantity); if (Number.isNaN(mq2) || mq2 < 0) { const err = new Error('Invalid maxQuantity') as Error & { status?: number }; err.status = 400; throw err; } update.maxQuantity = mq2; }
  if (oldPrice !== undefined) {
    const opNum = Number(oldPrice); if (Number.isNaN(opNum) || opNum < 0) { const err = new Error('Invalid oldPrice') as Error & { status?: number }; err.status = 400; throw err; } update.oldPrice = opNum;
  }
  if (category !== undefined) update.category = category;
  if (priceTiersRaw !== undefined) {
    try { update.priceTiers = typeof priceTiersRaw === 'string' ? JSON.parse(priceTiersRaw) : priceTiersRaw; } catch { /* ignore parse errors */ }
  }
  if (inStock !== undefined) update.inStock = inStock === 'true' || inStock === true;
  if (photoPath) update.photo = photoPath;
  const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!product) {
    const err = new Error('Product not found') as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  // Emit socket event for real-time updates
  emitProductUpdate('update', { 
    _id: product._id, 
    name: product.name, 
    price: product.price, 
    oldPrice: product.oldPrice, 
    photo: product.photo, 
    img: product.photo, 
    description: product.description, 
    category: product.category, 
    inStock: product.inStock, 
    basePricePerKg: product.basePricePerKg, 
    unit: product.unit, 
    kgStep: product.kgStep, 
    minQuantity: product.minQuantity, 
    maxQuantity: product.maxQuantity 
  });
  res.json(product);
}
