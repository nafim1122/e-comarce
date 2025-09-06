
import React, { useState, useEffect } from 'react';
import { addOrder, getOrders } from '../lib/order';
import { ShoppingCart, Search, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import { Product, CartItem, Order, PaymentData } from '../types';
import { initialProducts } from '../data/products';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import HeroSection from '../components/HeroSection';
import CartModal from '../components/CartModal';
import PaymentModal from '../components/PaymentModal';
import OrderHistory from '../components/OrderHistory';
import AdminPanel from '../components/AdminPanel';

const Index = () => {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const savedProducts = localStorage.getItem('products');
      const savedCart = localStorage.getItem('cart');
      if (savedProducts) {
        const parsedProducts = JSON.parse(savedProducts);
        if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
          setProducts(parsedProducts);
        }
      }
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          setCart(parsedCart);
        }
      }
      // Fetch orders from Firestore
      getOrders().then(fetchedOrders => {
        if (Array.isArray(fetchedOrders)) {
          setOrders(fetchedOrders);
        }
      });
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error loading saved data');
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem('products', JSON.stringify(products));
    } catch (error) {
      console.error('Error saving products:', error);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('orders', JSON.stringify(orders));
    } catch (error) {
      console.error('Error saving orders:', error);
    }
  }, [orders]);

  // Security: Input sanitization
  const sanitizeInput = (input: string): string => {
    return input.replace(/[<>]/g, '').trim();
  };

  const addToCart = (productId: number) => {
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { productId, quantity: 1 }]);
    }
    
    toast.success('Product added to cart!');
  };

  const updateCartQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity }
        : item
    ));
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.productId !== productId));
    toast.info('Product removed from cart');
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const product = products.find(p => p.id === item.productId);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleOrderComplete = async (paymentData: PaymentData) => {
    const orderItems = cart.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        name: product?.name || 'Unknown Product',
        quantity: item.quantity,
        price: product?.price || 0
      };
    });

    const newOrder = {
      date: new Date().toLocaleDateString('en-GB'),
      items: orderItems,
      total: getCartTotal(),
      paymentMethod: paymentData.paymentMethod,
      transactionId: paymentData.transactionId,
      address: paymentData.address,
      phone: paymentData.phone,
  status: "pending" as const
    };

    try {
      await addOrder(newOrder);
      setOrders([...orders, { id: Date.now(), ...newOrder }]);
      toast.success('Order placed successfully!');
    } catch (error) {
      toast.error('Error saving order to database');
    }
    clearCart();
    setIsPaymentOpen(false);
    setIsCartOpen(false);
  };

  const handleProductSelect = (productId: number) => {
    const element = document.getElementById(`product-${productId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredProducts = searchQuery
    ? products.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

  const handleAdminLogin = (credentials: { username: string; password: string }) => {
    // Security: Simple authentication (in production, use proper backend authentication)
    const sanitizedUsername = sanitizeInput(credentials.username);
    const sanitizedPassword = sanitizeInput(credentials.password);
    
    if (sanitizedUsername === 'admin' && sanitizedPassword === 'admin123') {
      setIsAuthenticated(true);
      toast.success('Admin login successful');
    } else {
      toast.error('Invalid credentials');
    }
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isMobileMenuOpen && !target.closest('.mobile-menu-container')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50">
      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-lg sticky top-0 z-40 border-b border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center gap-3">
              <img 
                src="/lovable-uploads/a8b8701a-7028-4152-bfc6-171ff21d753d.png" 
                alt="Tea Time Logo" 
                className="h-10 w-10"
              />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Tea Time
              </h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#home" className="text-gray-700 hover:text-amber-600 font-medium transition-colors">
                Home
              </a>
              <a href="#products" className="text-gray-700 hover:text-amber-600 font-medium transition-colors">
                Products
              </a>
              <a href="#about" className="text-gray-700 hover:text-amber-600 font-medium transition-colors">
                About
              </a>
              <button
                onClick={() => setIsAdminOpen(true)}
                className="text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                Admin
              </button>
            </div>

            {/* Desktop Search */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <SearchBar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                products={products}
                onProductSelect={handleProductSelect}
              />
            </div>

            {/* Cart and Mobile Menu */}
            <div className="flex items-center space-x-4">
              {/* Cart Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-amber-600 hover:text-amber-700 transition-colors"
              >
                <ShoppingCart className="h-6 w-6" />
                {getCartItemCount() > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {getCartItemCount()}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:text-amber-600 transition-colors mobile-menu-container"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden px-4 pb-4">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              products={products}
              onProductSelect={handleProductSelect}
            />
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200 mobile-menu-container">
            <div className="px-4 py-2 space-y-2">
              <a
                href="#home"
                className="block px-3 py-2 text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </a>
              <a
                href="#products"
                className="block px-3 py-2 text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Products
              </a>
              <a
                href="#about"
                className="block px-3 py-2 text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </a>
              <button
                onClick={() => {
                  setIsAdminOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                Admin
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <HeroSection />

      {/* Products Section */}
      <section id="products" className="py-16 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Premium Tea Collection
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover our finest tea selections from the gardens of Sreemangal
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} id={`product-${product.id}`}>
                <ProductCard
                  product={product}
                  onAddToCart={() => addToCart(product.id)}
                />
              </div>
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No products found</p>
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
            About Tea Time
          </h2>
          <div className="prose prose-lg max-w-none text-gray-700">
            <p className="mb-4">
              Welcome to Tea Time, your one-stop destination for the finest tea straight from 
              the heart of Sreemangal, the tea capital of Bangladesh. We are passionate about 
              delivering premium-quality tea leaves, blends, and accessories directly from the 
              gardens to your doorstep.
            </p>
            <p className="mb-6">
              Our journey started with a deep love for nature, tradition, and the aroma of 
              freshly brewed tea. Whether you're a casual sipper or a true tea connoisseur, 
              we have something special for everyone. We work closely with local tea growers 
              to ensure every product meets the highest standards of freshness and authenticity.
            </p>
            <div className="bg-white/70 rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-amber-800 mb-4">Contact Information</h3>
              <div className="space-y-2 text-left max-w-md mx-auto">
                <p><strong>Business Name:</strong> Tea Time</p>
                <p><strong>Phone Numbers:</strong></p>
                <ul className="ml-4 space-y-1">
                  <li>📞 <a href="tel:+8801742236623" className="text-amber-600 hover:text-amber-700">+880 1742-236623</a></li>
                  <li>📞 <a href="tel:+8801731085367" className="text-amber-600 hover:text-amber-700">+880 1731-085367</a></li>
                </ul>
                <p><strong>Address:</strong> Sreemangal - 3210, Bangladesh</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Order History */}
      <OrderHistory orders={orders} />

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">Tea Time</h3>
              <p className="text-gray-300">
                Your trusted source for premium tea from Sreemangal, Bangladesh.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <a href="#home" className="block text-gray-300 hover:text-white transition-colors">Home</a>
                <a href="#products" className="block text-gray-300 hover:text-white transition-colors">Products</a>
                <a href="#about" className="block text-gray-300 hover:text-white transition-colors">About</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <div className="space-y-2 text-gray-300">
                <p>Phone: <a href="tel:+8801742236623" className="text-amber-400 hover:text-amber-300">+880 1742-236623</a></p>
                <p>Phone: <a href="tel:+8801731085367" className="text-amber-400 hover:text-amber-300">+880 1731-085367</a></p>
                <p>Address: Sreemangal - 3210, Bangladesh</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 Tea Time. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        products={products}
        onUpdateQuantity={updateCartQuantity}
        onRemoveItem={removeFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsPaymentOpen(true);
        }}
        total={getCartTotal()}
      />

      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        total={getCartTotal()}
        onOrderComplete={handleOrderComplete}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        products={products}
        orders={orders}
        onLogin={handleAdminLogin}
  isAuthenticated={isAuthenticated}
  updateProducts={setProducts}
      />
    </div>
  );
};

export default Index;
