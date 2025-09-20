import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { useProducts } from '../../contexts/ProductContext';
import StoreHeader from './StoreHeader';
import ProductGrid from './ProductGrid';

interface StoreFrontProps {
  onAdminClick: () => void;
}

const StoreFront: React.FC<StoreFrontProps> = ({ onAdminClick }) => {
  const { products, loading, error } = useProducts();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Array<{ productId: string | number; quantity: number }>>([]);

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const handleCartClick = () => {
    // Cart functionality would be implemented here
    console.log('Cart clicked');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <StoreHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          cartItemCount={cartItemCount}
          onCartClick={handleCartClick}
          onAdminClick={onAdminClick}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading products...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <StoreHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          cartItemCount={cartItemCount}
          onCartClick={handleCartClick}
          onAdminClick={onAdminClick}
        />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="bg-red-100 text-red-800 p-4 rounded-lg">
              <p>Error: {error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <StoreHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartItemCount={cartItemCount}
        onCartClick={handleCartClick}
        onAdminClick={onAdminClick}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Premium Tea Collection
          </h1>
          <p className="text-xl md:text-2xl text-purple-100 mb-8 max-w-3xl mx-auto">
            Discover the finest teas from Bangladesh's tea gardens, delivered fresh to your doorstep
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#products"
              className="bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Shop Now
            </a>
            <a
              href="#about"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Our Products
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore our carefully curated selection of premium teas and related products
            </p>
          </div>

          <ProductGrid products={products} searchQuery={searchQuery} />
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
            About Tea Time
          </h2>
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="mb-6">
              Welcome to Tea Time, your premier destination for authentic Bangladeshi tea. 
              We source our products directly from the lush tea gardens of Sreemangal, 
              ensuring you receive only the finest quality tea leaves and blends.
            </p>
            <p>
              Our commitment to quality and freshness means every cup you brew tells 
              the story of our rich tea heritage. From traditional black teas to 
              innovative blends, we bring you the authentic taste of Bangladesh.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Tea Time</h3>
              <p className="text-gray-300">
                Premium tea from Bangladesh's finest gardens.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <a href="#products" className="block text-gray-300 hover:text-white transition-colors">Products</a>
                <a href="#about" className="block text-gray-300 hover:text-white transition-colors">About</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-gray-300">
                <p>Sreemangal, Bangladesh</p>
                <p>Email: info@teatime.com</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 Tea Time. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StoreFront;