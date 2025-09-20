// Optional backend API for future database migration
// This provides a clean interface that can be switched from localStorage to real API

export interface ApiProduct {
  id: string;
  name: string;
  price: number;
  oldPrice?: number;
  img: string;
  description?: string;
  category?: string;
  inStock: boolean;
  basePricePerKg?: number;
  unit?: 'kg' | 'piece';
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ProductAPI {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
  }

  async getProducts(): Promise<ApiResponse<ApiProduct[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/products`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message,
        message: 'Failed to fetch products'
      };
    }
  }

  async createProduct(product: Omit<ApiProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<ApiProduct>> {
    try {
      const response = await fetch(`${this.baseUrl}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message,
        message: 'Failed to create product'
      };
    }
  }

  async updateProduct(id: string, updates: Partial<ApiProduct>): Promise<ApiResponse<ApiProduct>> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message,
        message: 'Failed to update product'
      };
    }
  }

  async deleteProduct(id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${this.baseUrl}/products/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message,
        message: 'Failed to delete product'
      };
    }
  }
}

// Export singleton instance
export const productAPI = new ProductAPI();

// Export types for external use
export type { ApiProduct, ApiResponse };