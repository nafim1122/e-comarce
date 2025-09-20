import React, { useEffect, useState } from 'react';
import { addProduct, updateProduct, deleteProduct, listenProducts } from '../lib/firestore-products';
import type { Product } from '../types';

export default function SimpleProductDemo() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Real-time listener for products
  useEffect(() => {
    console.log('[SimpleProductDemo] Setting up Firestore listener');
    const unsubscribe = listenProducts(
      (productList) => {
        console.log('[SimpleProductDemo] Received products:', productList.length);
        setProducts(productList);
        setError(null);
      },
      (err) => {
        console.error('[SimpleProductDemo] Listener error:', err);
        setError(err.message || 'Failed to load products');
      }
    );

    return () => {
      console.log('[SimpleProductDemo] Cleaning up listener');
      unsubscribe();
    };
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    setLoading(true);
    setError(null);

    try {
      const newProduct = await addProduct({
        name: name.trim(),
        price: Number(price),
        oldPrice: 0,
        img: '/placeholder.svg',
        description: 'Sample product',
        inStock: true
      });
      
      console.log('[SimpleProductDemo] Product added:', newProduct);
      setName('');
      setPrice('');
    } catch (err) {
      console.error('[SimpleProductDemo] Add failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;

    try {
      await deleteProduct(id);
      console.log('[SimpleProductDemo] Product deleted:', id);
    } catch (err) {
      console.error('[SimpleProductDemo] Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h2>Product Management Demo</h2>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px', padding: '10px', backgroundColor: '#fee' }}>
          Error: {error}
        </div>
      )}

      <form onSubmit={handleAddProduct} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Product Name: 
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter product name"
              style={{ marginLeft: '10px', padding: '5px' }}
              required
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Price: 
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
              min="0"
              step="0.01"
              style={{ marginLeft: '10px', padding: '5px' }}
              required
            />
          </label>
        </div>
        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: loading ? '#ccc' : '#4CAF50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Adding...' : 'Add Product'}
        </button>
      </form>

      <h3>Products ({products.length})</h3>
      
      {products.length === 0 ? (
        <p style={{ fontStyle: 'italic' }}>No products yet. Add one above!</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {products.map((product) => (
            <div 
              key={product.id} 
              style={{ 
                border: '1px solid #ddd', 
                padding: '15px', 
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <strong>{product.name}</strong>
                <br />
                Price: ৳{product.price}
                <br />
                <small>ID: {product.id}</small>
              </div>
              <button
                onClick={() => handleDeleteProduct(String(product.id))}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}