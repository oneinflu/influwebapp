import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getStoredToken } from "../../utils/api";

export default function ProtectedRoute() {
  const { token } = useAuth();
  const location = useLocation();
  const stored = getStoredToken();
  // Accept either in-memory token (context) or a stored token to prevent redirect races post-login
  if (!token && !stored) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }
  return <Outlet />;
}