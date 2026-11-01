import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

function Splash() {
  return (
    <div className="splash" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function ProtectedRoute() {
  const { status } = useAuth();
  if (status === "loading") return <Splash />;
  if (status === "unauthenticated") return <Navigate to="/signin" replace />;
  return <Outlet />;
}

export function GuestRoute() {
  const { status } = useAuth();
  if (status === "loading") return <Splash />;
  if (status === "authenticated") return <Navigate to="/" replace />;
  return <Outlet />;
}
