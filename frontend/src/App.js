import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "@/views/Landing";
import Login from "@/views/Login";
import Register from "@/views/Register";
import Onboarding from "@/views/Onboarding";
import Home from "@/views/Home";
import Menu from "@/views/Menu";
import CalendarPage from "@/views/Calendar";
import Wallet from "@/views/Wallet";
import Profile from "@/views/Profile";
import Plans from "@/views/Plans";
import Checkout from "@/views/Checkout";
import PaymentSuccess from "@/views/PaymentSuccess";
import Admin from "@/views/Admin";
import AdminMenu from "@/views/AdminMenu";
import AdminPlans from "@/views/AdminPlans";
import AdminSettings from "@/views/AdminSettings";
import AdminKitchenSchedule from "@/views/AdminKitchenSchedule";
import Delivery from "@/views/Delivery";
import Track from "@/views/Track";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/push";
import { landingPathForRole } from "@/config/permissions";

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-tfcream" />;
  if (user) return <Navigate to={landingPathForRole(user.role)} replace />;
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

          <Route path="/onboarding" element={<ProtectedRoute audience="customer"><Onboarding /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute audience="customer"><Home /></ProtectedRoute>} />
          <Route path="/menu" element={<ProtectedRoute audience="customer"><Menu /></ProtectedRoute>} />
          <Route path="/calendar" element={<ProtectedRoute audience="customer"><CalendarPage /></ProtectedRoute>} />
          <Route path="/wallet" element={<ProtectedRoute audience="customer"><Wallet /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute audience="customer"><Profile /></ProtectedRoute>} />
          <Route path="/plans" element={<ProtectedRoute audience="customer"><Plans /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute audience="customer"><Checkout /></ProtectedRoute>} />
          <Route path="/payment/success" element={<ProtectedRoute audience="customer"><PaymentSuccess /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute audience="admin" permission="admin:dashboard"><Admin /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute audience="admin" permission="orders:manage"><Admin /></ProtectedRoute>} />
          <Route path="/admin/subscriptions" element={<ProtectedRoute audience="admin" permission="subscriptions:manage"><AdminPlans /></ProtectedRoute>} />
          <Route path="/admin/kitchen-schedule" element={<ProtectedRoute audience="admin" permission="kitchen:manage"><AdminKitchenSchedule /></ProtectedRoute>} />
          <Route path="/admin/menu" element={<ProtectedRoute audience="admin" permission="meals:manage"><AdminMenu /></ProtectedRoute>} />
          <Route path="/admin/plans" element={<ProtectedRoute audience="admin" permission="subscriptions:manage"><AdminPlans /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute audience="admin" permission="customers:manage"><Admin /></ProtectedRoute>} />
          <Route path="/admin/payments" element={<ProtectedRoute audience="admin" permission="payments:manage"><Admin /></ProtectedRoute>} />
          <Route path="/admin/delivery" element={<ProtectedRoute audience="admin" permission="delivery:manage"><Delivery /></ProtectedRoute>} />
          <Route path="/admin/analytics" element={<ProtectedRoute audience="admin" permission="analytics:read"><Admin /></ProtectedRoute>} />
          <Route path="/admin/notifications" element={<ProtectedRoute audience="admin" permission="notifications:manage"><AdminSettings /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute audience="admin" permission="settings:manage"><AdminSettings /></ProtectedRoute>} />
          <Route path="/delivery" element={<ProtectedRoute permission="delivery:manage"><Delivery /></ProtectedRoute>} />
          <Route path="/track/:orderId" element={<ProtectedRoute><Track /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
