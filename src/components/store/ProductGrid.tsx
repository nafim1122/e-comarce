import React from 'react';
import { Star, ShoppingCart, Tag, Package, Eye } from 'lucide-react';
import { Product } from '../../types';

interface ProductGridProps {
  products: Product[];
  searchQuery: string;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, searchQuery }) => {
  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculateDiscount = (price: number, oldPrice: number) => {
    if (!oldPrice || oldPrice <= price) return 0;
    return Math.round(((oldPrice - price) / oldPrice) * 100);
  };

  if (filteredProducts.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">
          {searchQuery ? 'No products found' : 'No products available'}
        </h3>
        <p className="text-gray-500">
          {searchQuery 
            ? `No products match "${searchQuery}"`
            : 'Products will appear here once added by admin'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filteredProducts.map((product) => {
        const discount = calculateDiscount(product.price, product.oldPrice || 0);
        
        return (
          <div
            key={product.id}
            className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-100 hover:border-purple-200"
          >
            {/* Image Container */}
            <div className="relative overflow-hidden">
              <img
                src={product.img}
                alt={product.name}
                className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              
              {/* Discount Badge */}
              {discount > 0 && (
                <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                  -{discount}%
                </div>
              )}
              
              {/* Stock Status */}
              <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium ${
                product.inStock 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {product.inStock ? 'In Stock' : 'Out of Stock'}
              </div>

              {/* Quick View Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                <button className="bg-white text-gray-800 px-4 py-2 rounded-lg font-semibold opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Quick View
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5">
              {/* Category */}
              {product.category && (
                <div className="flex items-center gap-1 mb-2">
                  <Tag className="h-3 w-3 text-purple-500" />
                  <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                    {product.category}
                  </span>
                </div>
              )}

              {/* Title */}
              <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                {product.name}
              </h3>

              {/* Description */}
              {product.description && (
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {product.description}
                </p>
              )}

              {/* Rating */}
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                ))}
                <span className="text-sm text-gray-500 ml-1">(4.8)</span>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-green-600">৳{product.price}</span>
                  {product.oldPrice && product.oldPrice > product.price && (
                    <span className="text-sm text-gray-400 line-through">৳{product.oldPrice}</span>
                  )}
                </div>
                <span className="text-xs text-gray-500">per {product.unit || 'kg'}</span>
              </div>

              {/* Add to Cart Button */}
              <button
                disabled={!product.inStock}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  product.inStock
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transform hover:scale-105 shadow-lg'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductGrid;