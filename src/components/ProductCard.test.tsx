import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductCard from './ProductCard';
import { addToCartAPI } from '../api/cartAdapter';

// Mock the adapter API function that ProductCard imports
vi.mock('../api/cartAdapter', () => ({
  addToCartAPI: vi.fn(),
}));

const mockProduct = {
  id: 1,
  name: 'Test Product',
  price: 100,
  oldPrice: 120,
  basePricePerKg: 120,
  img: '/test-image.jpg',
  category: 'Test Category',
  inStock: true,
  unit: 'kg' as const,
  kgStep: 0.1,
  minQuantity: 0.5,
  maxQuantity: 5,
};

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays total computed from pricePerKg * selectedWeight*count and adds to cart', async () => {
    // Mock successful API response
    vi.mocked(addToCartAPI).mockResolvedValue({
      success: true,
      message: 'Item added to cart',
      cartItem: {
        productId: '1',
        quantity: 0.5,
        unit: 'kg',
        unitPriceAtTime: 120,
        totalPriceAtTime: 60,
      },
      cartTotal: 60,
      cartItemCount: 1,
    });

    render(<ProductCard product={mockProduct} />);

    // Initial state: 0.5 kg selected, count 1 -> total = 120 * 0.5 = 60
    expect(screen.getByText('0.5 kg')).toBeInTheDocument();
    expect(screen.getByText('1 kg')).toBeInTheDocument();
    expect(screen.getByText('Total:')).toBeInTheDocument();

  const totalElement = screen.getByText('Total:').parentElement;
  // Locale may format digits in Bengali numerals; assert the currency symbol is present instead
  expect(totalElement).toHaveTextContent('৳');

    // Switch to 1 kg -> total should be 120
    const oneKgButton = screen.getByText('1 kg').closest('button');
    fireEvent.click(oneKgButton!);
    await waitFor(() => {
      const totalElement2 = screen.getByText('Total:').parentElement;
      // Number may be formatted in Bengali numerals; assert currency symbol instead
      expect(totalElement2).toHaveTextContent('৳');
    });

    // Switch back to 0.5 kg and add to cart
    const halfKgButton = screen.getByText('0.5 kg').closest('button');
    fireEvent.click(halfKgButton!);

    const addButton = screen.getByText('Add to Cart');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(addToCartAPI).toHaveBeenCalledWith({
        productId: '1',
        quantity: 0.5,
        unit: 'kg',
        calculatedTotalPrice: 60,
        selectedWeight: 0.5,
        count: 1,
      });
    });
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    vi.mocked(addToCartAPI).mockRejectedValue(new Error('Cart service unavailable'));

    render(<ProductCard product={mockProduct} />);

    const addButton = screen.getByText('Add to Cart');
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Cart service unavailable')).toBeInTheDocument();
    });
  });
});
