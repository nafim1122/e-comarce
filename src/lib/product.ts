// Product record functions using Firestore
import { db } from "./firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { Product } from "../types";

interface FirestoreProduct {
  name?: string;
  price?: number | string;
  oldPrice?: number | string;
  img?: string;
  photo?: string;
  description?: string;
  category?: string;
  inStock?: boolean;
  basePricePerKg?: number | string;
  unit?: string;
}

export async function addProduct(product: Omit<Product, "id">) {
  // Dev/test fallback: allow disabling Firestore via VITE_FORCE_LOCAL env var
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const forceLocal = metaEnv?.VITE_FORCE_LOCAL === 'true';
  if (typeof window !== 'undefined' && forceLocal) {
    try {
      const key = 'products';
      const raw = localStorage.getItem(key);
      const list: Product[] = raw ? JSON.parse(raw) : [];
      const id = `local-${Date.now()}-${Math.floor(Math.random()*10000)}`;
      const item: Product = { id, ...product } as Product;
      const next = [item, ...list];
      localStorage.setItem(key, JSON.stringify(next));
      try { window.dispatchEvent(new Event('products-local-update')); } catch(e) { /* ignore */ }
      return id;
    } catch (e) {
      // Continue to Firestore path if something fails
    }
  }
  // Firestore rejects undefined values — strip them out before writing.
  const payload: Record<string, unknown> = { createdAt: Date.now() };
  Object.keys(product).forEach((k) => {
    const val = (product as Record<string, unknown>)[k];
    if (val !== undefined) payload[k] = val;
  });
  const docRef = await addDoc(collection(db, "products"), payload);
  return docRef.id;
}

export async function getProducts(): Promise<Product[]> {
  // Dev/test fallback when Firestore disabled
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const forceLocal = metaEnv?.VITE_FORCE_LOCAL === 'true';
  if (typeof window !== 'undefined' && forceLocal) {
    try {
      const raw = localStorage.getItem('products');
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) return parsed as Product[];
    } catch (e) { /* ignore */ }
    return [];
  }
  // Order by createdAt descending to show newest first (fallback to name if not present)
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data() as FirestoreProduct;
    return {
      id: docSnap.id,
      name: data.name || '',
      price: data.price !== undefined ? Number(data.price) : 0,
      oldPrice: data.oldPrice !== undefined ? Number(data.oldPrice) : 0,
      img: data.photo || data.img || '',
      description: data.description || '',
      category: data.category,
      inStock: data.inStock !== false,
      basePricePerKg: data.basePricePerKg !== undefined ? Number(data.basePricePerKg) : undefined,
      unit: (data.unit as 'kg'|'piece') || 'kg'
    } as Product;
  });
}

// Alias for clarity: fetchProducts is a one-time read
export async function fetchProducts(): Promise<Product[]> {
  return getProducts();
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const forceLocal = metaEnv?.VITE_FORCE_LOCAL === 'true';
  if (typeof window !== 'undefined' && forceLocal) {
    try {
      const key = 'products';
      const raw = localStorage.getItem(key);
      const list: Product[] = raw ? JSON.parse(raw) : [];
      const next = list.map(p => p.id === id ? { ...p, ...updates } : p);
      localStorage.setItem(key, JSON.stringify(next));
      try { window.dispatchEvent(new Event('products-local-update')); } catch(e) { /* ignore */ }
      return;
    } catch (e) { /* ignore and fallthrough */ }
  }
  await updateDoc(doc(db, "products", id), updates);
}

export async function deleteProduct(id: string) {
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const forceLocal = metaEnv?.VITE_FORCE_LOCAL === 'true';
  if (typeof window !== 'undefined' && forceLocal) {
    try {
      const key = 'products';
      const raw = localStorage.getItem(key);
      const list: Product[] = raw ? JSON.parse(raw) : [];
      const next = list.filter(p => String(p.id) !== String(id));
      localStorage.setItem(key, JSON.stringify(next));
      try { window.dispatchEvent(new Event('products-local-update')); } catch(e) { /* ignore */ }
      return;
    } catch (e) { /* ignore and fallthrough */ }
  }
  await deleteDoc(doc(db, "products", id));
}

