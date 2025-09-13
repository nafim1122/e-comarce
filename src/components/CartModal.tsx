
import React from 'react';
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react';
import { CartItem, Product } from '../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  products: Product[];
  onUpdateQuantity: (productId: number | string, quantity: number, unit?: 'kg'|'piece') => void;
  onRemoveItem: (productId: number | string, unit?: 'kg'|'piece') => void;
  onCheckout: () => void;
  total: number;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  onClose,
  cart,
  products,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  total
}) => {
  if (!isOpen) return null;

  const cartWithProducts = cart.map(item => ({
    ...item,
    product: products.find(p => p.id === item.productId)!
  }));

  const money = (v: number) => {
    try {
  return new Intl.NumberFormat('bn-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(v);
    } catch (e) {
  return `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })} BDT`;
    }
  };
  const MAX_PIECES = 999;
  const MAX_KG = 5; // max 5 kg per line as requested

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-in-right rounded-l-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">Your Cart</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close cart"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Cart Items */}
  <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-300">
          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Your cart is empty</p>
              <p className="text-gray-400">Add some products to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartWithProducts.map(({ productId, quantity, product, unit, unitPriceAtTime, totalPriceAtTime, serverId, selectedWeight, count }) => (
                <div key={`${productId}-${unit}-${serverId || ''}`} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <img
                      src={product.img}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <p className="text-green-600 font-semibold mb-2 text-sm">
                        {unit === 'kg' ? `${quantity} kg` : `${quantity} pcs`} – {money((() => {
                          try {
                            // Prefer server-provided unitPriceAtTime when available
                            if (typeof unitPriceAtTime === 'number') return unitPriceAtTime;
                            // Fallback to totalPriceAtTime/quantity if available
                            if (typeof totalPriceAtTime === 'number' && quantity > 0) return Math.round((totalPriceAtTime / quantity) * 100) / 100;
                            // If tiers exist, compute effective unit price per kg
                            const tiers = (product.priceTiers as Array<{ minTotalWeight: number; pricePerKg: number }> | undefined) || undefined;
                            if (tiers && tiers.length && unit === 'kg') {
                              const totalGrams = quantity * 1000;
                              const sorted = [...tiers].sort((a,b)=>a.minTotalWeight - b.minTotalWeight);
                              let chosen = sorted[0];
                              for (const t of sorted) if (t.minTotalWeight <= totalGrams) chosen = t;
                              const pricePerKg = chosen.pricePerKg;
                              return Math.round(pricePerKg * 100) / 100;
                            }
                            // Fallback: prefer product.basePricePerKg for kg unit
                            if (unit === 'kg') return product.basePricePerKg ?? product.price ?? 0;
                            return product.price ?? 0;
                          } catch (e) { /* ignore */ }
                          return product.price ?? 0;
                        })())} each
                      </p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (unit === 'kg') {
                                const currentCount = count ?? Math.round((quantity / (selectedWeight || 0.5)) || 1);
                                const nextCount = Math.max(1, currentCount - 1);
                                const sendQuantity = Number(((selectedWeight ?? 0.5) * nextCount));
                                onUpdateQuantity(productId, sendQuantity, unit);
                              } else {
                                const next = Math.max(1, Math.floor((Number(quantity) || 0) - 1));
                                onUpdateQuantity(productId, next, unit);
                              }
                            }}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus className="h-4 w-4 text-gray-600" />
                          </button>
                          <span className="font-semibold px-3 py-1 bg-white rounded-lg min-w-[3rem] text-center">
                            {unit === 'kg' ? `${count ?? Math.round((quantity / (selectedWeight || 0.5)) || 1)} × ${selectedWeight ?? 0.5}kg` : quantity}
                          </span>
                          <button
                            onClick={() => {
                              if (unit === 'kg') {
                                const currentCount = count ?? Math.round((quantity / (selectedWeight || 0.5)) || 1);
                                const nextCount = currentCount + 1;
                                const sendQuantity = Number(((selectedWeight ?? 0.5) * nextCount));
                                onUpdateQuantity(productId, Math.min(product.maxQuantity ?? 5, sendQuantity), unit);
                              } else {
                                const next = Math.min(MAX_PIECES, Math.ceil((Number(quantity) || 0) + 1));
                                onUpdateQuantity(productId, next, unit);
                              }
                            }}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            title="Increase quantity"
                            disabled={(product.unit === 'piece' && quantity >= MAX_PIECES) || (product.unit !== 'piece' && (quantity) >= MAX_KG)}
                          >
                            <Plus className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                        
                          <button
                            onClick={() => onRemoveItem(productId, unit)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                      </div>
                      
                      {/* Subtotal */}
                      <div className="text-right mt-2">
                        <span className="text-lg font-bold text-gray-800">{money((() => {
                          try {
                            // Prefer authoritative server total when present
                            if (typeof totalPriceAtTime === 'number') return totalPriceAtTime;
                            // If price tiers exist and unit is kg, compute from tiers
                            const tiers = (product.priceTiers as Array<{ minTotalWeight: number; pricePerKg: number }> | undefined) || undefined;
                            if (tiers && tiers.length && unit === 'kg') {
                              const totalGrams = quantity * 1000;
                              const sorted = [...tiers].sort((a,b)=>a.minTotalWeight - b.minTotalWeight);
                              let chosen = sorted[0];
                              for (const t of sorted) if (t.minTotalWeight <= totalGrams) chosen = t;
                              const pricePerKg = chosen.pricePerKg;
                              const linePrice = pricePerKg * quantity;
                              return Math.round(linePrice * 100) / 100;
                            }
                            // Otherwise compute using basePricePerKg for kg or price for piece
                            if (unit === 'kg') {
                              const unitPrice = product.basePricePerKg ?? product.price ?? 0;
                              return Math.round(unitPrice * quantity * 100) / 100;
                            }
                            return Math.round((product.price ?? 0) * quantity * 100) / 100;
                          } catch (e) { /* ignore */ }
                          return Math.round((product.price ?? 0) * quantity * 100) / 100;
                        })())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="border-t border-gray-200 p-6 space-y-4">
            <div className="flex justify-between items-center text-xl font-bold">
              <span>Total:</span>
              <span className="text-green-600">৳{total}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;
