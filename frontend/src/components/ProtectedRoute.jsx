import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { hasPermission, isAdminRole, isCustomerRole, landingPathForRole } from "../config/permissions";

export default function ProtectedRoute({ children, role, permission, audience }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tfcream">
        <div className="h-3 w-32 rounded-full bg-orange-100 overflow-hidden">
          <div className="h-full bg-orange-500 tf-pulse" style={{ width: "70%" }} />
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (audience === "admin" && !isAdminRole(user.role)) return <Navigate to={landingPathForRole(user.role)} replace />;
  if (audience === "customer" && !isCustomerRole(user.role)) return <Navigate to={landingPathForRole(user.role)} replace />;
  if (role && user.role !== role) return <Navigate to={landingPathForRole(user.role)} replace />;
  if (permission && !hasPermission(user, permission)) return <Navigate to={landingPathForRole(user.role)} replace />;
  return children;
}
