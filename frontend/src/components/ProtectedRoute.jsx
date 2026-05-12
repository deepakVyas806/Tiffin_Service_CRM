import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function ProtectedRoute({ children, role }) {
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
  if (role && user.role !== role && user.role !== "admin") return <Navigate to="/home" replace />;
  return children;
}
