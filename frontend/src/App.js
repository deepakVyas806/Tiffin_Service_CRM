import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Onboarding from "@/pages/Onboarding";
import Home from "@/pages/Home";
import Menu from "@/pages/Menu";
import CalendarPage from "@/pages/Calendar";
import Wallet from "@/pages/Wallet";
import Profile from "@/pages/Profile";
import Plans from "@/pages/Plans";
import Checkout from "@/pages/Checkout";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Admin from "@/pages/Admin";
import AdminMenu from "@/pages/AdminMenu";
import AdminPlans from "@/pages/AdminPlans";
import AdminSettings from "@/pages/AdminSettings";
import Delivery from "@/pages/Delivery";
import Track from "@/pages/Track";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push";

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-tfcream" />;
  if (user) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "delivery") return <Navigate to="/delivery" replace />;
    return <Navigate to="/home" replace />;
  }
  return <Landing />;
}

function App() {
  useEffect(() => { registerServiceWorker(); }, []);
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/menu" element={<ProtectedRoute><Menu /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute><Wallet /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute><Plans /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
          <Route path="/admin/menu" element={<ProtectedRoute role="admin"><AdminMenu /></ProtectedRoute>} />
          <Route path="/admin/plans" element={<ProtectedRoute role="admin"><AdminPlans /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminSettings /></ProtectedRoute>} />
          <Route path="/delivery" element={<ProtectedRoute role="delivery"><Delivery /></ProtectedRoute>} />
          <Route path="/track/:orderId" element={<ProtectedRoute><Track /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
