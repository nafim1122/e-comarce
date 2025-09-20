import React, { useState } from 'react';
import { ProductProvider } from './contexts/ProductContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminLogin from './components/admin/AdminLogin';
import AdminDashboard from './components/admin/AdminDashboard';
import StoreFront from './components/store/StoreFront';

const App = () => (
  <AuthProvider>
    <ProductProvider>
      <AppContent />
    </ProductProvider>
  </AuthProvider>
);

const AppContent = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show admin login if admin access requested but not authenticated
  if (showAdmin && !isAuthenticated) {
    return <AdminLogin onSuccess={() => setShowAdmin(false)} />;
  }

  // Show admin dashboard if authenticated
  if (isAuthenticated) {
    return <AdminDashboard />;
  }

  // Show store front by default
  return <StoreFront onAdminClick={() => setShowAdmin(true)} />;
};

export default App;
