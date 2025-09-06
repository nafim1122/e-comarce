import "./OrderDemo.css";
import React, { useEffect, useState } from "react";
import { addOrder, getOrders } from "../lib/order";

export default function OrderDemo() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    getOrders().then(setOrders);
  }, []);

  const handleAddOrder = async () => {
    await addOrder({
      date: new Date().toLocaleDateString('en-GB'),
      items: [{ name: "Green Tea", quantity: 2, price: 100 }],
      total: 200,
      paymentMethod: "card",
      status: "pending" as const,
    });
    setStatus("Order added!");
    setOrders(await getOrders());
  };

  return (
  <div className="order-demo-container">
      <h2>Order Demo</h2>
      <button onClick={handleAddOrder}>Add Demo Order</button>
      <div>{status}</div>
      <ul>
        {orders.map((order, idx) => (
          <li key={idx}>{order.date} - {order.total} - {order.paymentMethod}</li>
        ))}
      </ul>
    </div>
  );
}
