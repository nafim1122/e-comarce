import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ProductCard from '../ProductCard';
import { addToCartAPI } from '../../api/cartAdapter';

// Mock the cart adapter API
vi.mock('../../api/cartAdapter', () => ({
  addToCartAPI: vi.fn(),
}));

const mockedAddToCartAPI = vi.mocked(addToCartAPI);

const mockProduct = {
  id: 1,
  name: 'Test Lentil',
  img: '/placeholder.svg',
  unit: 'kg' as const,
  basePricePerKg: 120,
  price: 120,
  inStock: true,
  oldPrice: 0,
  category: 'Pulses',
  description: 'Test desc',
  kgStep: 0.5,
  minQuantity: 0.5,
  maxQuantity: 5
};

describe('ProductCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays total computed from pricePerKg * quantity and reacts to input', async () => {
    // Mock successful API response
    mockedAddToCartAPI.mockResolvedValue({
      success: true,
      message: 'Item added to cart',
      cartItem: {
        productId: '1',
        quantity: 1.5,
        unit: 'kg',
        unitPriceAtTime: 120,
        totalPriceAtTime: 180,
      },
      cartTotal: 180,
      cartItemCount: 1,
    });

    const onAddToCart = vi.fn();
    const { getByLabelText, getByText } = render(<ProductCard product={mockProduct} onAddToCart={onAddToCart} />);

    // initial total and controls present
    expect(getByText(/Total:/)).toBeTruthy();

    // For fixed-weight UI: set count to 3 which with 0.5kg option => 1.5 kg total
    const input = getByLabelText('Quantity') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '3' } });

    // total should update (120 * 1.5 = 180)
    expect(getByText(/১৮০\.০০৳/)).toBeTruthy();

    // click add to cart
    const btn = getByText('Add to Cart');
    fireEvent.click(btn);

    // should show loading state
    await waitFor(() => {
      expect(getByText('Adding...')).toBeTruthy();
    });

    // should call API with correct data including selectedWeight and count
    expect(mockedAddToCartAPI).toHaveBeenCalledWith({
      productId: '1',
      quantity: 1.5,
      unit: 'kg',
      calculatedTotalPrice: 180,
      selectedWeight: 0.5,
      count: 3
    });

    // should show success state and call callback
    await waitFor(() => {
      expect(getByText('Added to Cart!')).toBeTruthy();
    });

    expect(onAddToCart).toHaveBeenCalledWith(1.5, 'kg');
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    mockedAddToCartAPI.mockRejectedValue(new Error('Cart service unavailable'));

    const { getByText } = render(<ProductCard product={mockProduct} />);

    const btn = getByText('Add to Cart');
    fireEvent.click(btn);

    // should show error message
    await waitFor(() => {
      expect(getByText(/Cart service unavailable/)).toBeTruthy();
    });
  });
});
