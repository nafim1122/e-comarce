import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
  userId: { type: String, required: false },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, enum: ['kg','piece'], default: 'kg' },
  unitPriceAtTime: { type: Number, required: true, min: 0 },
  totalPriceAtTime: { type: Number, required: true, min: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const CartItemModel = mongoose.model('CartItem', cartItemSchema);
