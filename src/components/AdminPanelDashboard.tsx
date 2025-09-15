import React, { useEffect, useState, useCallback, useRef } from "react";
import imageCompression from 'browser-image-compression'
import { storage } from "../lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
// We keep Firestore orders for now; products switched to backend API
import { getOrders, deleteOrder, updateOrderStatus } from "../lib/order";
import { addProduct as addProductFirestore, fetchProducts as fetchProductsFirestore, updateProduct as updateProductFirestore, deleteProduct as deleteProductFirestore } from '../lib/product';
// admin dashboard: do not import bundled demo products; use localStorage as authoritative
import { Package, ListChecks } from "lucide-react";
import { Product, Order } from "../types";
import { useAuth } from "../lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getSocket } from "../lib/socket";
import { backendLogin } from "../lib/backend-auth";
// Dev-only helper to simulate successful server-created product when backend is unreachable
import { simulateServerCreatedProduct } from "../lib/dev-sync";

interface ProductFormState {
  name: string;
  price: string;
  oldPrice: string;
  img: string;
  description: string;
  category: string;
  inStock: boolean;
  priceTiers: string; // JSON text
  basePricePerKg: string;
  unit: 'kg' | 'piece';
  preset05?: string;
  preset1?: string;
}

// Local sync metadata for products saved locally when backend is unreachable
interface SyncMeta { lastAttemptAt: number; lastError: string; retryCount: number }

