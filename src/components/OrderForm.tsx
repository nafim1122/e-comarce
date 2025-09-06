import React, { useState } from "react";
import "./OrderForm.css";
import { addOrder } from "../lib/order";

export default function OrderForm() {
  const [userId, setUserId] = useState("");
  const [items, setItems] = useState("");
  const [total, setTotal] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addOrder({
        userId,
        items: items.split(",").map(item => ({ name: item.trim(), quantity: 1, price: 0 })),
        total: parseFloat(total),
        date: new Date().toISOString(),
        paymentMethod: "cash"
      });
      setStatus("Order added!");
    } catch (err) {
      setStatus("Error adding order");
    }
  };

  return (
  <form onSubmit={handleSubmit} className="order-form-container">
      <h2>Add Order</h2>
      <input placeholder="User ID" value={userId} onChange={e => setUserId(e.target.value)} required />
      <input placeholder="Items (comma separated)" value={items} onChange={e => setItems(e.target.value)} required />
      <input placeholder="Total" type="number" value={total} onChange={e => setTotal(e.target.value)} required />
      <button type="submit">Add Order</button>
      <div>{status}</div>
    </form>
  );
}
