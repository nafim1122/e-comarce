import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import UserForm from "./components/UserForm";
import UserList from "./components/UserList";
import OrderForm from "./components/OrderForm";
import OrderList from "./components/OrderList";
import OrderDemo from "./components/OrderDemo";
import AdminPanelDashboard from "./components/AdminPanelDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/user" element={<UserForm />} />
          <Route path="/users" element={<UserList />} />
          <Route path="/order" element={<OrderForm />} />
          <Route path="/orders" element={<OrderList />} />
          <Route path="/order-demo" element={<OrderDemo />} />
          <Route path="/admin-dashboard" element={<AdminPanelDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
