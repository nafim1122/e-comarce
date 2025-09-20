// Optional Express.js backend for future database migration
// This provides a REST API that can replace localStorage when needed

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (replace with database in production)
let products = [
  {
    id: 'demo_1',
    name: 'Premium Green Tea',
    price: 450,
    oldPrice: 500,
    img: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop',
    description: 'High-quality green tea from Sreemangal gardens',
    category: 'Green Tea',
    inStock: true,
    unit: 'kg',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo_2',
    name: 'Black Tea Special',
    price: 380,
    oldPrice: 420,
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    description: 'Rich and aromatic black tea blend',
    category: 'Black Tea',
    inStock: true,
    unit: 'kg',
    createdAt: new Date().toISOString()
  }
];

let nextId = 3;

// Helper functions
const generateId = () => `product_${nextId++}_${Date.now()}`;

const validateProduct = (product) => {
  const errors = [];
  
  if (!product.name || typeof product.name !== 'string' || !product.name.trim()) {
    errors.push('Name is required');
  }
  
  if (!product.price || isNaN(Number(product.price)) || Number(product.price) <= 0) {
    errors.push('Valid price is required');
  }
  
  if (!product.img || typeof product.img !== 'string' || !product.img.trim()) {
    errors.push('Image URL is required');
  }
  
  return errors;
};

// Routes

// Get all products
app.get('/api/products', (req, res) => {
  try {
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  try {
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Create product
app.post('/api/products', (req, res) => {
  try {
    const errors = validateProduct(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const newProduct = {
      id: generateId(),
      name: req.body.name.trim(),
      price: Number(req.body.price),
      oldPrice: req.body.oldPrice ? Number(req.body.oldPrice) : 0,
      img: req.body.img.trim(),
      description: req.body.description?.trim() || '',
      category: req.body.category?.trim() || 'Uncategorized',
      inStock: req.body.inStock !== false,
      basePricePerKg: req.body.basePricePerKg ? Number(req.body.basePricePerKg) : undefined,
      unit: req.body.unit || 'kg',
      createdAt: new Date().toISOString()
    };

    products.unshift(newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update product
app.put('/api/products/:id', (req, res) => {
  try {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const errors = validateProduct({ ...products[productIndex], ...req.body });
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const updatedProduct = {
      ...products[productIndex],
      ...req.body,
      price: req.body.price ? Number(req.body.price) : products[productIndex].price,
      oldPrice: req.body.oldPrice !== undefined ? Number(req.body.oldPrice) : products[productIndex].oldPrice,
      basePricePerKg: req.body.basePricePerKg !== undefined ? Number(req.body.basePricePerKg) : products[productIndex].basePricePerKg,
      updatedAt: new Date().toISOString()
    };

    products[productIndex] = updatedProduct;
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete product
app.delete('/api/products/:id', (req, res) => {
  try {
    const productIndex = products.findIndex(p => p.id === req.params.id);
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }

    products.splice(productIndex, 1);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`💾 Using in-memory storage (${products.length} demo products loaded)`);
});

module.exports = app;