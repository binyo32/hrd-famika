import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary" />
      </div>
    );
  }

  // belum login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ada role restriction tapi role user tidak masuk
  if (
    requiredRoles.length > 0 &&
    !requiredRoles.includes(user.role)
  ) {
    return <Navigate to="/403" replace />;
  }

  return children;
};

export default ProtectedRoute;
