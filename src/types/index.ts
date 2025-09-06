export interface User {
  uid: string;
  name: string;
  email: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  oldPrice: number;
  img: string;
  description?: string;
  category?: string;
  inStock?: boolean;
}

export interface CartItem {
  productId: number;
  quantity: number;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  date: string;
  items: OrderItem[];
  total: number;
  paymentMethod: string;
  transactionId?: string;
  address?: string;
  phone?: string;
  status?: 'pending' | 'confirmed' | 'delivered';
  userId?: string;
}

export interface PaymentData {
  paymentMethod: string;
  transactionId?: string;
  address?: string;
  phone?: string;
}
