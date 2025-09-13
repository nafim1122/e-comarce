export interface User {
  uid: string;
  name: string;
  email: string;
}

export interface Product {
  id: number | string; // Firestore IDs are strings; legacy seed may use numbers
  name: string;
  price: number;
  oldPrice: number;
  basePricePerKg?: number;
  unit?: 'kg' | 'piece';
  kgStep?: number;
  minQuantity?: number;
  maxQuantity?: number;
  img: string;
  description?: string;
  category?: string;
  inStock?: boolean;
  
  // Optional price tiers: array of { minTotalWeight: number, pricePerKg: number }
  priceTiers?: Array<{ minTotalWeight: number; pricePerKg: number }>;
  // Optional explicit preset multipliers for quick-select weights, keys are weight as string (e.g. '0.5', '1')
  presetMultipliers?: Record<string, number>;
}

export interface CartItem {
  productId: number | string; // support Firestore string IDs
  quantity: number;
  // weight is not required; quantity and unit indicate amount (kg or pieces)
  // weight field removed in favor of quantity + unit
  unit?: 'kg' | 'piece';
  // For fixed-weight products we store the selectedWeight (0.5 or 1) and the integer count
  // quantity should remain the total weight for kg (selectedWeight * count)
  selectedWeight?: 0.5 | 1;
  count?: number;
  unitPriceAtTime?: number;
  totalPriceAtTime?: number;
  // server-side cart item id (MongoDB _id) when available
  serverId?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  // weight in grams for each unit (optional for backward compatibility)
  weight?: number;
}

export interface Order {
  id: string; // Firestore document ID
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
