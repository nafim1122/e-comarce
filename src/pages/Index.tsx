
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { addOrder, getOrders } from '../lib/order';
import { ShoppingCart, Search, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { toast } from 'sonner';
import { Product, CartItem, Order, PaymentData } from '../types';
// localStorage is now the single source-of-truth for products at startup
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';
import HeroSection from '../components/HeroSection';
import CartModal from '../components/CartModal';
import PaymentModal from '../components/PaymentModal';
import OrderHistory from '../components/OrderHistory';
import AdminPanel from '../components/AdminPanel';
import { onProductsSnapshot } from '../lib/product';
import { getSocket } from '../lib/socket';
import LiveProductList from '../components/LiveProductList';

const Index = () => {
  // Start empty; we'll populate from backend or localStorage. This lets deletions persist (empty list allowed)
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]); // each item includes weight (g)
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const [runtimeForceLocal, setRuntimeForceLocal] = React.useState(false);
  // Feature flag: control whether Admin Panel is available (see VITE_ENABLE_ADMIN in .env)
  const enableAdmin = import.meta.env.VITE_ENABLE_ADMIN === 'true';
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Automatically allow access to admin panel when a Firebase admin user is logged in
  useEffect(() => {
    if (user && isAdmin) {
      setIsAuthenticated(true); // bypass legacy username/password form
    } else if (!user) {
      setIsAuthenticated(false); // reset on logout
    }
  }, [user, isAdmin]);

  // Keyboard shortcut: Alt + Shift + A to go to admin dashboard if admin
  // allow either firebase-admin or backend-authenticated users
  const displayAdmin = isAdmin || isAuthenticated;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        if (displayAdmin) {
          navigate('/admin-dashboard');
        } else {
          toast.error('Not authorized');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [displayAdmin, navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out');
    } catch (e) {
      toast.error('Logout failed');
    }
  };

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  // helper to resolve server-uploaded photo paths (server returns '/uploads/filename')
  const apiHost = API_BASE.replace(/\/api\/?$/, '');
  const resolvePhoto = React.useCallback((photo?: string) => {
    if (!photo) return '/placeholder.svg';
    if (/^https?:\/\//.test(photo)) return photo;
    if (photo.startsWith('/uploads')) return apiHost + photo;
    return photo;
  }, [apiHost]);
  interface BackendProduct { _id?: string; id?: string; name: string; price: number | string; oldPrice?: number | string; photo?: string; img?: string; description?: string; category?: string; inStock?: boolean; basePricePerKg?: number | string; unit?: 'kg' | 'piece'; }

  // Unified loader: seed -> realtime listener -> localStorage fallback
  useEffect(() => {
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const envForceLocal = metaEnv?.VITE_FORCE_LOCAL === 'true';
  const runtimeFlag = typeof window !== 'undefined' ? localStorage.getItem('app:forceLocal') === 'true' : false;
  setRuntimeForceLocal(runtimeFlag || envForceLocal);
  const forceLocal = envForceLocal || runtimeFlag;

    // If forcing local mode, prefer localStorage seed and skip initial server fetch.
    // Seed products from localStorage when available so admin optimistic updates
    // are visible immediately on the main page. When no saved products exist
    // start with an empty array (do not seed bundled demo products).
    try {
      const saved = localStorage.getItem('products');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed);
        } else {
          setProducts([]);
        }
      } else {
        // No saved key; start with empty list to let backend or admin seed data.
        setProducts([]);
      }
    } catch (e) {
      setProducts([]);
    }

    let unsubscribeProducts: (() => void) | undefined;

    // Attach Firestore realtime listener (authoritative). If realtime is active we will
    // *not* apply one-time API fetch results to avoid overwriting snapshot-driven updates.
    let realtimeAttached = false;
    try {
  unsubscribeProducts = onProductsSnapshot((list) => {
        realtimeAttached = true;
        if (Array.isArray(list)) {
          try { console.debug('[Index] onSnapshot received', { size: list.length, ids: list.map(p => p.id) }); } catch (e) { /* ignore */ }
          try {
            const tombKey = 'products:deleted:tombstone';
            const raw = localStorage.getItem(tombKey);
            const tomb: Record<string, number> = raw ? JSON.parse(raw) : {};
            const now = Date.now();
            const GRACE = 1000 * 60 * 2; // 2 minutes
            // filter out any product whose id is recently tombstoned
            const filtered = (list as Product[]).filter(p => {
              const t = tomb[String(p.id)];
              if (!t) return true;
              // if older than grace period, keep (tombstone expired)
              return (now - t) > GRACE;
            });
            // clean expired entries
            const cleaned: Record<string, number> = {};
            Object.keys(tomb).forEach(k => { if (now - tomb[k] <= GRACE) cleaned[k] = tomb[k]; });
            try { localStorage.setItem(tombKey, JSON.stringify(cleaned)); } catch {/* ignore */}
            // Reconciliation: if we have local-only products (tmp-/local-) try to
            // match them to incoming server docs and replace their temp IDs with
            // the server-assigned IDs to keep the UI consistent.
            // Also: detect when the server snapshot is just the bundled demo set
            // and avoid clobbering a non-demo local cache. This prevents demo
            // products from reappearing when the app falls back to a demo set.
            // No demo-snapshot detection: apply reconciliation and merges but do
            // not re-seed demo data from the bundle. Local-only items will be
            // attempted to be matched to server docs below and merged.
            try {
              const raw = localStorage.getItem('products');
              const localList: Product[] = raw ? JSON.parse(raw) : [];
              const localOnly = localList.filter(p => typeof p.id === 'string' && (String(p.id).startsWith('tmp-') || String(p.id).startsWith('local-')));
              if (localOnly.length > 0) {
                const serverByKey = new Map<string, Product>();
                // Build quick lookup by name+price
                (filtered as Product[]).forEach(sp => {
                  const key = `${String(sp.name).toLowerCase()}|${String(sp.price)}`;
                  serverByKey.set(key, sp);
                });

                let replacedAny = false;
                const patchedLocal = localList.map(lp => {
                  if (!(typeof lp.id === 'string' && (lp.id.startsWith('tmp-') || lp.id.startsWith('local-')))) return lp;
                  const key = `${String(lp.name).toLowerCase()}|${String(lp.price)}`;
                  const match = serverByKey.get(key) || null;
                  // fallback: match by name only if exact name match and unique
                  let finalMatch = match;
                  if (!finalMatch) {
                    const nameMatches = (filtered as Product[]).filter(s => String(s.name).toLowerCase() === String(lp.name).toLowerCase());
                    if (nameMatches.length === 1) finalMatch = nameMatches[0];
                  }
                  if (finalMatch) {
                    replacedAny = true;
                    // return a product object with server id and server fields
                    return { ...finalMatch } as Product;
                  }
                  return lp;
                });

                if (replacedAny) {
                  // Merge patched local items with the rest of filtered server list,
                  // avoiding duplicates (server ids take precedence)
                  const mergedById = new Map<string | number, Product>();
                  (filtered as Product[]).forEach(p => mergedById.set(String(p.id), p));
                  patchedLocal.forEach(p => mergedById.set(String(p.id), p));
                  const merged = Array.from(mergedById.values());
                  setProducts(merged);
                  try { localStorage.setItem('products', JSON.stringify(merged)); } catch {/* ignore */}
                } else {
                  setProducts(filtered);
                  try { localStorage.setItem('products', JSON.stringify(filtered)); } catch {/* ignore */}
                }
              } else {
                setProducts(filtered);
                try { localStorage.setItem('products', JSON.stringify(filtered)); } catch {/* ignore */}
              }
            } catch (e) {
              setProducts(filtered);
              try { localStorage.setItem('products', JSON.stringify(filtered)); } catch {/* ignore */}
            }
          } catch (e) {
            setProducts(list as Product[]);
            try { localStorage.setItem('products', JSON.stringify(list)); } catch {/* ignore */}
          }
        }
      });
    } catch (err) {
      console.warn('[Index] realtime products listener failed to attach', err);
    }

    // One-time fetch fallback + cart merge and local cart load
    (async () => {
      // If we're in local-only dev mode, do not call the backend API — localStorage is authoritative
      if (forceLocal) return;
      try {
        const res = await fetch(`${API_BASE}/products/list`);
        if (res.ok) {
          const data: BackendProduct[] = await res.json();
          const mapped: Product[] = data.map((p: BackendProduct) => ({
            id: p._id || p.id,
            name: p.name,
            price: Number(p.price) || 0,
            oldPrice: Number(p.oldPrice) || 0,
            img: resolvePhoto(p.photo || p.img),
            description: p.description,
            category: p.category,
            inStock: p.inStock !== false,
            basePricePerKg: p.basePricePerKg !== undefined ? Number(p.basePricePerKg) : (p.price !== undefined ? Number(p.price) : undefined),
            unit: p.unit || 'kg'
          }));
      // Merge any local-only products (created by admin while offline/local-mode)
      // to avoid losing them when a one-time API fetch completes. Do not
      // fall back to bundled demo data when the server returns an early
      // placeholder set; always prefer saved localStorage or server data.
          try {
            const ls = localStorage.getItem('products');
            if (ls) {
              const parsed = JSON.parse(ls);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const localOnly = (parsed as Product[]).filter(p => typeof p.id === 'string' && (p.id.startsWith('tmp-') || p.id.startsWith('local-')));
        // No demo detection - proceed to merge local-only items with server list.
                if (localOnly.length > 0) {
                  // Avoid duplicates: only prepend local items whose id isn't in mapped
                  const existingIds = new Set(mapped.map(m => String(m.id)));
                  const toPrepend = localOnly.filter(lp => !existingIds.has(String(lp.id)));
                  if (toPrepend.length > 0) {
                    const merged = [...toPrepend, ...mapped];
                    if (!realtimeAttached) {
                      setProducts(merged);
                      try { localStorage.setItem('products', JSON.stringify(merged)); } catch {/* ignore */}
                    }
                  } else {
                    if (!realtimeAttached) {
                      setProducts(mapped);
                      try { localStorage.setItem('products', JSON.stringify(mapped)); } catch {/* ignore */}
                    }
                  }
                } else {
                  if (!realtimeAttached) {
                    setProducts(mapped);
                    try { localStorage.setItem('products', JSON.stringify(mapped)); } catch {/* ignore */}
                  }
                }
              } else {
                if (!realtimeAttached) {
                  setProducts(mapped);
                  try { localStorage.setItem('products', JSON.stringify(mapped)); } catch {/* ignore */}
                }
              }
            } else {
              if (!realtimeAttached) {
                setProducts(mapped);
                try { localStorage.setItem('products', JSON.stringify(mapped)); } catch {/* ignore */}
              }
            }
          } catch (e) {
            if (!realtimeAttached) {
              setProducts(mapped);
              try { localStorage.setItem('products', JSON.stringify(mapped)); } catch {/* ignore */}
            }
          }
        }
      } catch {
        try {
          const saved = localStorage.getItem('products');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setProducts(parsed);
              return;
            }
          }
        } catch {/* ignore */}
      }

      // Cart merge + load
      try {
        if (user && user.uid) {
          try {
            const local = localStorage.getItem('cart');
            const localItems = local ? JSON.parse(local) as unknown : [] as unknown;
            if (Array.isArray(localItems) && localItems.length > 0) {
              type LocalItem = { productId: string; quantity: number; unit?: 'kg' | 'piece'; serverId?: string };
              const toMerge = (localItems as LocalItem[]).filter(it => !it.serverId);
              if (toMerge.length > 0) {
                const payload = toMerge.map((it) => ({ productId: it.productId, quantity: it.quantity, unit: it.unit || 'kg' }));
                const mergeRes = await fetch(`${API_BASE}/cart/merge`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: payload }) });
                if (mergeRes.ok) {
                  type ServerCartItem = { _id?: string; productId: string; quantity: number; unit: 'kg' | 'piece'; unitPriceAtTime: number; totalPriceAtTime: number };
                  const merged = await mergeRes.json() as ServerCartItem[];
                  const mapped = merged.map((it: ServerCartItem) => ({ productId: it.productId, quantity: it.quantity, unit: it.unit, unitPriceAtTime: it.unitPriceAtTime, totalPriceAtTime: it.totalPriceAtTime, serverId: it._id })) as CartItem[];
                  setCart(mapped);
                  try { localStorage.removeItem('cart'); } catch {/* ignore */}
                  return;
                }
              }
            }
            const res = await fetch(`${API_BASE}/cart/list`, { credentials: 'include' });
            if (res.ok) {
              const serverItems = await res.json() as Array<{ _id: string; productId: string; quantity: number; unit: 'kg' | 'piece'; unitPriceAtTime: number; totalPriceAtTime: number }>;
              const mapped = serverItems.map((it) => ({ productId: it.productId, quantity: it.quantity, unit: it.unit, unitPriceAtTime: it.unitPriceAtTime, totalPriceAtTime: it.totalPriceAtTime, serverId: it._id })) as CartItem[];
              setCart(mapped);
              return;
            }
          } catch (err) { /* ignore */ }
        }
      } catch (err) { /* ignore */ }

      try {
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
          const parsedCart = JSON.parse(savedCart);
          if (Array.isArray(parsedCart)) {
            const migrated = parsedCart.map((raw: Partial<CartItem>) => {
              let unitVal: 'kg'|'piece' = 'piece';
              if (raw.unit) unitVal = raw.unit;
              else if ('weight' in raw) {
                const w = (raw as unknown as Record<string, unknown>)['weight'];
                if (typeof w === 'number' && w !== 1) unitVal = 'kg';
              }
              return {
                productId: (raw.productId ?? '') as unknown as string | number,
                quantity: typeof raw.quantity === 'number' ? raw.quantity : 1,
                unit: unitVal,
                unitPriceAtTime: raw.unitPriceAtTime,
                totalPriceAtTime: raw.totalPriceAtTime,
                serverId: raw.serverId
              } as CartItem;
            });
            setCart(migrated);
          }
        }
      } catch {/* ignore */}
    })();

    getOrders().then(fetched => { if (Array.isArray(fetched)) setOrders(fetched); }).catch(()=>{});

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'products' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setProducts(parsed);
        } catch {/* ignore */}
      }
    };
    window.addEventListener('storage', onStorage);

    const localUpdateHandler = () => {
      try {
        const ls = localStorage.getItem('products');
        if (ls) {
          const parsed = JSON.parse(ls);
          if (Array.isArray(parsed)) setProducts(parsed);
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('products-local-update', localUpdateHandler);

    // Debug: log when Firestore snapshot helper dispatches a products-snapshot event
    const onProductsSnapshotEvent = (e: Event) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detail = (e as CustomEvent).detail as any;
        console.debug('[Index] products-snapshot event', detail);
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('products-snapshot', onProductsSnapshotEvent as EventListener);

    const onProductsSnapshotError = (e: Event) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detail = (e as CustomEvent).detail as any;
        const msg = detail && detail.message ? String(detail.message) : 'Realtime listener error';
        console.warn('[Index] products-snapshot-error', msg);
        setRealtimeError(msg);
      } catch (err) { /* ignore */ }
    };
    window.addEventListener('products-snapshot-error', onProductsSnapshotError as EventListener);

    const socket = getSocket();
  type SocketProduct = { _id?: string; id?: string; name: string; price: number; oldPrice?: number; photo?: string; img?: string; description?: string; category?: string; inStock?: boolean; basePricePerKg?: number; unit?: string };
    const onCreated = (p: SocketProduct) => {
      if (typeof unsubscribeProducts === 'function') return;
      setProducts(prev => {
        if (prev.some(x => x.id === (p._id || p.id))) return prev;
        const unitVal: 'kg' | 'piece' = p.unit === 'piece' ? 'piece' : 'kg';
        const newProd: Product = {
          id: p._id || p.id,
          name: p.name,
          price: p.price,
          oldPrice: p.oldPrice || 0,
          img: resolvePhoto(p.photo || p.img),
          description: p.description,
          category: p.category,
          inStock: p.inStock !== false,
          basePricePerKg: p.basePricePerKg !== undefined ? Number(p.basePricePerKg) : (p.price !== undefined ? Number(p.price) : undefined),
          unit: unitVal
        };
        const next = [newProd, ...prev];
        try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    };
    const onUpdated = (p: SocketProduct) => {
      if (typeof unsubscribeProducts === 'function') return;
      setProducts(prev => {
        const next = prev.map(x => {
          if (x.id === (p._id || p.id)) {
            const unitVal: 'kg' | 'piece' = p.unit === 'piece' ? 'piece' : (x.unit || 'kg');
            return {
              ...x,
              name: p.name,
              price: p.price,
              oldPrice: p.oldPrice || 0,
              img: resolvePhoto(p.photo || p.img) || x.img,
              description: p.description,
              category: p.category,
              inStock: p.inStock !== false,
              basePricePerKg: p.basePricePerKg !== undefined ? Number(p.basePricePerKg) : x.basePricePerKg,
              unit: unitVal
            } as Product;
          }
          return x;
        });
        try { localStorage.setItem('products', JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    };
    const onDeleted = (d: { id: string }) => {
      if (typeof unsubscribeProducts === 'function') return;
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
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('products-local-update', localUpdateHandler);
  window.removeEventListener('products-snapshot', onProductsSnapshotEvent as EventListener);
  window.removeEventListener('products-snapshot-error', onProductsSnapshotError as EventListener);
      socket.off('product:created', onCreated);
      socket.off('product:updated', onUpdated);
      socket.off('product:deleted', onDeleted);
      if (typeof unsubscribeProducts === 'function') unsubscribeProducts();
    };
  }, [API_BASE, user, resolvePhoto]);

  // Save to localStorage when state changes
  useEffect(() => {
  try { localStorage.setItem('products', JSON.stringify(products)); } catch {/* ignore */}
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

  const addToCart = async (productId: number | string, quantityOrWeight: number = 1, unit: 'kg' | 'piece' = 'kg') => {
    // For frontend-only demo, handle locally with fallback to backend
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast.error('Product not found');
      return;
    }

    // Calculate price locally
    const unitPrice = unit === 'kg' ? (product.basePricePerKg || product.price) : product.price;
    const totalPrice = unitPrice * quantityOrWeight;

    try {
      // Try backend first (optional)
      const payload = { productId, quantity: quantityOrWeight, unit };
      const res = await fetch(`${API_BASE}/cart/add`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        const created = await res.json();
        // Use backend response if available
        // Normalize created response
        const createdProductId = created.productId !== undefined ? String(created.productId) : String(productId);
        const createdQuantity = typeof created.quantity === 'number' ? created.quantity : quantityOrWeight;
        const createdUnit = created.unit || unit;
        const createdUnitPrice = typeof created.unitPriceAtTime === 'number' ? created.unitPriceAtTime : unitPrice;
        const createdTotalPrice = typeof created.totalPriceAtTime === 'number' ? created.totalPriceAtTime : Math.round(createdUnitPrice * createdQuantity * 100) / 100;

        const keyMatch = (it: CartItem) => String(it.productId) === String(createdProductId) && it.unit === createdUnit;
        const existing = cart.find(keyMatch);
        let updatedCart: CartItem[];
        if (existing) {
          updatedCart = cart.map(it => keyMatch(it) ? { ...it, quantity: it.quantity + createdQuantity, unitPriceAtTime: createdUnitPrice, totalPriceAtTime: (it.totalPriceAtTime || 0) + createdTotalPrice } : it);
          setCart(updatedCart);
        } else {
          const toPush: CartItem = { productId: createdProductId, quantity: createdQuantity, unit: createdUnit as 'kg'|'piece', unitPriceAtTime: createdUnitPrice, totalPriceAtTime: createdTotalPrice, serverId: created._id };
          updatedCart = [...cart, toPush];
          setCart(updatedCart);
        }
        // Persist immediately so tests and other contexts can observe the new cart without waiting for React effect
        try { localStorage.setItem('cart', JSON.stringify(updatedCart)); } catch {/* ignore */}
        toast.success('Product added to cart!');
        return;
      }
    } catch (e) {
      // Backend failed, continue with local handling
    }

    // Local cart handling (frontend-only fallback)
    const keyMatch = (it: CartItem) => String(it.productId) === String(productId) && it.unit === unit;
    const existing = cart.find(keyMatch);
    
    if (existing) {
      const updated = cart.map(it => keyMatch(it) ? { 
        ...it, 
        quantity: it.quantity + quantityOrWeight,
        unitPriceAtTime: unitPrice,
        totalPriceAtTime: (it.totalPriceAtTime || 0) + totalPrice
      } : it);
      setCart(updated);
      try { localStorage.setItem('cart', JSON.stringify(updated)); } catch {/* ignore */}
    } else {
      const newItem: CartItem = { 
        productId, 
        quantity: quantityOrWeight, 
        unit, 
        unitPriceAtTime: unitPrice,
        totalPriceAtTime: totalPrice
      };
      const next = [...cart, newItem];
      setCart(next);
      try { localStorage.setItem('cart', JSON.stringify(next)); } catch {/* ignore */}
    }
    toast.success('Product added to cart!');
  };

  const updateCartQuantity = (productId: number | string, quantity: number, unit?: 'kg'|'piece') => {
    if (quantity <= 0) {
      removeFromCart(productId, unit);
      return;
    }
    setCart(cart.map(item =>
      item.productId === productId && (unit ? item.unit === unit : true)
        ? { ...item, quantity }
        : item
    ));
  };

  const removeFromCart = (productId: number | string, unit?: 'kg'|'piece') => {
    // If authenticated, attempt server-side delete for this product+unit match
    const item = cart.find(it => it.productId === productId && (unit ? it.unit === unit : true));
    if (item && user && user.uid) {
      (async () => {
        try {
          // If we have a serverId for this item, delete directly
          if (item.serverId) {
            await fetch(`${API_BASE}/cart/delete/${item.serverId}`, { method: 'DELETE', credentials: 'include' });
          } else {
            const res = await fetch(`${API_BASE}/cart/list`, { credentials: 'include' });
            if (res.ok) {
              const serverItems = await res.json();
              const match = serverItems.find((si: { _id: string; productId: string; quantity: number; unit: string }) => String(si.productId) === String(productId) && si.unit === item.unit && Number(si.quantity) === Number(item.quantity));
              if (match) await fetch(`${API_BASE}/cart/delete/${match._id}`, { method: 'DELETE', credentials: 'include' });
            }
          }
        } catch (e) { /* ignore */ }
      })();
    }
  setCart(cart.filter(it => !(it.productId === productId && (unit ? it.unit === unit : true))));
    toast.info('Product removed from cart');
  };

  const clearCart = () => {
    setCart([]);
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      if (item.totalPriceAtTime !== undefined) return total + item.totalPriceAtTime;
      const product = products.find(p => p.id === item.productId);
      if (!product) return total;
  const unitPrice = item.unit === 'kg' ? (product.basePricePerKg ?? product.price) : (product.price ?? 0);
  const qty = item.quantity;
  return total + unitPrice * qty;
    }, 0);
  };

  const getCartItemCount = () => cart.reduce((total, item) => total + item.quantity, 0);

  const handleOrderComplete = async (paymentData: PaymentData) => {
    const orderItems = cart.map(item => {
      const product = products.find(p => p.id === item.productId);
      const basePrice = product?.price || 0;
      // If unit is kg and we want to include per-line weight, compute grams for backward compatibility
      const weightGrams = item.unit === 'kg' ? Math.round(item.quantity * 1000) : 1;
      const pricePerUnit = item.unit === 'kg' ? basePrice : basePrice;
      return {
        name: product?.name || 'Unknown Product',
        quantity: item.quantity,
        price: pricePerUnit,
        weight: weightGrams
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
      // Send to server to create authoritative order (server recomputes totals)
      const res = await fetch(`${API_BASE}/orders/create`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: cart.map(it => ({ productId: it.productId, quantity: it.quantity, unit: it.unit })), paymentMethod: paymentData.paymentMethod, transactionId: paymentData.transactionId, address: paymentData.address, phone: paymentData.phone }) });
      if (res.ok) {
        const body = await res.json();
        setOrders([...orders, { id: body.id, date: new Date().toLocaleDateString('en-GB'), items: body.items, total: body.total, paymentMethod: paymentData.paymentMethod, transactionId: paymentData.transactionId, address: paymentData.address, phone: paymentData.phone, status: 'pending' }]);
        toast.success('Order placed successfully!');
      } else {
        // Fallback to client-side Firestore order persistence
        const id = await addOrder(newOrder);
        setOrders([...orders, { id, ...newOrder }]);
        toast.success('Order placed (offline fallback)');
      }
    } catch (error) {
      console.error('[OrderCreateFail]', error);
      try {
        const id = await addOrder(newOrder);
        setOrders([...orders, { id, ...newOrder }]);
        toast.success('Order placed (fallback)');
      } catch (e) {
        toast.error('Error saving order to database');
      }
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

  const handleAdminLogin = async (credentials: { username: string; password: string }) => {
    // Try backend login first
    const sanitizedUsername = sanitizeInput(credentials.username);
    const sanitizedPassword = sanitizeInput(credentials.password);
    const backendEmail = sanitizedUsername;
    const backendPassword = sanitizedPassword;
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: backendEmail, password: backendPassword })
      });
      if (res.ok) {
        setIsAuthenticated(true);
        toast.success('Admin login successful');
        return;
      }
    } catch (err) {
      // ignore, fallback to legacy
    }
    // Fallback to legacy env credentials
    const legacyUser = (import.meta.env.VITE_LEGACY_ADMIN_USER || 'rahat').toLowerCase();
    const legacyPass = import.meta.env.VITE_LEGACY_ADMIN_PASS || 'rahat22';
    if (sanitizedUsername.toLowerCase() === legacyUser && sanitizedPassword === legacyPass) {
      setIsAuthenticated(true);
      toast.success('Admin login successful (legacy)');
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
              {(isAdmin || isAuthenticated) && (
                <Link
                  to="/admin-dashboard"
                  className="text-gray-700 hover:text-amber-600 font-semibold transition-colors"
                >
                  Dashboard
                </Link>
              )}
              {!user && (
                <>
                  <Link
                    to="/login"
                    className="text-gray-600 hover:text-amber-600 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="text-gray-600 hover:text-amber-600 transition-colors"
                  >
                    Register
                  </Link>
                </>
              )}
              {user && (
                <button
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-red-600 transition-colors"
                >
                  Logout
                </button>
              )}
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

            {/* Auth links (Login/Register/Dashboard/Logout) hidden as requested */}

            {/* Cart and Mobile Menu */}
            <div className="flex items-center space-x-4 ml-4">
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
              {(isAdmin || isAuthenticated) && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); navigate('/admin-dashboard'); }}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                >
                  Dashboard
                </button>
              )}
              {!user && (
                <>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
                    className="w-full text-left px-3 py-2 text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
                    className="w-full text-left px-3 py-2 text-gray-700 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                  >
                    Register
                  </button>
                </>
              )}
              {user && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </nav>
      {/* LOCAL MODE badge */}
      {runtimeForceLocal && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3">
          <div className="inline-flex items-center gap-3 rounded-md bg-yellow-50 border border-yellow-200 px-3 py-2 text-yellow-800 text-sm">
            <strong className="text-sm">LOCAL MODE</strong>
            <span className="text-xs">Using localStorage for products (dev only)</span>
          </div>
        </div>
      )}

      {/* Realtime error banner (dismissible) */}
      {realtimeError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="rounded-md bg-red-100 border border-red-200 text-red-800 p-3 flex items-start justify-between">
            <div>
              <strong className="block">Realtime sync issue</strong>
              <div className="text-sm">{realtimeError}. The site will continue using local cache until this is resolved.</div>
            </div>
            <div className="ml-4">
              <button onClick={() => setRealtimeError(null)} className="text-red-700 hover:text-red-900 font-semibold">Dismiss</button>
            </div>
          </div>
        </div>
      )}

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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Product grid (full width) */}
            <div className="col-span-1 md:col-span-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => (
                      <div key={product.id} id={`product-${product.id}`} className="w-full min-w-0">
                        <ProductCard
                          product={product}
                          onAddToCart={(quantity, unit) => addToCart(product.id, quantity, unit)}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Example live-list (separate component) */}
                  <div className="mt-8">
                    <LiveProductList />
                  </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No products found</p>
                </div>
              )}
            </div>
          </div>
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

      {enableAdmin && (
        <AdminPanel
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          products={products}
          orders={orders}
          onLogin={handleAdminLogin}
          isAuthenticated={isAuthenticated}
          updateProducts={setProducts}
          updateOrders={setOrders}
        />
      )}
    </div>
  );
};

export default Index;
