import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import ProductDemo from "./pages/ProductDemo";
import UserForm from "./components/UserForm";
import UserList from "./components/UserList";
import OrderForm from "./components/OrderForm";
import OrderList from "./components/OrderList";
import OrderDemo from "./components/OrderDemo";
import AdminPanelDashboard from "./components/AdminPanelDashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider, useAuth } from "./lib/auth-context";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, isAdmin } = useAuth();
  if (loading) return <div className="p-8 text-center text-sm">Loading...</div>;
  if (!isAdmin) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product-demo" element={<ProductDemo />} />
            <Route path="/user" element={<UserForm />} />
            <Route path="/users" element={<UserList />} />
            <Route path="/order" element={<OrderForm />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/order-demo" element={<OrderDemo />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin-dashboard" element={<ProtectedRoute><AdminPanelDashboard /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
