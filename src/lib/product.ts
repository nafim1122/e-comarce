// Product record functions using Firestore
import { db } from "./firebase";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { Product } from "../types";

export async function addProduct(product: Omit<Product, "id">) {
  const docRef = await addDoc(collection(db, "products"), product);
  return docRef.id;
}

export async function getProducts(): Promise<Product[]> {
  const querySnapshot = await getDocs(collection(db, "products"));
  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: Number(docSnap.id),
      name: data.name,
      price: data.price,
      oldPrice: data.oldPrice,
      img: data.img,
      description: data.description,
      category: data.category,
      inStock: data.inStock,
    };
  });
}

export async function updateProduct(id: string, updates: Partial<Product>) {
  await updateDoc(doc(db, "products", id), updates);
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, "products", id));
}
