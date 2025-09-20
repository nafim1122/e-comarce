import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, DocumentData, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Product } from '../types';
import { getSocket } from './socket';

const productsCollection = () => collection(db, 'products');

export async function addProduct(product: Partial<Product>) {
  try {
    const toSave = {
      ...product,
      price: Number(product.price) || 0,
      oldPrice: Number(product.oldPrice) || 0,
      inStock: product.inStock !== false,
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(productsCollection(), toSave as DocumentData);
    const newProduct = { id: ref.id, ...(toSave as unknown as Product) } as Product;
    
    // Notify clients about the new product
    try {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('product-update', { type: 'add', product: newProduct });
      }
    } catch (socketErr) {
      console.warn('[addProduct] Socket notification failed:', socketErr);
      // Continue even if socket notification fails
    }
    
    return newProduct;
  } catch (err) {
    console.error('[addProduct]', err);
    throw err;
  }
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  try {
    const docRef = doc(db, 'products', id);
    await updateDoc(docRef, { ...(updates as DocumentData), updatedAt: serverTimestamp() });
    const snap = await getDoc(docRef);
    const updatedProduct = { id: snap.id, ...(snap.data() || {}) } as Product;
    
    // Notify clients about the updated product
    try {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('product-update', { type: 'update', product: updatedProduct });
      }
    } catch (socketErr) {
      console.warn('[updateProduct] Socket notification failed:', socketErr);
      // Continue even if socket notification fails
    }
    
    return updatedProduct;
  } catch (err) {
    console.error('[updateProduct]', err);
    throw err;
  }
}

export async function deleteProduct(id: string) {
  try {
    await deleteDoc(doc(db, 'products', id));
    
    // Notify clients about the deleted product
    try {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('product-update', { type: 'delete', productId: id });
      }
    } catch (socketErr) {
      console.warn('[deleteProduct] Socket notification failed:', socketErr);
      // Continue even if socket notification fails
    }
    
    return true;
  } catch (err) {
    console.error('[deleteProduct]', err);
    throw err;
  }
}

export async function fetchProducts(): Promise<Product[]> {
  try {
    const q = query(productsCollection(), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) })) as unknown as Product[];
  } catch (err) {
    console.error('[fetchProducts]', err);
    throw err;
  }
}

export function listenProducts(onChange: (items: Product[]) => void, onError?: (e: Error) => void) {
  try {
    // First try to get products from local storage as fallback
    if (typeof window !== 'undefined') {
      try {
        const localProducts = localStorage.getItem('products');
        if (localProducts) {
          const parsedProducts = JSON.parse(localProducts) as Product[];
          onChange(parsedProducts);
        }
      } catch (localErr) {
        console.warn('[listenProducts] Failed to load from localStorage:', localErr);
      }
    }
    
    // Set up Firestore listener with simple retry/backoff on errors
    const q = query(productsCollection(), orderBy('createdAt', 'desc'));
    let retryAttempts = 0;
    const maxRetries = 3;
    const baseDelay = 2000; // ms
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let unsub: (() => void) | null = null;

    const setupListener = () => {
      try {
        unsub = onSnapshot(q, snap => {
          const items: Product[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) })) as unknown as Product[];

          // Update localStorage for offline fallback
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('products', JSON.stringify(items));
            } catch (localErr) {
              console.warn('[listenProducts] Failed to save to localStorage:', localErr);
            }
          }
          // reset retry attempts on successful snapshot
          retryAttempts = 0;
          onChange(items);
        }, e => {
          console.error('[listenProducts] snapshot error', e);
          if (onError) onError(e);

          // Fallback to cached products if available
          if (typeof window !== 'undefined') {
            try {
              const localProducts = localStorage.getItem('products');
              if (localProducts) {
                onChange(JSON.parse(localProducts) as Product[]);
              }
            } catch (localErr) {
              console.warn('[listenProducts] Failed to load from localStorage on error:', localErr);
            }
          }

          // schedule a retry with exponential backoff
          if (retryAttempts < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryAttempts);
            retryTimer = setTimeout(() => {
              retryAttempts += 1;
              setupListener();
            }, delay);
          }
        });
      } catch (err) {
        console.error('[listenProducts] setup error', err);
        if (onError) onError(err as Error);
      }
    };

    setupListener();

    // Return a cleanup function that clears timers and unsubscribes
    return () => {
      try {
        if (unsub) unsub();
      } catch (e) {
        // ignore
      }
      if (retryTimer) clearTimeout(retryTimer);
    };
  } catch (err) {
    console.error('[listenProducts] setup error', err);
    if (onError) onError(err);
    return () => {};
  }
}

export async function getProduct(id: string) {
  try {
    const snap = await getDoc(doc(db, 'products', id));
    if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as DocumentData) } as unknown as Product;
  } catch (err) {
    console.error('[getProduct]', err);
    throw err;
  }
}
