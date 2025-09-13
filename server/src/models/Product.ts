import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  price: { type: Number, required: true, min: 0 },
  oldPrice: { type: Number, min: 0 },
  // Backwards-compatible primary numeric price (legacy field). We'll also store a clearer basePricePerKg for per-kg pricing.
  basePricePerKg: { type: Number, min: 0 },
  // Unit of sale: 'kg' or 'piece'
  unit: { type: String, enum: ['kg', 'piece'], default: 'kg' },
  category: { type: String, trim: true },
  photo: { type: String }, // stored path
  // priceTiers: an optional structure describing pricing by total order weight (grams)
  // Example: [{ minTotalWeight: 1000, pricePerKg: 1200 }, { minTotalWeight: 5000, pricePerKg: 1100 }]
  priceTiers: { type: mongoose.Schema.Types.Mixed },
  // kilogram step for kg products (e.g. 0.25 means 250g increments). Optional.
  kgStep: { type: Number, min: 0 },
  // Optional per-product minimum and maximum quantity (in the product's unit: kg or piece)
  minQuantity: { type: Number, min: 0 },
  maxQuantity: { type: Number, min: 0 },
  inStock: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export const Product = mongoose.model('Product', productSchema);
