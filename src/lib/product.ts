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

// Subscribe to realtime updates for products collection.
// Returns an unsubscribe function.
export function onProductsSnapshot(cb: (products: Product[]) => void) {
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
  try {
  const colRef = collection(db, 'products');
  console.debug('[onProductsSnapshot] attaching listener to products collection');
  const unsub = onSnapshot(colRef, (snapshot) => {
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
        try {
          // notify other in-page listeners for easier debugging
          if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
            try { window.dispatchEvent(new CustomEvent('products-snapshot', { detail: { size: snapshot.size, ids: snapshot.docs.map(d => d.id) } })); } catch(e) { /* ignore */ }
          }
        } catch(e) {
          /* ignore */
        }
      } catch (e) { /* ignore */ }
      cb(list);
    }, (err) => {
      console.error('[onProductsSnapshot] listener error', err);
      try {
        if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
          try { window.dispatchEvent(new CustomEvent('products-snapshot-error', { detail: { message: String(err && (err as Error).message ? (err as Error).message : err) } })); } catch(e) { /* ignore */ }
        }
      } catch (e) { /* ignore */ }
    });
    return unsub;
  } catch (err) {
    console.error('[onProductsSnapshot] failed to attach listener', err);
    return () => {};
  }
}

// Note: removed dev-only global helpers to avoid leaking test helpers into production.
// If you need similar helpers for CI/testing, prefer exposing them via Playwright fixtures
// or a dedicated test-only module loaded by the test runner.