// Subscribe to realtime updates for products collection with retry logic.
// Returns an unsubscribe function.
export function onProductsSnapshot(cb: (products: Product[]) => void, maxRetries: number = 3) {
  const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const forceLocal = metaEnv?.VITE_FORCE_LOCAL === 'true';
  if (typeof window !== 'undefined' && forceLocal) {
    try {
      const raw = localStorage.getItem('products');
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed as Product[] : [];
      // notify caller immediately with local cache
      setTimeout(() => cb(list), 0);
      // also dispatch products-snapshot event for parity with Firestore
      try { window.dispatchEvent(new CustomEvent('products-snapshot', { detail: { size: list.length, ids: list.map(p => p.id) } })); } catch(e) { /* ignore */ }
    } catch (e) { /* ignore */ }
    // return noop unsubscribe
    return () => {};
  }

  let retryCount = 0;
  let unsubscribe: (() => void) | undefined;

  const attachListener = () => {
    try {
      const colRef = collection(db, 'products');
      console.debug('[onProductsSnapshot] attaching listener to products collection (attempt', retryCount + 1, ')');
      
      unsubscribe = onSnapshot(colRef, (snapshot) => {
        const list: Product[] = snapshot.docs.map(d => {
          const data = d.data() as FirestoreProduct;
          return {
            id: d.id,
            name: data.name || '',
            price: data.price !== undefined ? Number(data.price) : 0,
            oldPrice: data.oldPrice !== undefined ? Number(data.oldPrice) : 0,
            img: data.photo || data.img || '',
            description: data.description || '',
            category: data.category,
            inStock: data.inStock !== false,
            basePricePerKg: data.basePricePerKg !== undefined ? Number(data.basePricePerKg) : undefined,
            unit: (data.unit as 'kg'|'piece') || 'kg'
          } as Product;
        });
        
        try {
          // lightweight debug output to help diagnose realtime delivery
          console.debug('[onProductsSnapshot] received', { size: snapshot.size, ids: snapshot.docs.map(d => d.id) });
          // Clear any previous error state on successful data
          if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
            try { 
              window.dispatchEvent(new CustomEvent('products-snapshot', { detail: { size: snapshot.size, ids: snapshot.docs.map(d => d.id) } })); 
              window.dispatchEvent(new CustomEvent('products-snapshot-success'));
            } catch(e) { /* ignore */ }
          }
        } catch (e) { /* ignore */ }
        cb(list);
      }, (err) => {
        console.error('[onProductsSnapshot] listener error', err);
        const errorMessage = err && (err as Error).message ? (err as Error).message : String(err);
        
        // Check if it's a permission error or auth error
        const isPermissionError = errorMessage.includes('permission') || 
                                 errorMessage.includes('PERMISSION_DENIED') ||
                                 errorMessage.includes('insufficient permissions') ||
                                 errorMessage.includes('Missing or insufficient permissions');
        
        const isAuthError = errorMessage.includes('auth') || 
                           errorMessage.includes('unauthenticated') ||
                           errorMessage.includes('authentication required');

        // Determine user-friendly error message
        let userMessage = 'Connection error';
        if (isPermissionError) {
          userMessage = 'Missing or insufficient permissions';
        } else if (isAuthError) {
          userMessage = 'Authentication required';
        }

        // Retry logic for transient errors (not permission errors)
        if (!isPermissionError && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          console.log(`[onProductsSnapshot] retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
          setTimeout(attachListener, delay);
          return;
        }

        // Dispatch error event for UI handling
        try {
          if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
            try { 
              window.dispatchEvent(new CustomEvent('products-snapshot-error', { 
                detail: { 
                  message: userMessage,
                  originalError: errorMessage,
                  isPermissionError,
                  isAuthError,
                  retryExhausted: retryCount >= maxRetries
                } 
              })); 
            } catch(e) { /* ignore */ }
          }
        } catch (e) { /* ignore */ }
      });
      
      return unsubscribe;
    } catch (err) {
      console.error('[onProductsSnapshot] failed to attach listener', err);
      const errorMessage = err && (err as Error).message ? (err as Error).message : String(err);
      
      // Retry for setup errors too
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[onProductsSnapshot] retrying setup in ${delay}ms`);
        setTimeout(attachListener, delay);
        return () => {};
      }

      // Dispatch setup error
      try {
        if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
          try { 
            window.dispatchEvent(new CustomEvent('products-snapshot-error', { 
              detail: { 
                message: 'Failed to connect to realtime sync',
                originalError: errorMessage,
                setupError: true,
                retryExhausted: true
              } 
            })); 
          } catch(e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
      
      return () => {};
    }
  };

  // Start the initial connection attempt
  attachListener();

  // Return unsubscribe function
  return () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = undefined;
    }
  };
}

// Note: removed dev-only global helpers to avoid leaking test helpers into production.
// If you need similar helpers for CI/testing, prefer exposing them via Playwright fixtures
// or a dedicated test-only module loaded by the test runner.
