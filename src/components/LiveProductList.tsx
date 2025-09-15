import React, { useEffect, useState } from 'react';
import { listenProducts, fetchProducts } from '../lib/firestore-products';
import { getSocket } from '../lib/socket';
import type { Product } from '../types';

export default function LiveProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // First try to fetch products directly
    const loadProducts = async () => {
      try {
        setLoading(true);
        const items = await fetchProducts();
        setProducts(items);
        setError(null);
      } catch (e) {
        console.error('[LiveProductList] fetch error', e);
        // Don't set error yet, we'll try the listener approach
      } finally {
        setLoading(false);
      }
    };
    
    loadProducts();
    
    // Set up Firestore listener for real-time updates
    const unsub = listenProducts(
      (items) => { 
        setProducts(items); 
        setError(null); 
        setLoading(false);
      }, 
      (e) => { 
        console.error('[LiveProductList] listen error', e); 
        setError('Unable to connect to backend. Showing cached products if available.');
        setLoading(false);
      }
    );
    
    // Set up socket for real-time updates
    const socket = getSocket();
    if (socket) {
      socket.on('product-update', (data) => {
        if (data.type === 'add') {
          setProducts(prev => [data.product, ...prev]);
        } else if (data.type === 'update') {
          setProducts(prev => prev.map(p => 
            String(p.id) === String(data.product.id) ? data.product : p
          ));
        } else if (data.type === 'delete') {
          setProducts(prev => prev.filter(p => String(p.id) !== String(data.productId)));
        }
      });
    }
    
    return () => {
      unsub();
      if (socket) {
        socket.off('product-update');
      }
    };
  }, []);

  return (
    <div className="live-products">
      <h2>Products</h2>
      {loading && <div className="prod-loading">Loading products...</div>}
      {error && <div className="prod-error">{error}</div>}
      {!loading && products.length === 0 && !error && (
        <div className="prod-empty">No products available.</div>
      )}
      <div className="prod-grid">
        {products.map(p => (
          <div key={p.id} className="prod-card">
            <img 
              src={p.img || '/placeholder.svg'} 
              alt={p.name} 
              className="prod-img" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/placeholder.svg';
              }}
            />
            <div className="prod-name">{p.name}</div>
            <div className="prod-price">৳{p.price}</div>
            {p.description && <div className="prod-desc">{p.description}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
