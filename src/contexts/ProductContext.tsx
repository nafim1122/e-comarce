import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Product } from '../types';

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
}

type ProductAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_PRODUCTS'; payload: Product[] }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: { id: string | number; updates: Partial<Product> } }
  | { type: 'DELETE_PRODUCT'; payload: string | number };

const initialState: ProductState = {
  products: [],
  loading: false,
  error: null,
};

function productReducer(state: ProductState, action: ProductAction): ProductState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_PRODUCTS':
      return { ...state, products: action.payload, loading: false, error: null };
    case 'ADD_PRODUCT':
      return { 
        ...state, 
        products: [action.payload, ...state.products],
        loading: false,
        error: null 
      };
    case 'UPDATE_PRODUCT':
      return {
        ...state,
        products: state.products.map(p =>
          String(p.id) === String(action.payload.id)
            ? { ...p, ...action.payload.updates }
            : p
        ),
        loading: false,
        error: null
      };
    case 'DELETE_PRODUCT':
      return {
        ...state,
        products: state.products.filter(p => String(p.id) !== String(action.payload)),
        loading: false,
        error: null
      };
    default:
      return state;
  }
}

interface ProductContextType extends ProductState {
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string | number, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string | number) => Promise<void>;
  refreshProducts: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(productReducer, initialState);

  // Load products from localStorage on mount
  useEffect(() => {
    loadProducts();
  }, []);

  // Save to localStorage whenever products change
  useEffect(() => {
    if (state.products.length > 0) {
      try {
        localStorage.setItem('products', JSON.stringify(state.products));
      } catch (error) {
        console.error('Failed to save products to localStorage:', error);
      }
    }
  }, [state.products]);

  const loadProducts = () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const stored = localStorage.getItem('products');
      if (stored) {
        const products = JSON.parse(stored) as Product[];
        dispatch({ type: 'SET_PRODUCTS', payload: products });
      } else {
        dispatch({ type: 'SET_PRODUCTS', payload: [] });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load products' });
    }
  };

  const addProduct = async (productData: Omit<Product, 'id'>): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Validate required fields
      if (!productData.name?.trim()) {
        throw new Error('Product name is required');
      }
      if (!productData.price || productData.price <= 0) {
        throw new Error('Valid price is required');
      }
      if (!productData.img?.trim()) {
        throw new Error('Product image URL is required');
      }

      const newProduct: Product = {
        id: `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: productData.name.trim(),
        price: Number(productData.price),
        oldPrice: Number(productData.oldPrice) || 0,
        img: productData.img.trim(),
        description: productData.description?.trim() || '',
        category: productData.category?.trim() || 'Uncategorized',
        inStock: productData.inStock !== false,
        basePricePerKg: productData.basePricePerKg,
        unit: productData.unit || 'kg'
      };

      dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    }
  };

  const updateProduct = async (id: string | number, updates: Partial<Product>): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Validate updates
      if (updates.name !== undefined && !updates.name.trim()) {
        throw new Error('Product name cannot be empty');
      }
      if (updates.price !== undefined && (updates.price <= 0 || isNaN(Number(updates.price)))) {
        throw new Error('Valid price is required');
      }
      if (updates.img !== undefined && !updates.img.trim()) {
        throw new Error('Product image URL cannot be empty');
      }

      const sanitizedUpdates = {
        ...updates,
        name: updates.name?.trim(),
        description: updates.description?.trim(),
        category: updates.category?.trim(),
        img: updates.img?.trim(),
        price: updates.price ? Number(updates.price) : undefined,
        oldPrice: updates.oldPrice ? Number(updates.oldPrice) : undefined,
      };

      dispatch({ type: 'UPDATE_PRODUCT', payload: { id, updates: sanitizedUpdates } });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: (error as Error).message });
      throw error;
    }
  };

  const deleteProduct = async (id: string | number): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'DELETE_PRODUCT', payload: id });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete product' });
      throw error;
    }
  };

  const refreshProducts = () => {
    loadProducts();
  };

  const value: ProductContextType = {
    ...state,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
  };

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};