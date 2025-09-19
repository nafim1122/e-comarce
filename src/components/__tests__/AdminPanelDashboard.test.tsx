import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';

// Mock Firebase auth functions
// Mock firebase/auth so imports like getAuth won't throw during module init
vi.mock('firebase/auth', () => ({
  getAuth: () => ({}),
  onAuthStateChanged: vi.fn(() => vi.fn()),
  signOut: vi.fn(() => Promise.resolve()),
  signInAnonymously: vi.fn(() => Promise.resolve()),
}));

// Prevent firebase analytics from running real DOM logic in tests
vi.mock('firebase/analytics', () => ({
  getAnalytics: () => ({}),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

// Hoist-safe test state for auth mock. The mock factory reads this at runtime
// so it doesn't close over a test-local variable during hoisting.
export const __testAuthState = { value: { isAdmin: true, loading: false, user: { email: 'admin@test.com' } } };

vi.mock('@/lib/auth-context', () => ({
  useAuth: () => __testAuthState.value,
  AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

// Mock backend auth 
vi.mock('@/lib/backend-auth', () => ({
  backendLogin: vi.fn(() => Promise.resolve({ email: 'admin@test.com' })),
  backendMe: vi.fn(() => Promise.resolve({ email: 'admin@test.com' })),
}));

// Mock product and order functions
vi.mock('@/lib/product', () => ({
  addProduct: vi.fn(() => Promise.resolve('mock-id')),
  fetchProducts: vi.fn(() => Promise.resolve([])),
  updateProduct: vi.fn(() => Promise.resolve()),
  deleteProduct: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/order', () => ({
  getOrders: vi.fn(() => Promise.resolve([])),
  deleteOrder: vi.fn(() => Promise.resolve()),
  updateOrderStatus: vi.fn(() => Promise.resolve()),
}));

// Mock socket functionality
vi.mock('@/lib/socket', () => ({
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
  })),
}));

// Mock dev sync
vi.mock('@/lib/dev-sync', () => ({
  simulateServerCreatedProduct: vi.fn((product) => ({ ...product, id: 'server-id' })),
}));

// Mock UI components to simplify rendering
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'card' }, children),
  CardContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'card-content' }, children),
  CardHeader: ({ children }: { children: React.ReactNode }) => React.createElement('div', { 'data-testid': 'card-header' }, children),
  CardTitle: ({ children }: { children: React.ReactNode }) => React.createElement('h2', { 'data-testid': 'card-title' }, children),
}));

vi.mock('@/components/ui/button', () => ({
  Button: (props: React.ComponentProps<'button'>) => React.createElement('button', props, props.children),
}));

vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({ 
    toast: vi.fn() 
  })),
}));

// Import the component under test after mocks so imports inside it are mocked
import AdminPanelDashboard from '../AdminPanelDashboard';

describe('AdminPanelDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // reset the hoist-safe test auth state
    __testAuthState.value = { isAdmin: true, loading: false, user: { email: 'admin@test.com' } };
  });

  it('renders admin dashboard for admin users', async () => {
    render(<AdminPanelDashboard />);

    // Wait for async loading to finish and admin content to appear
    // Prefer role-based query to avoid multiple cards with the same test id
    expect(await screen.findByRole('heading', { name: /Add Product/i })).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Name')).toBeInTheDocument();
    expect(await screen.findByPlaceholderText('Price')).toBeInTheDocument();
  });

  it('shows not allowed message for non-admin users', async () => {
    __testAuthState.value = { isAdmin: false, loading: false, user: null };

    render(<AdminPanelDashboard />);

    expect(await screen.findByText(/not allowed to view this page/i)).toBeInTheDocument();
  });

  it('shows loading state when auth is loading', async () => {
    __testAuthState.value = { isAdmin: false, loading: true, user: null };

    render(<AdminPanelDashboard />);

    // Should not show the not allowed message when loading
    // use queryByText since it should be absent
    expect(screen.queryByText(/not allowed to view this page/i)).not.toBeInTheDocument();
  });

  it('displays Add Product button for admin users', async () => {
    render(<AdminPanelDashboard />);

    // Select the actual button (there is also a heading with the same text)
    expect(await screen.findByRole('button', { name: /Add Product/i })).toBeInTheDocument();
  });
});
