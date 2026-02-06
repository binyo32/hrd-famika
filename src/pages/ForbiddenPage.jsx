import React from "react";
import { useNavigate } from "react-router-dom";

const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold text-red-500">403</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Anda tidak memiliki akses ke halaman ini
      </p>

      <button
        onClick={() => navigate(-1)}
        className="mt-6 px-4 py-2 rounded bg-primary text-primary-foreground"
      >
        Kembali
      </button>
    </div>
  );
};

export default ForbiddenPage;
