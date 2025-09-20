import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth-context';
import { backendLogin, backendMe } from '../lib/backend-auth';
import { 
  Package, 
  Users, 
  TrendingUp, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  X,
  LogOut,
  Shield,
  AlertCircle
} from 'lucide-react';
import { Product, Order } from '../types';
import ProductForm from './ProductForm';
import { addProduct as addProductFire, deleteProduct as deleteProductFire } from '../lib/product';
import { listenProducts } from '../lib/firestore-products';
import localData, { getRoleForEmail, getTheme, setTheme } from '../lib/local-data';
import { deleteOrder, updateOrderStatus } from '../lib/order';
import { toast } from "sonner";

const AdminPanelDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders'>('dashboard');
  const [productQuery, setProductQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [isBackendAuthenticated, setIsBackendAuthenticated] = useState(false);
  const [backendCredentials, setBackendCredentials] = useState({ email: '', password: '' });
  const [checkingBackendAuth, setCheckingBackendAuth] = useState(true);
  // Local admin credential override (configurable via Vite env vars)
  const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string) || 'admin@example.com';
  const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string) || 'admin123';
  const [isLocalAdminAuthenticated, setIsLocalAdminAuthenticated] = useState(false);

  // Check backend authentication status
  useEffect(() => {
    const checkBackendAuth = async () => {
      try {
        const me = await backendMe();
        setIsBackendAuthenticated(!!me?.email);
      } catch (error) {
        setIsBackendAuthenticated(false);
      } finally {
        setCheckingBackendAuth(false);
      }
    };

    if (isAdmin) {
      checkBackendAuth();
    } else {
      setCheckingBackendAuth(false);
    }
  }, [isAdmin]);

  // Restore any local admin override stored in this session
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('localAdminAuthenticated');
      if (stored === '1') setIsLocalAdminAuthenticated(true);
    } catch (e) { /* ignore */ }
  }, []);

  // Load products and orders from local-data and subscribe to updates
  useEffect(() => {
    try {
      setProducts(localData.getProducts());
      setOrders(localData.getOrders());
    } catch (err) { console.error('[AdminPanelDashboard] init load failed', err); }

    // Subscribe to Firestore realtime updates (with local fallback handled in listenProducts)
    const unsub = listenProducts((items) => {
      // keep local storage in sync but prefer local-data as canonical
      setProducts(items);
      localData.saveProducts(items);
    }, (e) => {
      console.warn('[AdminPanelDashboard] realtime error', e);
    });

    const handleProductsLocal = () => setProducts(localData.getProducts());
    const handleOrdersLocal = () => setOrders(localData.getOrders());
    window.addEventListener('products-local-update', handleProductsLocal);
    window.addEventListener('orders-local-update', handleOrdersLocal);

    return () => {
      try { unsub(); } catch (e) { /* ignore */ }
      window.removeEventListener('products-local-update', handleProductsLocal);
      window.removeEventListener('orders-local-update', handleOrdersLocal);
    };
  }, []);

  const handleBackendLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Check against local admin credentials first (bypass backend)
    if (
      backendCredentials.email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase() &&
      backendCredentials.password === ADMIN_PASSWORD
    ) {
      setIsLocalAdminAuthenticated(true);
      setIsBackendAuthenticated(true);
      try { sessionStorage.setItem('localAdminAuthenticated', '1'); } catch (e) { /* ignore */ }
      toast.success('Local admin authenticated');
      return;
    }
    try {
      const result = await backendLogin(
        undefined, 
        backendCredentials.email, 
        backendCredentials.password
      );
      
      if (result?.email) {
        setIsBackendAuthenticated(true);
        toast.success('Backend authentication successful');
      } else {
        toast.error('Invalid backend credentials');
      }
    } catch (error) {
      console.error('Backend login error:', error);
      toast.error('Backend login failed');
    }
  };

  const handleLogout = () => {
    navigate('/');
  };

  const handleDeleteProduct = async (id: string | number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      // Update local-data immediately for instant UI feedback
      localData.deleteProductLocal(id);
      setProducts(localData.getProducts());

      // Firestore delete attempt (best-effort)
      try { await deleteProductFire(String(id)); } catch (e) { console.warn('Firestore delete failed', e); }

      toast.success('Product deleted successfully');
    } catch (error) {
      console.error('Delete product error:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      // Update local storage first for instant UI change
      localData.deleteOrderLocal(id);
      setOrders(localData.getOrders());
      // Try backend delete (best-effort)
      try { await deleteOrder(id); } catch (e) { console.warn('Backend deleteOrder failed', e); }
      toast.success('Order deleted successfully');
    } catch (error) {
      console.error('Delete order error:', error);
      toast.error('Failed to delete order');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      // Update local data for immediate effect
      localData.updateOrderStatusLocal(id, status);
      setOrders(localData.getOrders());
      // Propagate to backend (best effort)
      try { await updateOrderStatus(id, status); } catch (e) { console.warn('Backend updateOrderStatus failed', e); }
      toast.success('Order status updated');
    } catch (error) {
      console.error('Update status error:', error);
      toast.error('Failed to update order status');
    }
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  // Theme handling
  const [theme, setLocalTheme] = useState<'light'|'dark'>(getTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    setTheme(theme);
  }, [theme]);

  if (loading || checkingBackendAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // If the user is not a Firebase admin and hasn't authenticated with the local admin
  // credentials, show a focused authentication gate so the admin email/password can be
  // entered to gain access. This keeps the rest of the dashboard hidden from other users.
  if (!(isAdmin || isLocalAdminAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-3xl mx-auto p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Admin Sign-in Required</h3>
                <p className="text-yellow-700 mb-4 text-sm">
                  To access the admin dashboard, authenticate with the admin email and password.
                </p>

                <form onSubmit={handleBackendLogin} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-yellow-800 mb-1">Email</label>
                      <input
                        type="email"
                        value={backendCredentials.email}
                        onChange={(e) => setBackendCredentials(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="admin@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-800 mb-1">Password</label>
                      <input
                        type="password"
                        value={backendCredentials.password}
                        onChange={(e) => setBackendCredentials(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="bg-amber-600 text-white px-4 py-2 rounded-full hover:bg-amber-700 shadow-sm transition-transform transform hover:-translate-y-0.5"
                    >
                      Sign in as Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="text-sm text-gray-600 underline"
                    >
                      Back to site
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Note: Password is not shown here for security.</p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img 
                src="/lovable-uploads/a8b8701a-7028-4152-bfc6-171ff21d753d.png" 
                alt="Tea Time Logo" 
                className="h-8 w-8"
              />
              <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {!isBackendAuthenticated && (
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-amber-500" />
                  <span className="text-amber-600">Backend auth required for uploads</span>
                </div>
              )}
              <button
                onClick={() => setLocalTheme(t => t === 'light' ? 'dark' : 'light')}
                className="px-2 py-1 border rounded text-sm"
                title="Toggle theme"
              >
                {theme === 'light' ? '🌞' : '🌙'}
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6 bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700">Admin Menu</h4>
                <p className="text-xs text-gray-500">Quick access</p>
              </div>
              <nav className="flex flex-col space-y-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  aria-hidden="true"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'dashboard' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  aria-hidden="true"
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'products' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4" />
                    <span>Products</span>
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-md">{products.length}</span>
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  aria-hidden="true"
                  className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm transition-colors ${activeTab === 'orders' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4" />
                    <span>Orders</span>
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded-md">{orders.length}</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Main column */}
          <main className="lg:col-span-5">
        {/* Backend Authentication Section */}
        {!isBackendAuthenticated && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Backend Authentication Required
                </h3>
                <p className="text-yellow-700 mb-4 text-sm">
                  To upload images and access full admin features, please authenticate with the backend server.
                </p>
                
                <form onSubmit={handleBackendLogin} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-yellow-800 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={backendCredentials.email}
                        onChange={(e) => setBackendCredentials(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="admin@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-800 mb-1">
                        Password
                      </label>
                      <input
                        type="password"
                        value={backendCredentials.password}
                        onChange={(e) => setBackendCredentials(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="admin123"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-amber-600 text-white px-4 py-2 rounded-full hover:bg-amber-700 shadow-sm transition-transform transform hover:-translate-y-0.5"
                  >
                    Authenticate Backend
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

  {/* Navigation Tabs */}
  <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'dashboard'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Dashboard
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'products'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Products ({products.length})
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'orders'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Orders ({orders.length})
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Search & actions for products tab */}
            {activeTab === 'products' && (
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 w-full">
                  <input
                    type="search"
                    placeholder="Search products by name or category..."
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
                <div className="ml-4">
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full hover:bg-emerald-700 shadow-sm transition-transform transform hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4" />
                    Add Product
                  </button>
                </div>
              </div>
            )}

            {/* Main tab content container */}
            <div>
            {activeTab === 'dashboard' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
                  
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-3 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-600">৳{totalRevenue.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                          <Users className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Orders</p>
                          <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-100 p-3 rounded-lg">
                          <Package className="h-6 w-6 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Products</p>
                          <p className="text-2xl font-bold text-purple-600">{products.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Credentials Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Admin Access Credentials
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2">Firebase Admin Access</h4>
                        <div className="space-y-2 text-sm">
                          <p><strong>Current User:</strong> {user?.email || 'Not logged in'}</p>
                          <p><strong>Admin Status:</strong> {isAdmin ? '✅ Authorized' : '❌ Not authorized'}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2">Backend Server Access</h4>
                        <div className="space-y-2 text-sm">
                          <p><strong>Email:</strong> <code className="bg-blue-100 px-2 py-1 rounded">admin@example.com</code></p>
                          <p><strong>Password:</strong> <code className="bg-blue-100 px-2 py-1 rounded">admin123</code></p>
                          <p><strong>Status:</strong> {isBackendAuthenticated ? '✅ Connected' : '❌ Not connected'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Orders */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Orders</h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {orders.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        No orders yet
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Order ID</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {orders.slice(-5).reverse().map((order) => (
                              <tr key={order.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-mono">#{order.id.slice(-8)}</td>
                                <td className="px-4 py-3 text-sm">{order.date}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-green-600">৳{order.total}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                                    order.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {order.status || 'pending'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">Products Management</h2>
                </div>

                {/* Products Table */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {products.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No products yet. Add your first product to get started.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Image</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {products
                            .filter(p => p.name?.toLowerCase().includes(productQuery.toLowerCase()) || (p.category || '').toLowerCase().includes(productQuery.toLowerCase()))
                            .map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <img 
                                  src={product.img || '/placeholder.svg'} 
                                  alt={product.name} 
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                              <td className="px-4 py-3 text-sm text-green-600 font-semibold">৳{product.price}</td>
                              <td className="px-4 py-3 text-sm">{product.category || 'Uncategorized'}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  product.inStock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {product.inStock ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => setEditingProduct(product)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Edit product"
                                    aria-label="Edit product"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete product"
                                    aria-label="Delete product"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">Orders Management</h2>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {orders.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      No orders yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Order ID</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Items</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {orders.map((order) => (
                            <tr key={order.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-mono">#{order.id.slice(-8)}</td>
                              <td className="px-4 py-3 text-sm">{order.date}</td>
                              <td className="px-4 py-3 text-sm">{order.phone || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm">
                                <div className="space-y-1">
                                  {order.items.slice(0, 2).map((item, idx) => (
                                    <div key={idx} className="text-xs">
                                      {item.name} × {item.quantity}
                                    </div>
                                  ))}
                                  {order.items.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                      +{order.items.length - 2} more
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-green-600">৳{order.total}</td>
                              <td className="px-4 py-3 text-sm">
                                <div>
                                  <div className="font-medium">{order.paymentMethod}</div>
                                  {order.transactionId && (
                                    <div className="text-xs text-gray-500 truncate max-w-[100px]">
                                      {order.transactionId}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <select
                                  value={order.status || 'pending'}
                                  onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                  className="text-xs border rounded px-2 py-1 bg-white"
                                  aria-label={`Order ${order.id} status`}
                                >
                                  <option value="pending">Pending</option>
                                  <option value="confirmed">Confirmed</option>
                                  <option value="delivered">Delivered</option>
                                </select>
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <button
                                  onClick={() => handleDeleteOrder(order.id)}
                                  className="text-red-600 hover:text-red-800 text-xs hover:underline"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  </div>
</div>

        {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Add New Product</h3>
              <button
                onClick={() => setShowAddProduct(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close add product modal"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ProductForm
                onSaved={(product) => {
                  const added = localData.addProductLocal(product);
                  setProducts(localData.getProducts());
                  setShowAddProduct(false);
                  toast.success('Product added successfully');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Edit Product</h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close edit product modal"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <ProductForm
                initial={editingProduct}
                onSaved={(product) => {
                  const updated = localData.updateProductLocal(product);
                  setProducts(localData.getProducts());
                  setEditingProduct(null);
                  toast.success('Product updated successfully');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanelDashboard;