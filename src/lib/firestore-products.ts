import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, DocumentData } from 'firebase/firestore';
import { db } from './firebase';
import type { Product } from '../types';

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
  return { id: ref.id, ...(toSave as unknown as Product) } as Product;
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
    return { id: snap.id, ...(snap.data() || {}) } as Product;
  } catch (err) {
    console.error('[updateProduct]', err);
    throw err;
  }
}

export async function deleteProduct(id: string) {
  try {
    await deleteDoc(doc(db, 'products', id));
    return true;
  } catch (err) {
    console.error('[deleteProduct]', err);
    throw err;
  }
}

export function listenProducts(onChange: (items: Product[]) => void, onError?: (e: Error) => void, maxRetries: number = 3) {
  let retryCount = 0;
  let unsubscribe: (() => void) | undefined;

  const attachListener = () => {
    try {
      const q = query(productsCollection(), orderBy('createdAt', 'desc'));
      console.debug('[listenProducts] attaching listener (attempt', retryCount + 1, ')');
      
      unsubscribe = onSnapshot(q, snap => {
        const items: Product[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) })) as unknown as Product[];
        onChange(items);
        
        // Clear any previous error state on successful data
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('products-snapshot-success'));
        }
      }, e => {
        console.error('[listenProducts] snapshot error', e);
        const errorMessage = e && (e as Error).message ? (e as Error).message : String(e);
        
        // Check if it's a permission error
        const isPermissionError = errorMessage.includes('permission') || 
                                 errorMessage.includes('PERMISSION_DENIED') ||
                                 errorMessage.includes('insufficient permissions');
        
        // Don't retry permission errors, but retry transient connection issues
        if (!isPermissionError && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
          console.log(`[listenProducts] retrying in ${delay}ms (attempt ${retryCount}/${maxRetries})`);
          setTimeout(attachListener, delay);
          return;
        }

        if (onError) onError(e);
      });
      
      return unsubscribe;
    } catch (err) {
      console.error('[listenProducts] setup error', err);
      
      // Retry setup errors too
      if (retryCount < maxRetries) {
        retryCount++;
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`[listenProducts] retrying setup in ${delay}ms`);
        setTimeout(attachListener, delay);
        return () => {};
      }

      if (onError) onError(err as Error);
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
