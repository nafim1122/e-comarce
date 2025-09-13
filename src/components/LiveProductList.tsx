import React, { useEffect, useState } from 'react';
import { listenProducts } from '../lib/firestore-products';
import type { Product } from '../types';

export default function LiveProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = listenProducts(items => { setProducts(items); setError(null); }, (e) => { console.error('[LiveProductList] listen error', e); setError(String(e?.message || e)); });
    return () => unsub();
  }, []);

  return (
    <div className="live-products">
      <h2>Products</h2>
      {error && <div className="prod-error">Error loading products: {error}</div>}
      <div className="prod-grid">
        {products.map(p => (
          <div key={p.id} className="prod-card">
            <img src={p.img || '/placeholder.svg'} alt={p.name} className="prod-img" />
            <div className="prod-name">{p.name}</div>
            <div className="prod-price">৳{p.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
