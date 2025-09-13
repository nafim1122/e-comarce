import { deleteDoc, doc, updateDoc } from "firebase/firestore";
interface LocalOrder { id: string; status?: string; [k: string]: unknown }
export async function deleteOrder(id: string) {
  try {
    await deleteDoc(doc(db, "orders", id));
  } catch (e) {
    console.error('[DeleteOrderError]', e);
    // Also remove from local fallback storage if present
    try {
      const ls = localStorage.getItem('orders');
      if (ls) {
  const arr: LocalOrder[] = JSON.parse(ls).filter((o: LocalOrder) => o.id !== id);
        localStorage.setItem('orders', JSON.stringify(arr));
      }
    } catch {/* ignore */}
  }
}

export async function updateOrderStatus(id: string, status: string) {
  try {
    await updateDoc(doc(db, "orders", id), { status });
  } catch (e) {
    console.error('[UpdateOrderStatusError]', e);
    // Fallback: update local cached orders
    try {
      const ls = localStorage.getItem('orders');
      if (ls) {
  const arr: LocalOrder[] = JSON.parse(ls).map((o: LocalOrder) => o.id === id ? { ...o, status } : o);
        localStorage.setItem('orders', JSON.stringify(arr));
      }
    } catch {/* ignore */}
  }
}
// Example usage:
// import { addOrder, getOrders } from "./order";
//
// async function demo() {
//   await addOrder({
//     date: new Date().toLocaleDateString('en-GB'),
//     items: [{ name: "Green Tea", quantity: 2, price: 100 }],
//     total: 200,
//     paymentMethod: "card",
//     status: "pending",
//   });
//   const orders = await getOrders();
//   console.log(orders);
// }
// Order record functions using Firestore
import { db } from "./firebase";
import { collection, addDoc, getDocs } from "firebase/firestore";
import { Order } from "../types";

export async function addOrder(order: Omit<Order, "id">) {
  try {
    const docRef = await addDoc(collection(db, "orders"), order);
    return docRef.id;
  } catch (e) {
    console.error('[AddOrderError]', e);
    // Fallback: persist locally so UI still shows the order
    try {
      const tempId = 'local-' + Date.now();
      const ls = localStorage.getItem('orders');
      const arr = ls ? JSON.parse(ls) : [];
      arr.push({ id: tempId, ...order });
      localStorage.setItem('orders', JSON.stringify(arr));
      return tempId;
    } catch {
      // give up
    }
    throw e; // rethrow so caller can surface error toast
  }
}

export async function getOrders(): Promise<Order[]> {
  try {
    const querySnapshot = await getDocs(collection(db, "orders"));
    return querySnapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        date: data.date || data.createdAt || "",
        items: data.items || [],
        total: data.total || 0,
        paymentMethod: data.paymentMethod || "",
        transactionId: data.transactionId,
        address: data.address,
        phone: data.phone,
        status: data.status,
        userId: data.userId
      };
    });
  } catch (e) {
    console.error('[GetOrdersError]', e);
    // Fallback to localStorage
    try {
      const ls = localStorage.getItem('orders');
      if (ls) {
        const arr = JSON.parse(ls);
        if (Array.isArray(arr)) return arr as Order[];
      }
    } catch {/* ignore */}
    return [];
  }
}
