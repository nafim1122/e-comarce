
import React from 'react';
import { Star, ShoppingCart, CheckCircle } from 'lucide-react';
import { Product } from '../types';
import { addToCartAPI } from '../api/cartAdapter';

interface ProductCardProps {
  product: Product;
  onAddToCart?: (quantity: number, unit: 'kg' | 'piece') => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  // For this UI we only allow two fixed weight options for kg: 0.5 and 1
  const defaultUnit = (product.unit || 'kg') as 'kg' | 'piece';
  const [unit, setUnit] = React.useState<'kg' | 'piece'>(defaultUnit);
  // For kg: selectedWeight is 0.5 or 1 (kg). For piece: behave like legacy (count of pieces)
  const [selectedWeight, setSelectedWeight] = React.useState<number>(0.5);
  // count is an integer multiplier (e.g., 2 x 0.5kg == 1.0kg total)
  const [count, setCount] = React.useState<number>(1);
  const [optionHighlight, setOptionHighlight] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  // Base price per kg (set by admin). For pieces, pricePerPiece used.
  const basePricePerKg = Number(product.basePricePerKg ?? product.price ?? 0);
  const pricePerPiece = Number(product.price ?? 0);
  // pricePerKg is the authoritative per-kg price
  const pricePerKg = basePricePerKg;

  const money = (v: number) => {
    try {
  return new Intl.NumberFormat('bn-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(v);
    } catch {
      return `৳${Number(v).toFixed(2)}`;
    }
  };

  // compute total dynamically
  const total = React.useMemo(() => {
    if (unit === 'kg') {
      const totalWeight = Number((selectedWeight * count));
      return Math.round(pricePerKg * totalWeight * 100) / 100;
    }
    return Math.round(pricePerPiece * count * 100) / 100;
  }, [unit, selectedWeight, count, pricePerKg, pricePerPiece]);

  // helpers for count (integer multiplier)
  const decrease = () => {
    setCount(c => Math.max(1, c - 1));
    setError(null);
  };

  const increase = () => {
    setCount(c => c + 1);
    setError(null);
  };

  const handleUnitChange = (u: 'kg' | 'piece') => {
    setUnit(u);
    setError(null);
    // reset selection when switching
    if (u === 'kg') {
      setSelectedWeight(0.5);
      setCount(1);
    } else {
      setCount(1);
    }
  };

  const handleAdd = async () => {
    if (!product.inStock) return;
    if (unit === 'kg') {
      if (count < 1) { setError('Quantity must be at least 1'); return; }
    } else {
      if (count < 1) { setError('Quantity must be at least 1'); return; }
    }

    setError(null);
    setIsAdding(true);

    try {
      // For kg: send total weight as quantity (selectedWeight * count)
      const sendQuantity = unit === 'kg' ? Number((selectedWeight * count)) : count;
      const calculatedTotal = Math.round((unit === 'kg' ? pricePerKg * sendQuantity : pricePerPiece * sendQuantity) * 100) / 100;

      const result = await addToCartAPI({
        productId: String(product.id),
        quantity: sendQuantity,
        unit: unit,
  calculatedTotalPrice: calculatedTotal,
  selectedWeight: unit === 'kg' ? (selectedWeight === 1 ? 1 : 0.5) : undefined,
  count: unit === 'kg' ? count : undefined
      });

      // Show success feedback
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);

      // Call parent callback with total weight for kg, or count for piece
      onAddToCart?.(sendQuantity, unit);
    } catch (err) {
      console.error('Add to cart failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to add to cart. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const discount = product.oldPrice && product.oldPrice > product.price ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
      <div className="relative overflow-hidden">
        <img src={product.img ?? '/placeholder.svg'} alt={product.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">-{discount}%</div>
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
            <span className="text-white font-semibold">Out of Stock</span>
          </div>
        )}
      </div>

    <div className="p-4 flex-1 flex flex-col min-w-0">
        <div className="mb-2">
      <h3 className="font-semibold text-lg text-gray-800 truncate">{product.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-yellow-400" />
              ))}
            </div>
            <span className="ml-1">4.8</span>
          </div>
        </div>

    <div className="flex items-end justify-between mb-4 min-w-0">
          <div>
      {/* Show price for selected option */}
      {unit === 'kg' ? (
        <>
          <div className="text-xl font-bold text-green-600 truncate">{money(selectedWeight === 1 ? pricePerKg : pricePerKg / 2)}</div>
          <div className="text-xs text-gray-500">/ {selectedWeight === 1 ? '1 kg' : '0.5 kg'}</div>
        </>
      ) : (
        <>
          <div className="text-xl font-bold text-green-600 truncate">{money(pricePerPiece)}</div>
          <div className="text-xs text-gray-500">/ piece</div>
        </>
      )}
          </div>
          {product.category && <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">{product.category}</div>}
        </div>

        <div className="mt-auto space-y-3">
          {/* Weight Options for kg unit */}
          {unit === 'kg' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Weight Options:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setSelectedWeight(0.5); setOptionHighlight(true); window.setTimeout(() => setOptionHighlight(false), 300); }}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors min-w-0 flex flex-col items-start overflow-hidden ${
                    selectedWeight === 0.5
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium truncate">0.5 kg</div>
                  <div className="text-xs truncate">{money(pricePerKg / 2)}</div>
                </button>
                <button
                  onClick={() => { setSelectedWeight(1); setOptionHighlight(true); window.setTimeout(() => setOptionHighlight(false), 300); }}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors min-w-0 flex flex-col items-start overflow-hidden ${
                    selectedWeight === 1
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium truncate">1 kg</div>
                  <div className="text-xs truncate">{money(pricePerKg)}</div>
                </button>
              </div>
              {/* Selected option price & highlight */}
              <div className={`mt-2 text-sm font-medium ${optionHighlight ? 'bg-yellow-50 border border-yellow-200 rounded px-2 py-1 transition-all duration-300' : 'transition-all duration-300'}`}>
                <span>Selected price: <strong className="text-green-600">{money(selectedWeight === 1 ? pricePerKg : pricePerKg / 2)}</strong></span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <label htmlFor={`unit-${String(product.id)}`} className="sr-only">Unit</label>
            <select id={`unit-${String(product.id)}`} value={unit} onChange={e => handleUnitChange(e.target.value as 'kg'|'piece')} className="border rounded px-2 py-1 text-sm flex-shrink-0">
              <option value="kg">kg</option>
              <option value="piece">piece</option>
            </select>

            {/* Count controls: integer multiplier for selected weight */}
            {unit === 'kg' && (
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <button onClick={decrease} aria-label="Decrease" className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 flex-shrink-0">-</button>
                <input
                  aria-label="Quantity"
                  title="Quantity"
                  type="number"
                  step={1}
                  min={1}
                  value={count}
                  onChange={e => setCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                  className="border rounded px-3 py-1 text-sm w-28 max-w-full text-center min-w-0"
                />
                <button onClick={increase} aria-label="Increase" className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 flex-shrink-0">+</button>
                <div className="text-sm text-gray-600 font-medium truncate">
                  Selected: {count} × {selectedWeight} kg = {selectedWeight * count} kg
                </div>
              </div>
            )}

            <div className="ml-auto text-sm text-gray-600 truncate max-w-[8rem]">Total: <span className="font-semibold text-green-600">{money(total)}</span></div>
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}

          <button
            onClick={handleAdd}
            disabled={!product.inStock || !(unit === 'kg' ? count > 0 : count > 0) || isAdding}
            className={`w-full py-2 rounded-lg font-semibold transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              showSuccess 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isAdding ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Adding...
              </>
            ) : showSuccess ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Added to Cart!
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
