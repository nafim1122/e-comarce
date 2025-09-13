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

export function listenProducts(onChange: (items: Product[]) => void, onError?: (e: Error) => void) {
  try {
    const q = query(productsCollection(), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
  const items: Product[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) })) as unknown as Product[];
      onChange(items);
    }, e => {
      console.error('[listenProducts] snapshot error', e);
      if (onError) onError(e);
    });
    return unsub;
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
