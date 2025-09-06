import "./AdminPanelDashboard.css";
import React, { useEffect, useState } from "react";
import { getProducts, addProduct, updateProduct, deleteProduct } from "../lib/product";
import { getOrders, deleteOrder } from "../lib/order";
import { Product, Order } from "../types";

export default function AdminPanelDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({ name: "", price: "", oldPrice: "", img: "", description: "", category: "", inStock: true });
  const [editId, setEditId] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    getProducts().then(setProducts);
    getOrders().then(setOrders);
  }, []);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = { ...form, price: Number(form.price), oldPrice: Number(form.oldPrice) };
    if (editId) {
      await updateProduct(editId, productData);
      setStatus("Product updated!");
    } else {
      await addProduct(productData);
      setStatus("Product added!");
    }
    setForm({ name: "", price: "", oldPrice: "", img: "", description: "", category: "", inStock: true });
    setEditId(null);
    setProducts(await getProducts());
  };

  const handleEdit = (product: Product) => {
    setEditId(String(product.id));
    setForm({
      name: product.name,
      price: String(product.price),
      oldPrice: String(product.oldPrice),
      img: product.img || "",
      description: product.description || "",
      category: product.category || "",
      inStock: product.inStock ?? true
    });
  };

  const handleDelete = async (id: string) => {
    await deleteProduct(id);
    setStatus("Product deleted!");
    setProducts(await getProducts());
  };

  const handleOrderDelete = async (id: string) => {
    await deleteOrder(id);
    setStatus("Order deleted!");
    setOrders(await getOrders());
  };

  return (
  <div className="admin-dashboard-container">
      <h2>Admin Dashboard</h2>
      <form onSubmit={handleAddOrUpdate}>
        <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <input placeholder="Price" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
        <input placeholder="Old Price" type="number" value={form.oldPrice} onChange={e => setForm(f => ({ ...f, oldPrice: e.target.value }))} />
        <input placeholder="Image URL" value={form.img} onChange={e => setForm(f => ({ ...f, img: e.target.value }))} />
        <input placeholder="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <input placeholder="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
        <label>
          <input type="checkbox" checked={form.inStock} onChange={e => setForm(f => ({ ...f, inStock: e.target.checked }))} /> In Stock
        </label>
        <button type="submit">{editId ? "Update" : "Add"} Product</button>
      </form>
      <div>{status}</div>
      <h3>Products</h3>
      <ul>
        {products.map(product => (
          <li key={product.id}>
            {product.name} - ${product.price}
            <button onClick={() => handleEdit(product)}>Edit</button>
            <button onClick={() => handleDelete(String(product.id))}>Delete</button>
          </li>
        ))}
      </ul>
      <h3>Orders</h3>
      <ul>
        {orders.map(order => (
          <li key={order.id}>
            {order.date} - ${order.total} - {order.status}
            <button onClick={() => handleOrderDelete(String(order.id))}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
