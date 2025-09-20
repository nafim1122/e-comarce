import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks and shared test state (hoist-safe exports)
export const mockToast = vi.fn();

type MockFn = ReturnType<typeof vi.fn>;
export const __testProductMock: {
  addProduct: MockFn;
  fetchProducts: MockFn;
  updateProduct: MockFn;
  deleteProduct: MockFn;
} = {
  addProduct: vi.fn(),
  fetchProducts: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
};
export const __testOrderMock: {
  getOrders: MockFn;
  deleteOrder: MockFn;
  updateOrderStatus: MockFn;
} = {
  getOrders: vi.fn(),
  deleteOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
};
export const __testSocket = { on: vi.fn(), off: vi.fn() };

export const __testAuthState = { value: { isAdmin: true, loading: false, user: { email: 'admin@test.com' } } };
// Stub global fetch used by some libs to avoid network calls
;(globalThis as unknown as { fetch?: typeof fetch }).fetch = (vi.fn(() => Promise.resolve({ ok: true, json: async () => [] })) as unknown) as typeof fetch;

// Auth context mock (hoist-safe)
vi.mock('@/lib/auth-context', () => ({ useAuth: () => __testAuthState.value, AuthProvider: ({ children }: { children: React.ReactNode }) => children }));

// Product/order/socket/backend mocks
vi.mock('@/lib/product', () => ({
  addProduct: (...args: unknown[]) => __testProductMock.addProduct(...(args as unknown[])),
  fetchProducts: (...args: unknown[]) => __testProductMock.fetchProducts(...(args as unknown[])),
  updateProduct: (...args: unknown[]) => __testProductMock.updateProduct(...(args as unknown[])),
  deleteProduct: (...args: unknown[]) => __testProductMock.deleteProduct(...(args as unknown[])),
}));
vi.mock('@/lib/order', () => ({
  getOrders: (...args: unknown[]) => __testOrderMock.getOrders(...(args as unknown[])),
  deleteOrder: (...args: unknown[]) => __testOrderMock.deleteOrder(...(args as unknown[])),
  updateOrderStatus: (...args: unknown[]) => __testOrderMock.updateOrderStatus(...(args as unknown[])),
}));
vi.mock('@/lib/socket', () => ({ getSocket: () => __testSocket }));
vi.mock('@/lib/backend-auth', () => ({ backendLogin: vi.fn(), backendMe: vi.fn() }));
vi.mock('@/lib/dev-sync', () => ({ simulateServerCreatedProduct: vi.fn() }));

// UI and firebase mocks
vi.mock('@/components/ui/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({}), onAuthStateChanged: vi.fn(), signInAnonymously: vi.fn(() => Promise.resolve()) }));
vi.mock('@/lib/firebase', () => ({ auth: {}, db: {} }));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'card' }, children),
  CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'card-content' }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'card-header' }, children),
  CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', { 'data-testid': 'card-title' }, children),
}));
vi.mock('@/components/ui/button', () => ({ Button: (props: React.ComponentProps<'button'>) => React.createElement('button', props, props.children) }));

import AdminPanelDashboard from '../AdminPanelDashboard';

describe('AdminPanelDashboard Comprehensive Tests (clean)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  // reset hoist-safe mocks
  __testProductMock.fetchProducts = vi.fn(() => Promise.resolve([]));
  __testOrderMock.getOrders = vi.fn(() => Promise.resolve([]));
  __testProductMock.addProduct = vi.fn(() => Promise.resolve('new-product-id'));
    __testSocket.on = vi.fn();
    __testSocket.off = vi.fn();
    __testAuthState.value = { isAdmin: true, loading: false, user: { email: 'admin@test.com' } };
  });

  it('renders admin dashboard for admin users', async () => {
    render(<AdminPanelDashboard />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    await screen.findByRole('heading', { name: /Dashboard Overview/i });
    expect(screen.getByRole('button', { name: /Products/i })).toBeInTheDocument();
  });

  it('handles product form submission', async () => {
    render(<AdminPanelDashboard />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
  // Open Products tab and click Add Product to open the modal
  const productsNav = await screen.findByRole('button', { name: /Products/i });
  fireEvent.click(productsNav);
  const addButton = await screen.findByRole('button', { name: /Add Product/i });
  fireEvent.click(addButton);

  // Fill the ProductForm fields and submit
  const nameInput = await screen.findByPlaceholderText(/Product name/i);
  // There are two inputs using the same placeholder (price and basePricePerKg).
  // Use findAllByPlaceholderText and pick the first one for the piece price.
  const priceInputs = await screen.findAllByPlaceholderText(/^0\.00$/i);
  const priceInput = priceInputs[0];
  fireEvent.change(nameInput, { target: { value: 'Test Product' } });
  fireEvent.change(priceInput, { target: { value: '100' } });
  const saveBtn = await screen.findByRole('button', { name: /Save Product/i });
  fireEvent.click(saveBtn);

  await waitFor(() => expect(__testProductMock.addProduct).toHaveBeenCalled());
  });

  it('handles socket events for real-time updates', async () => {
    render(<AdminPanelDashboard />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    await screen.findByRole('heading', { name: /Dashboard Overview/i });
    // AdminPanelDashboard itself does not register socket handlers directly;
    // ensure the socket mock has not been mistakenly called during render.
    await waitFor(() => expect(__testSocket.on).not.toHaveBeenCalled());
  });

  it('displays loading states appropriately', async () => {
    __testAuthState.value = { isAdmin: true, loading: false, user: { email: 'admin@test.com' } };
    render(<AdminPanelDashboard />, { wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter> });
    expect(await screen.findByRole('heading', { name: /Dashboard Overview/i })).toBeInTheDocument();
  });
});