import { deleteDoc, doc } from "firebase/firestore";
export async function deleteOrder(id: string) {
  await deleteDoc(doc(db, "orders", id));
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
  // Firestore will auto-generate an id, but we can add a timestamp
  const docRef = await addDoc(collection(db, "orders"), order);
  return docRef.id;
}

export async function getOrders(): Promise<Order[]> {
  const querySnapshot = await getDocs(collection(db, "orders"));
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: Number(doc.id), // or use doc.id as string if needed
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
}
