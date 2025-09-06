import React, { useEffect, useState } from "react";
import { getOrders } from "../lib/order";
import { Order } from "../types";
import "./OrderList.css";

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    getOrders().then(setOrders);
  }, []);

  return (
  <div className="order-list-container">
      <h2>Order List</h2>
      <ul>
        {orders.map((order, idx) => (
          <li key={idx}>
            User: {order.userId}, Total: {order.total}, Items: {order.items?.map(item => item.name).join(", ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
