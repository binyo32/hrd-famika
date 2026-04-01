import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mapEmployeeDataFromSupabase } from "@/lib/employeeUtils";
import { addLog } from "@/lib/activityLogService";

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /* =========================
   * INIT AUTH + LISTEN CHANGES
   * ========================= */
  useEffect(() => {
    // 1) Check existing session
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        try {
          const rebuiltUser = await buildFullUser(data.session.user.id);
          setUser(rebuiltUser);
          localStorage.setItem("currentUser", JSON.stringify(rebuiltUser));
        } catch { setUser(null); }
      } else {
        // Try cached user while session refreshes
        const cached = localStorage.getItem("currentUser");
        if (cached) setUser(JSON.parse(cached));
        else setUser(null);
      }
      setLoading(false);
    });

    // 2) Listen for auth changes (login, logout, token refresh, new tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        try {
          const rebuiltUser = await buildFullUser(session.user.id);
          setUser(rebuiltUser);
          localStorage.setItem("currentUser", JSON.stringify(rebuiltUser));
        } catch {}
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        localStorage.removeItem("currentUser");
      } else if (event === "TOKEN_REFRESHED" && session) {
        // Session refreshed, user stays logged in
        if (!user) {
          try {
            const rebuiltUser = await buildFullUser(session.user.id);
            setUser(rebuiltUser);
            localStorage.setItem("currentUser", JSON.stringify(rebuiltUser));
          } catch {}
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  /* =========================
   * BUILD FULL USER (KUNCI)
   * ========================= */
  const buildFullUser = async (authUserId) => {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      role,
      is_active,
      employees (*)
    `)
    .eq("id", authUserId)
    .single();

  if (error || !profile) {
    throw new Error("Profile tidak ditemukan");
  }

  if (!profile.is_active) {
    throw new Error("Akun tidak aktif");
  }

  const employee = profile.employees ?? null;

  const isPM = employee ? Boolean(employee.is_direct_pm) : false;
  const isDirectManager = employee
    ? await checkIsDirectManager(employee.id)
    : false;

  return {
    id: profile.id,
    role: profile.role,
    name: employee?.name ?? profile.email,
    email: profile.email,
    isPM,
    isDirectManager,
    employeeData: employee
      ? mapEmployeeDataFromSupabase(employee)
      : null,
  };
};



  /* =========================
   * LOGIN (SET SEKALI)
   * ========================= */
  const login = async (basicUser) => {
    setLoading(true);

  const fullUser = await buildFullUser(basicUser.id);


    setUser(fullUser);
    localStorage.setItem("currentUser", JSON.stringify(fullUser));

    addLog({
      userId: fullUser.id,
      userName: fullUser.name || fullUser.email,
      userRole: fullUser.role,
      action: "LOGIN",
      targetType: "SESSION",
      details: {
        message: `User ${fullUser.name || fullUser.email} logged in.`,
      },
    });

    setLoading(false);
  };

  /* =========================
   * LOGOUT
   * ========================= */
  const logout = async () => {
  await supabase.auth.signOut();
  setUser(null);
  localStorage.removeItem("currentUser");
};


  /* =========================
   * CHECK PM
   * ========================= */
const checkIsPM = (employee) => {
  return Boolean(employee?.is_direct_pm);
};

  /* =========================
   * CHECK DIRECT MANAGER (N LEVEL)
   * ========================= */
  const checkIsDirectManager = async (employeeId) => {
  const { count, error } = await supabase
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("direct_manager_id", employeeId);

  if (error) return false;
  return count > 0;
};

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
