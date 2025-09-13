
import React, { useState } from 'react';
import { backendLogin } from '../lib/backend-auth';
import { X, Plus, Edit, Trash2, Package, Users, TrendingUp, Settings } from 'lucide-react';
import { Product, Order } from '../types';
import ProductForm from './ProductForm'
import { addProduct as addProductFire, deleteProduct as deleteProductFire } from '../lib/product';
import { deleteOrder, updateOrderStatus } from '../lib/order';
import { toast } from "sonner";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  orders: Order[];
  onLogin: (credentials: { username: string; password: string }) => void;
  isAuthenticated: boolean;
  updateProducts: React.Dispatch<React.SetStateAction<Product[]>>; // pass setProducts from parent
  // allow parent to update orders list after mutations
  updateOrders?: React.Dispatch<React.SetStateAction<Order[]>>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  products,
  orders,
  onLogin,
  isAuthenticated,
  updateProducts,
  updateOrders
}) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  // Internal type to allow temporary file attachment when editing
  type ProductWithFile = Product & { file?: File | null };
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'orders'>('dashboard');
  const [editingProduct, setEditingProduct] = useState<ProductWithFile | null>(null);
  type NewProductShape = {
    name: string;
    price: number;
    oldPrice?: number;
    img?: string;
    description?: string;
    inStock?: boolean;
    kgStep?: number;
    minQuantity?: number;
    maxQuantity?: number;
    file?: File | null;
    category?: string;
    basePricePerKg?: number;
    unit?: 'kg'|'piece';
  };

  const [newProduct, setNewProduct] = useState<NewProductShape>({
    name: '',
    price: 0,
    oldPrice: 0,
    img: '',
    description: '',
    inStock: true,
  kgStep: 0.5, // keep step but UI limits to 0.5/1 options
  minQuantity: 0.5,
    maxQuantity: 5,
    file: null
  });

  // Runtime local-mode flag (dev-only). Stored in localStorage under 'app:forceLocal'.
  const [runtimeForceLocal, setRuntimeForceLocal] = useState<boolean>(() => {
    try { return localStorage.getItem('app:forceLocal') === 'true'; } catch { return false; }
  });

  const [confirmingForceLocal, setConfirmingForceLocal] = useState<{next: boolean}|null>(null);
  const [confirmingPurge, setConfirmingPurge] = useState<boolean>(false);

  const toggleRuntimeForceLocal = (val?: boolean) => {
    const next = typeof val === 'boolean' ? val : !runtimeForceLocal;
    // show confirmation modal instead of flipping immediately
    setConfirmingForceLocal({ next });
  }

  const applyRuntimeForceLocal = (next: boolean) => {
    try { localStorage.setItem('app:forceLocal', next ? 'true' : 'false'); } catch { /* ignore */ }
    setRuntimeForceLocal(next);
    try { window.dispatchEvent(new Event('app:forceLocal-changed')); } catch {/* ignore */}
    toast.success(next ? 'Local mode enabled (dev)' : 'Local mode disabled');
    setConfirmingForceLocal(null);
  }

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const apiHost = API_BASE.replace(/\/api\/?$/, '');
  const resolvePhoto = (photo?: string) => {
    if (!photo) return '/placeholder.svg';
    if (/^https?:\/\//.test(photo)) return photo;
    if (photo.startsWith('/uploads')) return apiHost + photo;
    return photo;
  };

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(credentials);
  };

  const handleBackendLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // attempt backend admin login (sets cookie session)
    try {
      const res = await backendLogin(undefined, credentials.username, credentials.password);
      if (!res) {
        toast.error('Backend login failed');
        return;
      }
      toast.success('Backend login successful — reloading');
      // reload so auth-context checks backend session and marks admin
      window.location.reload();
    } catch (err) {
      console.error('[BackendLoginFail]', err);
      toast.error('Backend login failed');
    }
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || (!newProduct.img && !newProduct.file)) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Optimistic add: show temporary product and write to Firestore (authoritative).
    (async () => {
      const tempId = `tmp-${Date.now()}`;
      const previewUrl = newProduct.file ? URL.createObjectURL(newProduct.file) : (newProduct.img || '/placeholder.svg');
      const tempProduct: ProductWithFile = {
        id: tempId,
        name: newProduct.name,
        price: newProduct.price,
        oldPrice: newProduct.oldPrice || 0,
        img: previewUrl,
        description: newProduct.description,
        inStock: newProduct.inStock,
        kgStep: newProduct.kgStep,
        minQuantity: newProduct.minQuantity,
        maxQuantity: newProduct.maxQuantity,
        file: newProduct.file ?? null,
        category: newProduct.category,
        basePricePerKg: newProduct.basePricePerKg,
        unit: newProduct.unit
      } as ProductWithFile;

      // Optimistically add to UI
      updateProducts(prev => {
        const next = [tempProduct, ...prev];
        try { localStorage.setItem('products', JSON.stringify(next)); } catch {/* ignore */}
        try { window.dispatchEvent(new Event('products-local-update')); } catch {/* ignore */}
        return next;
      });
      setNewProduct({ name: '', price: 0, oldPrice: 0, img: '', description: '', inStock: true, kgStep: 0.5, minQuantity: 0.5, maxQuantity: 5, file: null });

  // Determine image URL: if file present, try backend upload; otherwise use provided img string.
  const imageUrl = typeof tempProduct.img === 'string' ? tempProduct.img : '';
      if (tempProduct.file) {
        try {
          const fd = new FormData();
          fd.append('photo', tempProduct.file);
          fd.append('name', tempProduct.name);
          fd.append('price', String(tempProduct.price));
          const res = await fetch(`${API_BASE}/products/add`, { method: 'POST', credentials: 'include', body: fd });
          if (res.ok) {
            // Backend is expected to write to Firestore; don't mutate state here — snapshot will update the list.
            toast.success('Product uploaded to backend — syncing...');
            try { URL.revokeObjectURL(previewUrl); } catch {/* ignore */}
            return;
          }
        } catch (err) {
          console.error('Backend upload failed, will try Firestore fallback for metadata', err);
        }
      }

      // Firestore write (primary for realtime). We avoid re-fetching: onSnapshot will update UI.
      try {
        const createdId = await addProductFire({
          name: tempProduct.name,
          price: tempProduct.price,
          oldPrice: tempProduct.oldPrice,
          img: imageUrl || '',
          description: tempProduct.description,
          category: tempProduct.category,
          inStock: tempProduct.inStock,
          basePricePerKg: tempProduct.basePricePerKg,
          unit: tempProduct.unit || 'kg'
        } as Omit<Product, 'id'>);
        // Let Firestore onSnapshot update the UI; no manual re-fetch.
        toast.success('Product added (firestore) — syncing...');
        try { URL.revokeObjectURL(previewUrl); } catch {/* ignore */}
        return;
      } catch (fireErr) {
        console.error('Firestore add failed', fireErr);
      }

      // If we reach here, all write attempts failed — remove temp and notify
      updateProducts(prev => {
        const next = prev.filter(p => String(p.id) !== String(tempId));
        try { localStorage.setItem('products', JSON.stringify(next)); } catch {/* ignore */}
        try { window.dispatchEvent(new Event('products-local-update')); } catch {/* ignore */}
        return next;
      });
      try { URL.revokeObjectURL(previewUrl); } catch {/* ignore */}
      toast.error('Failed to add product');
    })();
  };

  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    (async () => {
      try {
        const fd = new FormData();
        fd.append('name', String(editingProduct.name));
        fd.append('price', String(editingProduct.price));
        if (editingProduct.oldPrice) fd.append('oldPrice', String(editingProduct.oldPrice));
        if (editingProduct.description) fd.append('description', String(editingProduct.description));
        fd.append('inStock', String(editingProduct.inStock));
        // optional fields
  const editingMeta = editingProduct as ProductWithFile & Record<string, unknown>;
  fd.append('kgStep', String((editingMeta.kgStep ?? '0.5')));
  fd.append('minQuantity', String((editingMeta.minQuantity ?? 0.5)));
  fd.append('maxQuantity', String((editingMeta.maxQuantity ?? 5)));
        if (editingProduct.file) fd.append('photo', editingProduct.file);
        else if (editingProduct.img) fd.append('img', editingProduct.img);

        const id = editingProduct.id;
        // Prefer admin route
        const res = await fetch(`${API_BASE}/admin/products/${id}`, { method: 'PUT', credentials: 'include', body: fd });
        if (res.ok) {
          const p = await res.json();
          const mapped: Product = {
            id: p._id || p.id,
            name: p.name,
            price: Number(p.price) || 0,
            oldPrice: Number(p.oldPrice) || 0,
            img: p.photo || p.img || '/placeholder.svg',
            description: p.description,
            category: p.category,
            inStock: p.inStock !== false,
              basePricePerKg: p.basePricePerKg !== undefined ? Number(p.basePricePerKg) : (p.price !== undefined ? Number(p.price) : undefined),
            unit: p.unit || 'kg'
          };
          updateProducts(prev => {
            const next = prev.map(x => String(x.id) === String(mapped.id) ? mapped : x);
            try { localStorage.setItem('products', JSON.stringify(next)); } catch {/* ignore */}
            try { window.dispatchEvent(new Event('products-local-update')); } catch {/* ignore */}
            return next;
          });
          setEditingProduct(null);
          toast.success('Product updated successfully!');
          return;
        }
      } catch (err) {
        console.error('Update product failed:', err);
      }

      // Fallback: local-only update (keep previous behavior)
      const applyUpdate = (finalImg: string) => {
    updateProducts(prev => prev.map(p => String(p.id) === String(editingProduct.id) ? { ...editingProduct, img: finalImg, file: null } : p));
        setEditingProduct(null);
        toast.success('Product updated locally');
      };

      if (editingProduct.file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const imgSrc = ev.target?.result as string;
          applyUpdate(imgSrc);
        };
        reader.readAsDataURL(editingProduct.file);
        return;
      }
      applyUpdate(editingProduct.img);
    })();
  };

  const handleDeleteProduct = (id: number | string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    // Optimistic delete: remove locally and call Firestore delete (authoritative). Rollback on failure.
    (async () => {
      const before = products.find(p => String(p.id) === String(id));
      updateProducts(prev => {
        const next = prev.filter(p => String(p.id) !== String(id));
        try { localStorage.setItem('products', JSON.stringify(next)); } catch {/* ignore */}
        try { window.dispatchEvent(new Event('products-local-update')); } catch {/* ignore */}
        return next;
      });

      // Record a tombstone so a realtime snapshot or one-time fetch doesn't reintroduce this product
      try {
        const key = 'products:deleted:tombstone';
        const raw = localStorage.getItem(key);
        const tomb: Record<string, number> = raw ? JSON.parse(raw) : {};
        tomb[String(id)] = Date.now();
        localStorage.setItem(key, JSON.stringify(tomb));
      } catch (e) { /* ignore */ }

      // Attempt backend delete (if backend supports it) but do not use it to drive UI state.
      try {
        const res = await fetch(`${API_BASE}/products/delete/${id}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) {
          toast.success('Product deleted');
          return;
        }
      } catch (err) {
        console.error('Backend delete failed, will try Firestore', err);
      }

      // Firestore authoritative delete
      try {
        await deleteProductFire(String(id));
        toast.success('Product deleted (firestore)');
        return;
      } catch (fireErr) {
        console.error('Firestore delete failed', fireErr);
      }

      // Restore on failure
      if (before) {
        updateProducts(prev => {
          const next = [before, ...prev];
          try { localStorage.setItem('products', JSON.stringify(next)); } catch {/* ignore */}
          try { window.dispatchEvent(new Event('products-local-update')); } catch {/* ignore */}
          return next;
        });
      }
      toast.error('Failed to delete product');
    })();
  };

  const resetAndClose = () => {
    setCredentials({ username: '', password: '' });
    setActiveTab('dashboard');
    setEditingProduct(null);
    onClose();
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
 

  const handleDeleteOrder = async (id: string) => {
    if (!updateOrders) return;
    if (window.confirm('Delete this order?')) {
      try {
        await deleteOrder(id);
        updateOrders(prev => prev.filter(o => o.id !== id));
        toast.success('Order deleted');
      } catch (e) {
        toast.error('Failed to delete order');
      }
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    if (!updateOrders) return;
    try {
      await updateOrderStatus(id, status);
  updateOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as 'pending' | 'confirmed' | 'delivered' } : o));
      toast.success('Status updated');
    } catch (e) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
          </div>
          <button
            onClick={resetAndClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close admin panel"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="p-8">
            <div className="max-w-md mx-auto">
              <h3 className="text-2xl font-bold text-center mb-6">Admin Login</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter password"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                >
                  Login
                </button>
              </form>
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Or sign in to backend (server session) to enable uploads and admin API:</p>
                <form onSubmit={handleBackendLogin} className="flex gap-2">
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors">Sign in to backend</button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-[calc(90vh-80px)]">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'dashboard' ? 'bg-red-100 text-red-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <TrendingUp className="h-5 w-5" />
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('products')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'products' ? 'bg-red-100 text-red-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Package className="h-5 w-5" />
                  Products ({products.length})
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'orders' ? 'bg-red-100 text-red-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  Orders ({orders.length})
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-800">Dashboard</h3>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 p-3 rounded-lg">
                          <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Revenue</p>
                          <p className="text-2xl font-bold text-green-600">৳{totalRevenue}</p>
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
                  <div className="mt-4">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={runtimeForceLocal} onChange={() => toggleRuntimeForceLocal()} className="w-4 h-4" />
                      <span className="text-sm">Enable Local Mode (dev only) — use localStorage for product data</span>
                    </label>
                  </div>

                  {/* Recent Orders */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Recent Orders</h4>
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
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {orders.slice(-5).reverse().map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-mono truncate max-w-[100px]">#{order.id}</td>
                                  <td className="px-4 py-3 text-sm">{order.date}</td>
                                  <td className="px-4 py-3 text-sm">{order.phone || 'N/A'}</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-green-600">৳{order.total}</td>
                                  <td className="px-4 py-3 text-sm">{order.paymentMethod}</td>
                                  <td className="px-4 py-3 text-sm">
                                    <select
                                      aria-label="Order status"
                                      title="Order status"
                                      value={order.status || 'pending'}
                                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                      className="text-xs border rounded px-2 py-1"
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="confirmed">Confirmed</option>
                                      <option value="delivered">Delivered</option>
                                    </select>
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <button
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="text-red-600 hover:underline text-xs"
                                    >Delete</button>
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
                    <h3 className="text-2xl font-bold text-gray-800">Products Management</h3>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">Add / Edit Product</h4>
                    <ProductForm onSaved={(p) => {
                      // prepend saved product to list and persist locally
                      const mapped: Product = {
                        id: p.id,
                        name: p.name,
                        price: p.price || 0,
                        oldPrice: p.oldPrice || 0,
                        img: Array.isArray(p.img) ? (p.img[0] || '') : (p.img || ''),
                        description: p.description,
                        category: p.category,
                        inStock: p.inStock !== false,
                        basePricePerKg: p.basePricePerKg,
                        unit: p.unit || 'kg'
                      }
                      updateProducts(prev => {
                        const next = [mapped, ...prev];
                        try { localStorage.setItem('products', JSON.stringify(next)); } catch (e) { /* ignore localStorage errors */ }
                        try { window.dispatchEvent(new Event('products-local-update')) } catch {/* ignore */}
                        return next;
                      })
                    }} />
                    <div className="mt-3 flex items-center gap-3">
                      <button
                        onClick={() => setConfirmingPurge(true)}
                        className="px-3 py-2 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded text-sm hover:bg-yellow-100"
                        title="Purge stale local-only products"
                      >
                        Purge stale local-only products
                      </button>
                      <div className="text-sm text-gray-500">Removes local-only items older than 24 hours (tmp-/local- ids).</div>
                    </div>
                  </div>

                  {/* Products Table */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Image</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Price</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Old Price</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {products.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <img src={product.img || '/placeholder.svg'} alt={product.name} className="w-12 h-12 object-cover rounded" />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium">{product.name}</td>
                              <td className="px-4 py-3 text-sm text-green-600 font-semibold">৳{product.price}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">৳{product.oldPrice}</td>
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
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Delete product"
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
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-800">Orders Management</h3>
                  
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
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Items</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Address</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {orders.map((order) => (
                              <tr key={order.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-mono truncate max-w-[100px]">#{order.id}</td>
                                <td className="px-4 py-3 text-sm">{order.date}</td>
                                <td className="px-4 py-3 text-sm">
                                  <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="text-xs">
                                        {item.name} × {item.quantity}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-green-600">৳{order.total}</td>
                                <td className="px-4 py-3 text-sm">
                                  <div>
                                    <div className="font-medium">{order.paymentMethod}</div>
                                    {order.transactionId && (
                                      <div className="text-xs text-gray-500">{order.transactionId}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm">{order.phone || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm max-w-xs truncate">{order.address || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm">
                                  <select
                                    aria-label="Order status"
                                    title="Order status"
                                    value={order.status || 'pending'}
                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                    className="text-xs border rounded px-2 py-1"
                                  >
                                    <option value="pending">Pending</option>
                                    <option value="confirmed">Confirmed</option>
                                    <option value="delivered">Delivered</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="text-red-600 hover:underline text-xs"
                                  >Delete</button>
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
        )}

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">Edit Product</h3>
                <button onClick={() => setEditingProduct(null)} className="p-1 hover:bg-gray-100 rounded" title="Close edit product"><X className="h-5 w-5" /></button>
              </div>
              <ProductForm initial={editingProduct} onSaved={(p) => {
                // update product in list
                updateProducts(prev => {
                  const next = prev.map(x => String(x.id) === String(p.id) ? p : x);
                  try { localStorage.setItem('products', JSON.stringify(next)); } catch (e) { /* ignore */ }
                  try { window.dispatchEvent(new Event('products-local-update')) } catch {/* ignore */}
                  return next;
                })
                setEditingProduct(null)
                toast.success('Product updated')
              }} />
            </div>
          </div>
        )}

        {/* Confirmation modal for toggling runtime local-mode */}
        {confirmingForceLocal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
              <h4 className="text-lg font-semibold mb-2">Confirm change</h4>
              <p className="text-sm text-gray-700 mb-4">Are you sure you want to {confirmingForceLocal.next ? 'enable' : 'disable'} Local Mode? This will switch product persistence to localStorage for this browser session.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmingForceLocal(null)} className="px-3 py-2 rounded bg-gray-100">Cancel</button>
                <button onClick={() => applyRuntimeForceLocal(confirmingForceLocal.next)} className="px-3 py-2 rounded bg-red-600 text-white">Confirm</button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation modal for purging local-only products */}
        {confirmingPurge && (
          <div className="fixed inset-0 bg-black bg-opacity-40 z-60 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
              <h4 className="text-lg font-semibold mb-2">Purge stale local products</h4>
              <p className="text-sm text-gray-700 mb-4">This will permanently remove all local-only products (ids starting with <code>tmp-</code> or <code>local-</code>) older than 24 hours from your browser storage. This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setConfirmingPurge(false)} className="px-3 py-2 rounded bg-gray-100">Cancel</button>
                <button onClick={() => {
                  try {
                    const key = 'products';
                    const raw = localStorage.getItem(key);
                    if (raw) {
                      const parsed: Product[] = JSON.parse(raw);
                      const THRESH = 1000 * 60 * 60 * 24; // 24 hours
                      const now = Date.now();
                      const kept = parsed.filter(p => {
                        const idStr = String(p.id);
                        if (!(idStr.startsWith('tmp-') || idStr.startsWith('local-'))) return true;
                        // If createdAt exists and is recent keep it
                        // local-only items created by admin optimistic add may not have createdAt,
                        // in that case we conservatively keep them unless they have a `createdAt`.
                        // If createdAt is missing treat as older and purge.
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const createdAt = (p as any).createdAt;
                        if (typeof createdAt === 'number') {
                          return (now - createdAt) <= THRESH;
                        }
                        return false;
                      });
                      localStorage.setItem(key, JSON.stringify(kept));
                      try { window.dispatchEvent(new Event('products-local-update')); } catch {/* ignore */}
                      updateProducts(kept as Product[]);
                      toast.success('Purged stale local-only products');
                    } else {
                      toast.info('No local products found');
                    }
                  } catch (err) {
                    console.error('Purge failed', err);
                    toast.error('Failed to purge local products');
                  }
                  setConfirmingPurge(false);
                }} className="px-3 py-2 rounded bg-yellow-600 text-white">Purge</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