export default function AdminPanelDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState<ProductFormState>({ name: "", price: "", oldPrice: "", img: "", description: "", category: "", inStock: true, priceTiers: '', basePricePerKg: '', unit: 'kg' });
  const [editId, setEditId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
  const [productSearch, setProductSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [page, setPage] = useState(1);
  const [orderPage, setOrderPage] = useState(1);
  const pageSize = 10;
  const { toast } = useToast();
  const { isAdmin, loading: authLoading } = useAuth();
  const [preview, setPreview] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dark, setDark] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastError, setLastError] = useState<string>("");
  const [showLastError, setShowLastError] = useState<boolean>(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    try { const v = localStorage.getItem('admin_auto_sync'); return v !== '0'; } catch { return true; }
  });
  const [syncLogVisible, setSyncLogVisible] = useState<boolean>(false);
  const [syncLog, setSyncLog] = useState<Array<{ ts: number; message: string }>>(() => {
    try { const raw = localStorage.getItem('admin_sync_log'); if (raw) return JSON.parse(raw); } catch { /* ignore */ }
    return [];
  });

  const appendSyncLog = useCallback((msg: string) => {
    const entry = { ts: Date.now(), message: msg };
    setSyncLog(prev => {
      const next = [entry, ...prev].slice(0, 100);
      try { localStorage.setItem('admin_sync_log', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const clearSyncLog = useCallback(() => { setSyncLog([]); try { localStorage.removeItem('admin_sync_log'); } catch { /* ignore */ } }, []);
  // Backend default port is 5000 (see server/env.ts). Fallback order: env var -> 5000.
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const apiHost = API_BASE.replace(/\/api\/?$/, '');
  const resolvePhoto = React.useCallback((photo?: string) => {
    if (!photo) return '';
    if (/^https?:\/\//.test(photo)) return photo;
    if (photo.startsWith('/uploads')) return apiHost + photo;
    return photo;
  }, [apiHost]);

  useEffect(() => {
    // Realtime product events
  interface ProductEvent { _id?: string; id?: string; name: string; price: number; oldPrice?: number; photo?: string; img?: string; description?: string; category?: string; inStock?: boolean; basePricePerKg?: number; unit?: 'kg'|'piece'; }
  const socket = getSocket();
  const onCreated = (p: ProductEvent) => {
      setProducts(prev => {
        if (prev.some(x => x.id === (p._id || p.id))) return prev; // avoid dupes
  const next = [{ id: p._id || p.id, name: p.name, price: p.price, oldPrice: p.oldPrice||0, img: resolvePhoto(p.photo||p.img)||'', description: p.description, category: p.category, inStock: p.inStock!==false }, ...prev];
    try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    };
  const onUpdated = (p: ProductEvent) => {
      setProducts(prev => {
  const next = prev.map(x => x.id === (p._id || p.id) ? { ...x, name: p.name, price: p.price, oldPrice: p.oldPrice||0, img: resolvePhoto(p.photo||p.img) || x.img, description: p.description, category: p.category } : x);
    try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    };
  const onDeleted = (d: { id: string }) => {
      setProducts(prev => {
        const next = prev.filter(x => String(x.id) !== String(d.id));
    try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    };
    socket.on('product:created', onCreated);
    socket.on('product:updated', onUpdated);
    socket.on('product:deleted', onDeleted);
    return () => {
      socket.off('product:created', onCreated);
      socket.off('product:updated', onUpdated);
      socket.off('product:deleted', onDeleted);
    };
  }, [resolvePhoto]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingProducts(true);
        setLoadingOrders(true);
        // Load products from Firestore (with local fallback inside helper)
        const productsList = await fetchProductsFirestore();
        // Mark that backend succeeded so we don't auto seed on later transient failures
        try { localStorage.setItem('products_backend_ok', '1'); } catch { /* ignore */ }
        setProducts(productsList || []);
        try { localStorage.setItem('products', JSON.stringify(productsList || [])); } catch { /* ignore */ }

        // Orders: try server first, then local helper
        try {
          const res = await fetch(`${API_BASE}/orders/list`);
          if (res.ok) {
            const serverOrders = await res.json();
            setOrders(serverOrders || []);
          } else {
            setOrders(await getOrders());
          }
        } catch (err) {
          console.warn('[OrdersFetchFail]', err);
          try {
            const ls = localStorage.getItem('orders');
            if (ls) {
              const parsed = JSON.parse(ls);
              if (Array.isArray(parsed)) setOrders(parsed as Order[]);
            }
          } catch { /* ignore localStorage parse errors */ }
        }
      } catch (err) {
        console.error('[DashboardFetchError]', err);
        toast({ title: 'Failed to load data', variant: 'destructive' });
      } finally {
        setLoadingProducts(false);
        setLoadingOrders(false);
      }
    })();
  }, [toast, API_BASE]);

  // Auto-clear transient lastError after a short timeout so UI isn't noisy
  useEffect(() => {
    if (!lastError) return;
    setShowLastError(true);
    const t = setTimeout(() => {
      setLastError('');
      setShowLastError(false);
    }, 10000); // 10s
    return () => clearTimeout(t);
  }, [lastError]);

  const resetForm = () => {
  setForm({ name: "", price: "", oldPrice: "", img: "", description: "", category: "", inStock: true, priceTiers: '', basePricePerKg: '', unit: 'kg' });
    setEditId(null);
    setPreview(null);
  };

  // Persist autoSyncEnabled preference
  useEffect(() => {
    try { localStorage.setItem('admin_auto_sync', autoSyncEnabled ? '1' : '0'); } catch { /* ignore */ }
  }, [autoSyncEnabled]);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
  const priceNum = Number(form.price);
    const oldPriceNum = form.oldPrice ? Number(form.oldPrice) : 0;
  const basePriceNum = form.basePricePerKg ? Number(form.basePricePerKg) : priceNum;
    const finalImg = form.img || preview || ""; // now optional
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast({ title: 'Invalid price', variant: 'destructive' });
      return;
    }
    if (form.basePricePerKg) {
      const b = Number(form.basePricePerKg);
      if (Number.isNaN(b) || b < 0) {
        toast({ title: 'Invalid base price per kg', variant: 'destructive' });
        return;
      }
    }
    if (form.unit !== 'kg' && form.unit !== 'piece') {
      toast({ title: 'Invalid unit', variant: 'destructive' });
      return;
    }
    // Parse priceTiers JSON if provided
    let parsedPriceTiers: Array<{ minTotalWeight: number; pricePerKg: number }> | undefined = undefined;
    if (form.priceTiers) {
      try { parsedPriceTiers = JSON.parse(form.priceTiers); } catch (e) { parsedPriceTiers = undefined; }
    }
  const productData: Partial<Product> & { presetMultipliers?: Record<string, number> } = { ...form, img: finalImg || '/placeholder.svg', price: priceNum, oldPrice: oldPriceNum, priceTiers: parsedPriceTiers, basePricePerKg: basePriceNum, unit: form.unit };
  // attach preset multipliers if provided
  if (form.preset05) productData.presetMultipliers = { ...productData.presetMultipliers, '0.5': Number(form.preset05) };
  if (form.preset1) productData.presetMultipliers = { ...productData.presetMultipliers, '1': Number(form.preset1) };
    try {
      if (editId) {
        // Update via Firestore helper
        await updateProductFirestore(editId, productData as Partial<Product>);
        setProducts(prev => {
          const next = prev.map(p => String(p.id) === String(editId) ? { ...p, ...productData } : p);
          try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
          try { window.dispatchEvent(new CustomEvent('products-local-update')); } catch { /* ignore */ }
          return next;
        });
        toast({ title: 'Product updated' });
      } else {
        // Create via Firestore helper
        const createdId = await addProductFirestore(productData as Omit<Product, 'id'>);
        const created: Product = { id: createdId, ...(productData as Product) } as Product;
        toast({ title: 'Product added' });
        setProducts(prev => { const next = [created, ...prev]; try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ } try { window.dispatchEvent(new CustomEvent('products-local-update')); } catch { /* ignore */ } return next; });
      }
      resetForm();
      // Refresh from source of truth
      fetchProductsFirestore().then(fresh => { setProducts(fresh); try { localStorage.setItem('products', JSON.stringify(fresh)); } catch { /* ignore */ } }).catch(() => {});
    } catch (err: unknown) {
      console.error('[ProductAddError]', err);
      const rawMessage = (err as { message?: string })?.message || '';
      // Detect common network failure message from fetch
      const isNetworkFailure = rawMessage === 'Failed to fetch' || rawMessage === '' && (err instanceof TypeError);

  if (isNetworkFailure && !editId) {
        // Friendly offline behavior: save locally and inform the user
        const friendly = 'Backend unavailable';
        setLastError(friendly);
        toast({ title: 'Saved locally', description: 'Product saved locally because the backend could not be reached.', variant: 'default' });

        const localId = 'local-' + Date.now();
        const localProduct = { id: localId, ...productData, _sync: { lastAttemptAt: Date.now(), lastError: 'backend unavailable', retryCount: 0 } } as unknown as Product;
        setProducts(prev => {
          const next = [localProduct, ...prev];
          try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
          try { window.dispatchEvent(new CustomEvent('products-local-update')); } catch { /* ignore */ }
          return next;
        });
  setStatus('Saved locally (sync failed)');
  resetForm();
      } else {
        const message = rawMessage || 'Operation failed';
        setLastError(message);
        toast({ title: 'Operation failed', description: message, variant: 'destructive' });

        if (!editId) {
          // Offline/failed backend: store locally so user sees it
          const localId = 'local-' + Date.now();
          const localProduct = { id: localId, ...productData, _sync: { lastAttemptAt: Date.now(), lastError: message, retryCount: 0 } } as unknown as Product;
          setProducts(prev => { const next = [localProduct, ...prev]; try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ } try { window.dispatchEvent(new CustomEvent('products-local-update')); } catch { /* ignore */ } return next; });
          setStatus('Saved locally (sync failed)');
          resetForm();
        }
      }
    }
  };

  const syncLocalProducts = useCallback(async () => {
    const locals = products.filter(p => String(p.id).startsWith('local-'));
    if (!locals.length) return;
    let success = 0;
    for (const lp of locals) {
      try {
        const createdId = await addProductFirestore(lp as Omit<Product, 'id'>);
        const created: Product = { id: createdId, ...(lp as Product) } as Product;
        setProducts(prev => {
          const next = prev.map(p => String(p.id) === String(lp.id) ? created : p);
          try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
        success++;
        appendSyncLog(`Synced product ${lp.name} (${lp.id})`);
      } catch (e) {
        console.warn('[SyncLocalFail]', lp.name, e);
        // In development, simulate a successful server create so dev flow can continue without backend
        if (import.meta.env.DEV) {
          const promoted = simulateServerCreatedProduct(lp);
          setProducts(prev => {
            const next = prev.map(p => p.id === lp.id ? promoted : p);
            try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
            return next;
          });
          success++;
          appendSyncLog(`Dev-simulated sync for ${lp.name} (${lp.id})`);
          continue;
        }
        // Update per-item sync metadata so the admin can see errors
  setProducts(prev => {
          const next = prev.map(p => {
            if (String(p.id) !== String(lp.id)) return p;
            const meta = (((p as unknown) as { _sync?: SyncMeta })._sync) || { lastAttemptAt: 0, lastError: '', retryCount: 0 };
            const updated = { ...p, _sync: { lastAttemptAt: Date.now(), lastError: String((e as Error)?.message || 'sync failed'), retryCount: (meta.retryCount || 0) + 1 } };
            return updated;
          });
          try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
          appendSyncLog(`Failed to sync ${lp.name} (${lp.id}): ${String((e as Error)?.message || 'sync failed')}`);
          return next;
        });
      }
    }
    if (success) {
  toast({ title: `Synced ${success} product(s)` });
  appendSyncLog(`Background sync: ${success} item(s) synced`);
      setStatus("");
    } else {
  toast({ title: 'Sync attempt failed', variant: 'destructive' });
  appendSyncLog('Background sync attempt failed');
    }
    return success;
  }, [products, toast, appendSyncLog]);

  // Manual retry for a single local product
  const retryLocalProduct = useCallback(async (lp: Product) => {
    if (!String(lp.id).startsWith('local-')) {
      toast({ title: 'Not a local product', variant: 'default' });
      return;
    }
    try {
      const createdId = await addProductFirestore(lp as Omit<Product, 'id'>);
      setProducts(prev => {
        const next = prev.map(p => String(p.id) === String(lp.id) ? ({ id: createdId, ...(lp as Product) } as Product) : p);
        try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
      toast({ title: 'Product synced' });
      appendSyncLog(`Manually synced ${lp.name} (${lp.id})`);
      return true;
    } catch (e) {
      console.warn('[RetryLocalFail]', lp.name, e);
      if (import.meta.env.DEV) {
        const promoted = simulateServerCreatedProduct(lp);
        setProducts(prev => {
          const next = prev.map(p => String(p.id) === String(lp.id) ? promoted : p);
          try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
          return next;
        });
        toast({ title: 'Product synced (dev simulated)' });
        appendSyncLog(`Dev-simulated manual sync ${lp.name} (${lp.id})`);
        return true;
      }
      // record failure metadata too
  setProducts(prev => {
        const next = prev.map(p => {
          if (String(p.id) !== String(lp.id)) return p;
          const meta = (((p as unknown) as { _sync?: SyncMeta })._sync) || { lastAttemptAt: 0, lastError: '', retryCount: 0 };
          return { ...p, _sync: { lastAttemptAt: Date.now(), lastError: String((e as Error)?.message || 'sync failed'), retryCount: (meta.retryCount || 0) + 1 } };
        });
  try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
  appendSyncLog(`Manual sync failed ${lp.name} (${lp.id}): ${String((e as Error)?.message || '')}`);
        return next;
      });
      toast({ title: 'Sync failed', description: String((e as Error)?.message || ''), variant: 'destructive' });
      return false;
    }
  }, [toast, appendSyncLog]);

  useEffect(() => {
    const onOnline = () => { syncLocalProducts(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [syncLocalProducts]);

  // Adaptive background sync with exponential backoff.
  const backgroundSyncRunning = useRef(false);
  useEffect(() => {
    let mounted = true;
    let backoff = 5_000; // start 5s
    const maxBackoff = 5 * 60_000; // 5 minutes
    const run = async () => {
      if (!mounted) return;
      if (!navigator.onLine) return;
      if (backgroundSyncRunning.current) return;
      const locals = products.filter(p => String(p.id).startsWith('local-'));
      if (!locals.length) return;
      backgroundSyncRunning.current = true;
      try {
        const success = await syncLocalProducts();
        if (success) {
          // reset backoff
          backoff = 5_000;
        } else {
          // increase backoff
          backoff = Math.min(maxBackoff, backoff * 2);
        }
      } catch (e) {
        backoff = Math.min(maxBackoff, backoff * 2);
      } finally {
        backgroundSyncRunning.current = false;
      }
      // schedule next run
      setTimeout(() => { if (mounted) run(); }, backoff);
    };
    // start
    run();
    return () => { mounted = false; };
  }, [products, syncLocalProducts]);

  const handleEdit = (product: Product) => {
    setEditId(String(product.id));
    setForm({
      name: product.name,
      price: String(product.price),
      oldPrice: String(product.oldPrice),
      img: product.img || "",
      description: product.description || "",
      category: product.category || "",
      inStock: product.inStock ?? true,
  priceTiers: product.priceTiers ? JSON.stringify(product.priceTiers) : '',
  basePricePerKg: product.basePricePerKg ? String(product.basePricePerKg) : '',
  unit: product.unit || 'kg'
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    // Optimistic remove
    setProducts(prev => {
      const next = prev.filter(p => String(p.id) !== id);
  try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    try {
    await deleteProductFirestore(id);
      toast({ title: 'Product deleted' });
      // Attempt refresh from backend (ignore errors)
  fetchProductsFirestore().then(f => { setProducts(f); try { localStorage.setItem('products', JSON.stringify(f)); } catch { /* ignore */ } }).catch(()=>{});
    } catch (err) {
      console.warn('[ProductDeleteFail]', err);
      setStatus('Delete failed (kept locally)');
      toast({ title: 'Delete failed (offline?)', variant: 'destructive' });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected product(s)?`)) return;
    for (const id of selectedIds) {
      try { await deleteProductFirestore(id); } catch { /* ignore */ }
    }
    setSelectedIds(new Set());
    setProducts(await fetchProductsFirestore());
    toast({ title: 'Bulk delete complete' });
  };

  const handleOrderDelete = async (id: string) => {
    if (!confirm('Delete this order?')) return;
    try {
      const res = await fetch(`${API_BASE}/orders/delete/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Delete failed');
    } catch (e) {
      // fallback to local delete helper
      await deleteOrder(id);
    }
    toast({ title: 'Order deleted' });
    setOrders(await getOrders());
  };

  const handleOrderStatus = async (id: string, statusValue: string) => {
    try {
      const res = await fetch(`${API_BASE}/orders/status/${id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: statusValue }) });
      if (!res.ok) throw new Error('Status update failed');
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: statusValue as 'pending' | 'confirmed' | 'delivered' } : o));
      toast({ title: 'Status updated' });
    } catch (e) {
      // fallback to local helper
      await updateOrderStatus(id, statusValue);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: statusValue as 'pending' | 'confirmed' | 'delivered' } : o));
      toast({ title: 'Status updated (local fallback)' });
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesText = [p.name, p.category, p.description].some(v => v?.toLowerCase().includes(productSearch.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || (p.category || '').toLowerCase() === categoryFilter.toLowerCase();
    return matchesText && matchesCategory;
  });
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const pagedProducts = filteredProducts.slice((page-1)*pageSize, page*pageSize);
  const unsyncedCount = products.filter(p => String(p.id).startsWith('local-')).length;

  const filteredOrders = orders.filter(o =>
    [o.id, o.paymentMethod, o.status, o.phone].some(v => String(v || '').toLowerCase().includes(orderSearch.toLowerCase()))
  );
  const totalOrderPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const pagedOrders = filteredOrders.slice((orderPage-1)*pageSize, orderPage*pageSize);

  const allCategories = Array.from(new Set(products.map(p => (p.category || '').trim()).filter(Boolean)));

  // Demo seeding intentionally removed to keep localStorage authoritative.

  return (
  <div className={`${dark ? 'dark' : ''} min-h-screen flex bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900`}>
  <aside className="w-60 border-r bg-white/80 dark:bg-neutral-900/70 backdrop-blur-sm px-4 py-6 space-y-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground">Manage store data</p>
        </div>
        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('products')}
            className={`group w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition border ${activeTab==='products'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow border-transparent'
              : 'bg-white/60 hover:bg-white text-gray-700 border-amber-100'} `}
          >
            <Package className="h-4 w-4 opacity-80 group-hover:opacity-100" /> Products
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`group w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition border ${activeTab==='orders'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow border-transparent'
              : 'bg-white/60 hover:bg-white text-gray-700 border-amber-100'} `}
          >
            <ListChecks className="h-4 w-4 opacity-80 group-hover:opacity-100" /> Orders
          </button>
        </nav>
        {status && <div className="text-xs rounded-md bg-amber-100/70 text-amber-800 px-3 py-2 leading-relaxed break-words border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-700">{status}</div>}
        <div className="pt-4">
          <button onClick={()=>setDark(d=>!d)} className="w-full text-xs px-3 py-2 rounded-md border bg-white/60 hover:bg-white dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700 transition">{dark ? 'Light Mode' : 'Dark Mode'}</button>
        </div>
      </aside>
  <main className="flex-1 p-4 sm:p-6 space-y-8 dark:text-neutral-100">
  {(!isAdmin && !authLoading) && (
          <Card>
            <CardHeader><CardTitle>Unauthorized</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">You are not allowed to view this page. Please login as admin.</p>
            </CardContent>
          </Card>
        )}
  {isAdmin && activeTab === 'products' && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>{editId ? 'Edit Product' : 'Add Product'}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddOrUpdate} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <input className="border rounded-md px-3 py-2 text-sm" placeholder="Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required />
                  <input className="border rounded-md px-3 py-2 text-sm" placeholder="Price" type="number" value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))} required />
                  <input className="border rounded-md px-3 py-2 text-sm" placeholder="Old Price" type="number" value={form.oldPrice} onChange={e=>setForm(f=>({...f,oldPrice:e.target.value}))} />
                  <input className="border rounded-md px-3 py-2 text-sm" placeholder="Base price per kg / per piece" type="number" value={form.basePricePerKg} onChange={e=>setForm(f=>({...f,basePricePerKg:e.target.value}))} />
                  <select aria-label="Unit" title="Unit" value={form.unit} onChange={e=>setForm(f=>({...f,unit: e.target.value as 'kg' | 'piece'}))} className="border rounded-md px-3 py-2 text-sm">
                    <option value="kg">kg</option>
                    <option value="piece">piece</option>
                  </select>
                  <input className="border rounded-md px-3 py-2 text-sm" placeholder="0.5kg multiplier (e.g. 1.05)" type="number" value={form.preset05 || ''} onChange={e=>setForm(f=>({...f,preset05:e.target.value}))} />
                  <input className="border rounded-md px-3 py-2 text-sm" placeholder="1kg multiplier (e.g. 1.1)" type="number" value={form.preset1 || ''} onChange={e=>setForm(f=>({...f,preset1:e.target.value}))} />
                  <input className="border rounded-md px-3 py-2 text-sm" placeholder="Image URL" value={form.img} onChange={e=>setForm(f=>({...f,img:e.target.value}))} />
                  <div className="flex flex-col gap-2 md:col-span-2 lg:col-span-2">
                    <input type="file" accept="image/*" aria-label="Upload image" title="Upload image" onChange={async e=>{
                      const file = e.target.files?.[0];
                      if (file) {
                        // Compress and upload to Firebase Storage to avoid storing large base64
                        const url = await compressAndUpload(file);
                        setPreview(url);
                        setForm(f=>({...f, img: url}));
                      } else {
                        setPreview(null);
                        setForm(f=>({...f, img: ''}));
                      }
                    }} className="border rounded-md px-3 py-2 text-sm" />
                    {preview && <img src={preview} alt="Preview" className="h-32 w-32 object-cover rounded border" />}
                  </div>
                  <input className="border rounded-md px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} />
                  <input className="border rounded-md px-3 py-2 text-sm" placeholder="Category" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.inStock} onChange={e=>setForm(f=>({...f,inStock:e.target.checked}))} /> In Stock</label>
                  <div className="md:col-span-2 lg:col-span-4">
                    <label className="text-xs text-muted-foreground block mb-1">Price Tiers (optional)</label>
                    <textarea className="w-full border rounded-md px-3 py-2 text-sm" placeholder='Example: [{ "minTotalWeight": 0, "pricePerKg": 120 }, { "minTotalWeight": 2000, "pricePerKg": 110 }]' value={form.priceTiers} onChange={e=>setForm(f=>({...f,priceTiers:e.target.value}))} rows={3} />
                    <p className="text-xs text-muted-foreground mt-1">Enter JSON array of tiers where minTotalWeight is in grams and pricePerKg is the price per kg.</p>
                  </div>
                  <div className="flex gap-2 md:col-span-2 lg:col-span-4">
                    <Button type="submit" className="gap-1">{editId ? 'Update' : 'Add'} Product</Button>
                    {editId && <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>}
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-2">
                    <CardTitle>Products ({filteredProducts.length})</CardTitle>
                    {unsyncedCount > 0 && (
                      <div className="text-xs flex items-center gap-2 text-amber-700 bg-amber-100/70 border border-amber-200 px-2 py-1 rounded-md w-fit">
                        {unsyncedCount} local product{unsyncedCount>1?'s':''} (not yet synced). <button type="button" onClick={syncLocalProducts} className="underline">Sync now</button>
                      </div>
                    )}
                    {lastError && showLastError && (
                      <div className="flex items-start gap-2 text-[11px] text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-md max-w-sm break-words">
                        <div className="flex-1">Last error: {lastError}</div>
                        <button onClick={() => { setShowLastError(false); setLastError(''); }} className="text-red-600 hover:text-red-700 text-xs ml-2">Dismiss</button>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={e=>{setPage(1); setProductSearch(e.target.value);} }
                        className="border rounded-md px-3 py-2 text-sm w-full sm:w-64 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      />
                      <select
                        aria-label="Filter by category"
                        value={categoryFilter}
                        onChange={e=>{ setPage(1); setCategoryFilter(e.target.value); }}
                        className="border rounded-md px-3 py-2 text-sm w-full sm:w-40 bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                      >
                        <option value="all">All Categories</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                    <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center">
                    {/* No auto demo seeding - localStorage is the single source-of-truth */}
                    {selectedIds.size>0 && (
                      <Button type="button" variant="destructive" onClick={handleBulkDelete} className="bg-red-500/90 hover:bg-red-600">Delete Selected ({selectedIds.size})</Button>
                    )}
                    <div className="flex items-center gap-2">
                      <label className="text-xs">Auto-sync:</label>
                      <label className="sr-only">Toggle auto-sync for local products</label>
                      <input aria-label="Auto-sync" title="Auto-sync" type="checkbox" checked={autoSyncEnabled} onChange={e=>setAutoSyncEnabled(e.target.checked)} />
                    </div>
                    <Button type="button" variant="outline" onClick={()=>exportProductsCSV(products)} className="ml-auto border-amber-300 hover:bg-amber-50 text-amber-700">Export CSV</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({length:4}).map((_,i)=>(
                      <div key={i} className="h-24 rounded-md bg-gradient-to-r from-amber-100 to-orange-100 animate-pulse" />
                    ))}
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-12 text-center space-y-4">
                    <p>No products yet.</p>
                    <p className="text-xs text-muted-foreground">Add one above or seed demo data.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border shadow-sm overflow-hidden rounded-md">
                      <thead className="bg-gradient-to-r from-amber-100 to-orange-100">
                        <tr className="text-left">
                          <th className="p-2 font-medium">Image</th>
                          <th className="p-2 font-medium">Name</th>
                          <th className="p-2 font-medium">Price</th>
                          <th className="p-2 font-medium">Old</th>
                          <th className="p-2 font-medium">Stock</th>
                          <th className="p-2 font-medium">Sync Status</th>
                          <th className="p-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedProducts.map(p => {
                          const checked = selectedIds.has(String(p.id));
                          return (
                          <tr key={p.id} className="border-t hover:bg-amber-50/60 dark:hover:bg-neutral-800/60">
                            <td className="p-2">
                              <input aria-label="Select product" type="checkbox" className="mr-2" checked={checked} onChange={(e)=>{
                                setSelectedIds(prev=>{ const c=new Set(prev); if(e.target.checked) c.add(String(p.id)); else c.delete(String(p.id)); return c; });
                              }} />
                              <img src={(p as unknown as { photo?: string }).photo || p.img} alt={p.name} className="mt-2 w-12 h-12 object-cover rounded border border-amber-100 shadow-sm" />
                            </td>
                            <td className="p-2 font-medium max-w-[160px] truncate">{p.name}</td>
                            <td className="p-2 text-emerald-600 font-semibold">৳{p.price}</td>
                            <td className="p-2 text-muted-foreground line-through">{p.oldPrice}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${p.inStock ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{p.inStock ? 'In' : 'Out'}</span>
                            </td>
                            <td className="p-2 text-xs">
                              {String(p.id).startsWith('local-') ? (
                                <div className="space-y-1">
                                  <div className="text-amber-700 font-medium">Local (unsynced)</div>
                                  {((p as unknown) as { _sync?: SyncMeta })._sync && (
                                    <div className="text-[11px] text-muted-foreground">
                                      <div>Last: {new Date((((p as unknown) as { _sync?: SyncMeta })._sync?.lastAttemptAt) || 0).toLocaleString()}</div>
                                      <div>Error: {(((p as unknown) as { _sync?: SyncMeta })._sync?.lastError) || '—'}</div>
                                      <div>Retries: {(((p as unknown) as { _sync?: SyncMeta })._sync?.retryCount) || 0}</div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-green-700">Synced</div>
                              )}
                            </td>
                            <td className="p-2 flex gap-2">
                              <Button size="sm" variant="outline" onClick={()=>handleEdit(p)} className="hover:border-amber-400 hover:text-amber-600">Edit</Button>
                              <Button size="sm" variant="destructive" onClick={()=>handleDelete(String(p.id))} className="bg-red-500/90 hover:bg-red-600">Del</Button>
                              {String(p.id).startsWith('local-') && (
                                <Button size="sm" variant="secondary" onClick={() => retryLocalProduct(p)} className="bg-amber-100 text-amber-700 hover:bg-amber-200">Retry</Button>
                              )}
                            </td>
                          </tr>
                        );})}
                      </tbody>
                    </table>
                    <div className="flex justify-between items-center mt-4 text-xs">
                      <span>Page {page} of {totalPages}</span>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" disabled={page===1} onClick={()=>setPage(p=>p-1)} className="disabled:opacity-40">Prev</Button>
                        <Button type="button" variant="outline" size="sm" disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="disabled:opacity-40">Next</Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

  {isAdmin && activeTab === 'orders' && (
          <Card className="shadow-md border border-amber-100/70">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent tracking-tight">Orders ({filteredOrders.length})</CardTitle>
                <input
                  placeholder="Search orders..."
                  value={orderSearch}
                  onChange={e=>setOrderSearch(e.target.value)}
                  className="border rounded-md px-3 py-2 text-sm w-full md:w-64 focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <div className="text-sm text-muted-foreground py-6 text-center animate-pulse">Loading orders...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No orders yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border shadow-sm rounded-md overflow-hidden">
                    <thead className="bg-gradient-to-r from-amber-100 to-orange-100">
                      <tr className="text-left">
                        <th className="p-2 font-medium">ID</th>
                        <th className="p-2 font-medium">Date</th>
                        <th className="p-2 font-medium">Items</th>
                        <th className="p-2 font-medium">Total</th>
                        <th className="p-2 font-medium">Payment</th>
                        <th className="p-2 font-medium">Status</th>
                        <th className="p-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedOrders.map(o => (
                        <tr key={o.id} className="border-t hover:bg-amber-50/60 dark:hover:bg-neutral-800/60">
                          <td className="p-2 font-mono text-xs max-w-[120px] truncate">{o.id}</td>
                          <td className="p-2">{o.date}</td>
                          <td className="p-2">
                            <div className="space-y-1 max-w-[160px]">
                              {o.items.slice(0,3).map((it,i)=>(
                                <div key={i} className="truncate text-xs">{it.name} × {it.quantity}</div>
                              ))}
                              {o.items.length>3 && <div className="text-[10px] text-muted-foreground">+{o.items.length-3} more</div>}
                            </div>
                          </td>
                          <td className="p-2 text-emerald-600 font-semibold">৳{o.total}</td>
                          <td className="p-2 text-xs">{o.paymentMethod}</td>
                          <td className="p-2">
                            <select
                              className={`border rounded px-2 py-1 text-xs focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white/70 ${
                                o.status === 'delivered' ? 'border-green-300 bg-green-50 text-green-700' : o.status === 'confirmed' ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200'
                              }`}
                              value={o.status || 'pending'}
                              aria-label="Order status"
                              title="Order status"
                              onChange={e=>handleOrderStatus(o.id, e.target.value)}
                            >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="delivered">Delivered</option>
                            </select>
                          </td>
                          <td className="p-2 flex gap-2">
                            <Button size="sm" variant="destructive" onClick={()=>handleOrderDelete(String(o.id))} className="bg-red-500/90 hover:bg-red-600">Del</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between items-center mt-4 text-xs">
                    <span>Page {orderPage} of {totalOrderPages}</span>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" disabled={orderPage===1} onClick={()=>setOrderPage(p=>p-1)} className="disabled:opacity-40">Prev</Button>
                      <Button type="button" variant="outline" size="sm" disabled={orderPage===totalOrderPages} onClick={()=>setOrderPage(p=>p+1)} className="disabled:opacity-40">Next</Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

// ---- Backend product API helpers & utilities ----
interface BackendProduct { _id: string; name: string; price: number; oldPrice?: number; photo?: string; img?: string; description?: string; category?: string; }
async function fetchProductsAPI(base: string): Promise<Product[]> {
  const res = await fetch(`${base}/products/list`, { credentials: 'include' });
  if (!res.ok) {
    console.warn('[FetchProductsAPIError]', res.status, await res.text());
    throw new Error('Failed products');
  }
  const data: BackendProduct[] = await res.json();
  return data.map(p => ({
    id: p._id,
    name: p.name,
    price: Number(p.price) || 0,
    oldPrice: p.oldPrice || 0,
    img: p.photo || p.img || '',
    description: p.description || '',
    category: p.category || '',
    inStock: true
  }));
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, content] = dataUrl.split(',');
  const mimeMatch = /data:(.*?);base64/.exec(meta || '') || [];
  const mime = mimeMatch[1] || 'image/png';
  const bin = atob(content);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i=0;i<len;i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Compress and upload a file to Firebase Storage, return public URL
async function compressAndUpload(file: File): Promise<string> {
  try {
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1600, useWebWorker: true };
    // browser-image-compression returns a Blob; use original filename for storage path
    const compressed = await imageCompression(file, options) as Blob;
    const filename = file.name.replace(/\s+/g, '_');
    const path = `products/${Date.now()}_${filename}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, compressed);
    const url = await getDownloadURL(ref);
    return url;
  } catch (e) {
    console.warn('[CompressUploadFail]', e);
    // Fallback: create object URL so admin still sees preview (not persisted)
    return URL.createObjectURL(file);
  }
}

async function addProductAPI(base: string, product: Partial<Product>): Promise<Product> {
  const fd = new FormData();
  fd.append('name', product.name || '');
  fd.append('price', String(product.price ?? product.oldPrice ?? 0));
  if (product.oldPrice != null) fd.append('oldPrice', String(product.oldPrice));
  if (typeof product.inStock === 'boolean') fd.append('inStock', product.inStock ? 'true' : 'false');
  if (product.category) fd.append('category', product.category);
  if (product.description) fd.append('description', product.description);
  const productWithPresets = product as Partial<Product> & { presetMultipliers?: Record<string, number> };
  if (productWithPresets.presetMultipliers) fd.append('presetMultipliers', JSON.stringify(productWithPresets.presetMultipliers));
  if (product.img && product.img.startsWith('data:')) {
    fd.append('photo', dataUrlToBlob(product.img), 'upload.png');
  }
  const doRequest = async () => {
    const res = await fetch(`${base}/products/add`, { method: 'POST', credentials: 'include', body: fd });
    if (!res.ok) {
      if (res.status === 401) return { unauthorized: true } as const;
      let body = '';
      try { body = await res.text(); } catch { /* ignore */ }
      const msg = `[AddProductAPIError] status=${res.status} body=${body}`;
      console.warn(msg);
      throw new Error(msg);
    }
    const p = await res.json();
    return { product: { id: p._id, name: p.name, price: Number(p.price)||0, oldPrice: p.oldPrice||0, img: p.photo||'', description: p.description, category: p.category, inStock: p.inStock !== false } as Product } as const;
  };
  const first = await doRequest();
  if ('unauthorized' in first) {
    // attempt auto backend login then retry once
    await backendLogin();
    const second = await doRequest();
    if ('unauthorized' in second) throw new Error('[AddProductAPIError] still unauthorized after relogin');
    return second.product;
  }
  return first.product;
}

async function updateProductAPI(base: string, id: string, product: Partial<Product>): Promise<Product | null> {
  const fd = new FormData();
  if (product.name) fd.append('name', product.name);
  if (product.price != null) fd.append('price', String(product.price));
  if (product.category) fd.append('category', product.category);
  if (product.description) fd.append('description', product.description);
  if (typeof product.inStock === 'boolean') fd.append('inStock', product.inStock ? 'true' : 'false');
  if (product.img && product.img.startsWith('data:')) {
    fd.append('photo', dataUrlToBlob(product.img), 'upload.png');
  }
  if (id.startsWith('local-') || !/^[a-fA-F0-9]{24}$/.test(id)) {
    try { return await addProductAPI(base, product as Product); } catch { return null; }
  }
  const attempt = async () => {
    const res = await fetch(`${base}/products/edit/${id}`, { method: 'PUT', credentials: 'include', body: fd });
    if (!res.ok) {
      if (res.status === 401) return { unauthorized: true } as const;
      console.warn('[UpdateProductAPIError]', res.status, await res.text());
      return null;
    }
    const p = await res.json();
    return { product: { id: p._id, name: p.name, price: Number(p.price)||0, oldPrice: p.oldPrice||0, img: p.photo||'', description: p.description, category: p.category, inStock: p.inStock !== false } as Product } as const;
  };
  const first = await attempt();
  if (first && 'unauthorized' in first) {
    await backendLogin();
    const second = await attempt();
    if (second && 'product' in second) return second.product;
    return null;
  }
  if (first && 'product' in first) return first.product;
  return null;
}

async function deleteProductAPI(base: string, id: string): Promise<void> {
  // Treat locally-created or obviously invalid Mongo IDs as already deleted.
  if (id.startsWith('local-') || !/^[a-fA-F0-9]{24}$/.test(id)) {
    return; // local-only item; no server call
  }
  const res = await fetch(`${base}/products/delete/${id}`, { method: 'DELETE', credentials: 'include' });
  if (!res.ok) console.warn('[DeleteProductAPIError]', res.status, await res.text());
}

function exportProductsCSV(products: Product[]) {
  if (!products.length) return;
  const header = ['id','name','price','oldPrice','category'];
  const rows = products.map(p => [p.id,p.name,p.price,p.oldPrice,p.category||''].join(','));
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'products.csv'; a.click();
  URL.revokeObjectURL(url);
}
