// API functions for cart operations
// Read products from localStorage so cart mock uses the current local product list
function getProductsFromLocal(): Array<{ id: string; name: string; price: number; basePricePerKg?: number }> {
  try {
    const raw = localStorage.getItem('products');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).map(item => {
      const obj = item as Record<string, unknown>;
      return {
        id: String(obj.id ?? ''),
        name: typeof obj.name === 'string' ? obj.name : 'Unknown',
        price: typeof obj.price === 'number' ? obj.price : (typeof obj.price === 'string' ? Number(obj.price) || 0 : 0),
        basePricePerKg: typeof obj.basePricePerKg === 'number' ? obj.basePricePerKg : undefined
      };
    });
  } catch (e) { return []; }
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
  unit: 'kg' | 'piece';
  calculatedTotalPrice: number; // Frontend calculation for reference
  selectedWeight?: 0.5 | 1;
  count?: number;
}

export interface AddToCartResponse {
  success: boolean;
  message: string;
  cartItem: {
    productId: string;
    quantity: number;
    unit: string;
    unitPriceAtTime: number; // Backend-computed authoritative price
    totalPriceAtTime: number; // Backend-computed authoritative total
  };
  cartTotal: number;
  cartItemCount: number;
}

// Mock backend response using real product data
export const addToCartAPI = async (request: AddToCartRequest): Promise<AddToCartResponse> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Find product in the actual products data
  const products = getProductsFromLocal();
  const product = products.find(p => String(p.id) === request.productId);
  
  if (!product) {
    throw new Error(`Product with ID ${request.productId} not found`);
  }

  // Backend recomputes authoritative prices
  // Use basePricePerKg if available, otherwise use regular price
  const unitPriceAtTime = request.unit === 'kg' 
    ? (product.basePricePerKg || product.price)
    : product.price;
  
  const totalPriceAtTime = Math.round(unitPriceAtTime * request.quantity * 100) / 100;

  // Deterministic mock: remove random failures so unit tests are stable

  console.log(`Added to cart: ${product.name} - ${request.quantity} ${request.unit} = ${totalPriceAtTime} BDT`);
  const cartItem = {
    productId: request.productId,
    quantity: request.quantity,
    unit: request.unit,
    selectedWeight: request.selectedWeight,
    count: request.count,
    unitPriceAtTime,
    totalPriceAtTime,
  } as const;

  // Persist into localStorage cart (simple array) so other tabs/pages/tests can observe immediately
  try {
    const raw = localStorage.getItem('cart');
    const parsed = raw ? JSON.parse(raw) as unknown[] : [];
    const next = [...parsed, cartItem];
    localStorage.setItem('cart', JSON.stringify(next));
  } catch {
    // ignore persistence errors in mock
  }

  return {
    success: true,
    message: `${product.name} added to cart successfully`,
    cartItem,
    cartTotal: totalPriceAtTime, // Simplified - in real app, sum all cart items
    cartItemCount: 1, // Simplified - in real app, count all cart items
  };
};
