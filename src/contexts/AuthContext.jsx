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
   * INIT AUTH (1x only)
   * ========================= */
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      const cached = localStorage.getItem("currentUser");
      if (!cached) return;

      const parsed = JSON.parse(cached);

      // rebuild user dari DB (ANTI DATA STALE)
      const rebuiltUser = await buildFullUser(parsed.id, parsed.role);
      setUser(rebuiltUser);
      localStorage.setItem("currentUser", JSON.stringify(rebuiltUser));
    } catch (err) {
      console.error("Auth init error:", err);
      localStorage.removeItem("currentUser");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  /* =========================
   * BUILD FULL USER (KUNCI)
   * ========================= */
  const buildFullUser = async (userId, role) => {
    // if (role === "employee") {
    //   const { data, error } = await supabase
    //     .from("employees")
    //     .select("*")
    //     .eq("id", userId)
    //     .single();

    //   if (error) throw error;

    //   const isPM = await checkIsPM(userId);

    //   return {
    //     id: userId,
    //     role,
    //     isPM,
    //     name: data.name,
    //     email: data.email,
    //     employeeData: mapEmployeeDataFromSupabase(data),
    //   };
    // }
    if (role === "employee") {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;

      const isPM = await checkIsPM(userId);
      const isDirectManager = await checkIsDirectManager(userId);

      return {
        id: userId,
        role,
        isPM,
        isDirectManager,
        name: data.name,
        email: data.email,
        employeeData: mapEmployeeDataFromSupabase(data),
      };
    }

    if (role === "admin") {
      const { data, error } = await supabase
        .from("admins")
        .select("id, name, email")
        .eq("id", userId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        role,
        name: data.name,
        email: data.email,
      };
    }

    return null;
  };

  /* =========================
   * LOGIN (SET SEKALI)
   * ========================= */
  const login = async (basicUser) => {
    setLoading(true);

    const fullUser = await buildFullUser(basicUser.id, basicUser.role);

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
  const logout = () => {
    setUser(null);
    localStorage.removeItem("currentUser");
  };

  /* =========================
   * CHECK PM
   * ========================= */
  const checkIsPM = async (employeeId) => {
    const { count, error } = await supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("direct_pm_id", employeeId);

    if (error) return false;
    return count > 0;
  };
  /* =========================
   * CHECK DIRECT MANAGER (N LEVEL)
   * ========================= */
  const checkIsDirectManager = async (managerId) => {
    try {
      const visited = new Set();

      const traverse = async (currentManagerId) => {
        // cegah infinite loop
        if (visited.has(currentManagerId)) return false;
        visited.add(currentManagerId);

        const { data, error } = await supabase
          .from("employees")
          .select("id")
          .eq("direct_manager_id", currentManagerId);

        if (error) return false;

        // kalau punya bawahan langsung → manager
        if (data.length > 0) return true;

        // cek level berikutnya
        for (const emp of data) {
          const isManagerBelow = await traverse(emp.id);
          if (isManagerBelow) return true;
        }

        return false;
      };

      return await traverse(managerId);
    } catch (err) {
      console.error("checkIsDirectManager error:", err);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
