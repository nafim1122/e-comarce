import React, { useEffect, useState } from 'react';
import { addProduct, updateProduct, deleteProduct, listenProducts } from '../lib/firestore-products';
import type { Product } from '../types';

export default function AdminProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenProducts(items => setProducts(items), e => console.error('[AdminProductManager] listen error', e));
    return () => unsub();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await addProduct({ name, price: Number(price) });
      console.log('Product added', created);
      setName(''); setPrice('');
    } catch (err) {
      console.error('[handleAdd] add failed', err);
      // show feedback UI as needed
    }
  }

  async function handleUpdate(p: Product) {
    try {
      await updateProduct(p.id as string, { name: p.name, price: p.price });
      console.log('Product updated', p.id);
      setEditingId(null);
    } catch (err) { console.error('[handleUpdate]', err); }
  }

  async function handleDelete(id: string) {
    try { await deleteProduct(id); console.log('Deleted', id); } catch (err) { console.error('[handleDelete]', err); }
  }

  return (
    <div className="admin-product-manager">
      <h2>Admin Product Manager</h2>
      <form onSubmit={handleAdd} className="apm-form">
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
        <input placeholder="Price" type="number" value={price} onChange={e=>setPrice(e.target.value)} required />
        <button type="submit">Add Product</button>
      </form>

      <ul className="apm-list">
        {products.map(p => (
          <li key={p.id} className="apm-item">
            <strong>{p.name}</strong> — ৳{p.price}
            <button onClick={() => { setEditingId(String(p.id)); setName(p.name); setPrice(String(p.price)); }} className="apm-btn">Edit</button>
            <button onClick={() => handleDelete(String(p.id))} className="apm-btn">Delete</button>
            {editingId === String(p.id) && (
              <div className="apm-edit">
                <button onClick={() => handleUpdate({ ...p, name, price: Number(price) } as Product)}>Save</button>
                <button onClick={() => { setEditingId(null); setName(''); setPrice(''); }} className="apm-btn">Cancel</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
