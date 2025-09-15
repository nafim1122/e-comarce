import React, { useEffect, useState } from 'react';
import { addProduct, updateProduct, deleteProduct, listenProducts, fetchProducts } from '../lib/firestore-products';
import { getSocket } from '../lib/socket';
import type { Product } from '../types';
import { useToast } from '../hooks/use-toast';

export default function AdminProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // First try to fetch products directly
    const loadProducts = async () => {
      try {
        setLoading(true);
        const items = await fetchProducts();
        setProducts(items);
        setError(null);
      } catch (e) {
        console.error('[AdminProductManager] fetch error', e);
        setError('Failed to fetch products. Will try real-time updates.');
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
        console.error('[AdminProductManager] listen error', e);
        if (!products.length) {
          setError('Unable to connect to backend. Please check your connection.');
        }
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

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Product name is required' });
      return;
    }
    
    try {
      setLoading(true);
      const created = await addProduct({ 
        name, 
        price: Number(price), 
        description, 
        category,
        img: imageUrl,
        inStock: true
      });
      console.log('Product added', created);
      toast({ title: 'Success', description: 'Product added successfully' });
      resetForm();
    } catch (err) {
      console.error('[handleAdd] add failed', err);
      toast({ 
        title: 'Error', 
        description: `Failed to add product: ${(err as Error)?.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(p: Product) {
    if (!p.name.trim()) {
      toast({ title: 'Error', description: 'Product name is required' });
      return;
    }
    
    try {
      setLoading(true);
      await updateProduct(p.id as string, { 
        name: p.name, 
        price: p.price,
        description: p.description,
        category: p.category,
        img: p.img
      });
      console.log('Product updated', p.id);
      toast({ title: 'Success', description: 'Product updated successfully' });
      resetForm();
    } catch (err) { 
      console.error('[handleUpdate]', err);
      toast({ 
        title: 'Error', 
        description: `Failed to update product: ${(err as Error)?.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      setLoading(true);
      await deleteProduct(id); 
      console.log('Deleted', id);
      toast({ title: 'Success', description: 'Product deleted successfully' });
    } catch (err) { 
      console.error('[handleDelete]', err);
      toast({ 
        title: 'Error', 
        description: `Failed to delete product: ${(err as Error)?.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }
  
  function resetForm() {
    setName('');
    setPrice('');
    setDescription('');
    setCategory('');
    setImageUrl('');
    setEditingId(null);
  }

  return (
    <div className="admin-product-manager">
      <h2>Admin Product Manager</h2>
      {error && <div className="apm-error">{error}</div>}
      
      <form onSubmit={handleAdd} className="apm-form">
        <div className="apm-form-group">
          <input 
            placeholder="Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
            className="apm-input"
          />
          <input 
            placeholder="Price" 
            type="number" 
            value={price} 
            onChange={e => setPrice(e.target.value)} 
            required 
            className="apm-input"
          />
        </div>
        <div className="apm-form-group">
          <input 
            placeholder="Category" 
            value={category} 
            onChange={e => setCategory(e.target.value)} 
            className="apm-input"
          />
          <input 
            placeholder="Image URL" 
            value={imageUrl} 
            onChange={e => setImageUrl(e.target.value)} 
            className="apm-input"
          />
        </div>
        <textarea 
          placeholder="Description" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          className="apm-textarea"
        />
        <button type="submit" className="apm-btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Add Product'}
        </button>
      </form>

      {loading && <div className="apm-loading">Loading products...</div>}
      
      {!loading && products.length === 0 && (
        <div className="apm-empty">No products available. Add your first product above.</div>
      )}
      
      <ul className="apm-list">
        {products.map(p => (
          <li key={p.id} className="apm-item">
            <div className="apm-item-content">
              {p.img && (
                <img 
                  src={p.img} 
                  alt={p.name} 
                  className="apm-item-img" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/placeholder.svg';
                  }}
                />
              )}
              <div className="apm-item-details">
                <strong>{p.name}</strong>
                <div>৳{p.price}</div>
                {p.category && <div className="apm-item-category">{p.category}</div>}
                {p.description && <div className="apm-item-desc">{p.description}</div>}
              </div>
            </div>
            <div className="apm-item-actions">
              <button 
                onClick={() => { 
                  setEditingId(String(p.id)); 
                  setName(p.name); 
                  setPrice(String(p.price));
                  setDescription(p.description || '');
                  setCategory(p.category || '');
                  setImageUrl(p.img || '');
                }} 
                className="apm-btn"
              >
                Edit
              </button>
              <button 
                onClick={() => handleDelete(String(p.id))} 
                className="apm-btn-delete"
              >
                Delete
              </button>
            </div>
            {editingId === String(p.id) && (
              <div className="apm-edit">
                <button 
                  onClick={() => handleUpdate({ 
                    ...p, 
                    name, 
                    price: Number(price),
                    description,
                    category,
                    img: imageUrl
                  } as Product)}
                  className="apm-btn-save"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button 
                  onClick={resetForm} 
                  className="apm-btn-cancel"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
