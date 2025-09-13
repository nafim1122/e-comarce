import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, enum: ['kg','piece'], default: 'kg' },
  unitPriceAtTime: { type: Number, required: true },
  totalPriceAtTime: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: false },
  items: { type: [orderItemSchema], required: true },
  total: { type: Number, required: true },
  paymentMethod: { type: String, required: false },
  transactionId: { type: String, required: false },
  address: { type: String, required: false },
  phone: { type: String, required: false },
  status: { type: String, enum: ['pending','confirmed','delivered'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

export const OrderModel = mongoose.model('Order', orderSchema);
