import { AddToCartRequest, AddToCartResponse, addToCartAPI as mockAddToCart } from './cart';

// Toggle between mock and real backend using Vite env var VITE_USE_REAL_CART=true
// Access import.meta.env (handled by Vite at build time). Keep typing minimal.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const useReal = env.VITE_USE_REAL_CART === 'true';

export const addToCartAPI = async (req: AddToCartRequest): Promise<AddToCartResponse> => {
  if (useReal) {
    // Call the real backend endpoint. Backend is expected to recompute authoritative prices.
    const res = await fetch('/api/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(text || `Cart API error: ${res.status}`);
    }

    const json = await res.json();
    return json as AddToCartResponse;
  }

  // Default to existing mock implementation for local dev and tests
  return mockAddToCart(req);
};

export default addToCartAPI;
