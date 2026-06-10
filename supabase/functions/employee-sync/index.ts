import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// =====================================================================
//  employee-sync (HARDENED 2026-06-10)
//  Perubahan vs versi lama:
//   1. [C5] WAJIB autentikasi: hanya admin/super admin (cek JWT caller).
//      -> Disarankan JUGA set verify_jwt = true di dashboard Edge Functions
//         (defense-in-depth di gateway). Cek di bawah tetap jalan walau false.
//   2. [C2] CREATE TIDAK lagi menulis kolom employees.password.
//      Password HANYA di-set ke Supabase Auth user -> kolom employees.password
//      aman untuk di-DROP. (UPDATE memang sudah begitu sejak versi lama.)
// =====================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*", // gated by admin-JWT check below; boleh dipersempit ke origin web
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Service role untuk operasi privileged (createUser, update profile) — HANYA dipakai
  // setelah pemanggil terbukti admin.
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── [C5] AUTH GATE: hanya admin/super admin ──────────────────────────
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "unauthorized: missing bearer token" }, 401);

  const { data: caller, error: callerErr } = await admin.auth.getUser(token);
  if (callerErr || !caller?.user) return json({ error: "unauthorized: invalid token" }, 401);

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role, is_active")
    .eq("id", caller.user.id)
    .maybeSingle();

  const callerRole = (callerProfile?.role ?? "").toLowerCase();
  if (!callerProfile?.is_active || (callerRole !== "admin" && callerRole !== "super admin")) {
    return json({ error: "forbidden: admin only" }, 403);
  }

  try {
    const body = await req.json();
    const mode = body.mode;
    const employeeId = body.employeeId;
    const payload = body.payload ?? {};
    const email = body.email;

    // ── CREATE EMPLOYEE ──
    if (mode === "create") {
      // Password TIDAK ditulis ke kolom employees (lihat header). Hanya untuk Auth user.
      const password = (payload.password && String(payload.password).trim()) || "karyawan123";
      delete payload.password;

      // Cek duplikat NIK
      if (payload.nik) {
        const { data: existNik } = await admin.from("employees").select("id").eq("nik", payload.nik).maybeSingle();
        if (existNik) return json({ error: `NIK ${payload.nik} sudah terdaftar` }, 400);
      }

      // Cek duplikat email
      const cleanEmail = email?.trim();
      if (cleanEmail) {
        const { data: existEmail } = await admin.from("employees").select("id").eq("email", cleanEmail).maybeSingle();
        if (existEmail) return json({ error: `Email ${cleanEmail} sudah terdaftar` }, 400);
      }

      // 1) Insert employee record (TANPA password)
      const { data: emp, error: empErr } = await admin
        .from("employees")
        .insert(payload)
        .select("id")
        .single();

      if (empErr) return json({ error: empErr.message }, 400);

      // 2) Jika ada email: buat akun Auth (password hanya di sini) + link profile
      if (cleanEmail) {
        try {
          const { data: authData, error: authErr } = await admin.auth.admin.createUser({
            email: cleanEmail,
            password,
            email_confirm: true,
          });

          if (authErr) {
            console.warn("Auth create failed:", authErr.message);
            await admin.from("employees").update({ email: cleanEmail }).eq("id", emp.id);
            return json({ employee: emp, warning: "Karyawan dibuat, akun login gagal: " + authErr.message });
          }

          await new Promise((r) => setTimeout(r, 500));

          await admin.from("profiles").update({ role: "employee", employee_id: emp.id }).eq("id", authData.user.id);
          await admin.from("employees").update({ email: cleanEmail, migrated: true }).eq("id", emp.id);
        } catch (e) {
          console.warn("Auth setup error:", e);
          await admin.from("employees").update({ email: cleanEmail }).eq("id", emp.id);
          return json({ employee: emp, warning: "Karyawan dibuat, akun login gagal: " + ((e as Error)?.message ?? String(e)) });
        }
      }

      return json({ employee: emp });
    }

    // ── UPDATE EMPLOYEE ──
    if (mode === "update") {
      if (!employeeId) return json({ error: "employeeId required" }, 400);

      const password = payload.password;
      delete payload.password; // password tak pernah ditulis ke kolom employees

      // 1) Update employee record
      const { error: empErr } = await admin.from("employees").update(payload).eq("id", employeeId);
      if (empErr) return json({ error: empErr.message }, 400);

      // 2) Jika password diisi: update password Auth user terkait
      if (password && String(password).trim()) {
        try {
          const { data: profile } = await admin
            .from("profiles")
            .select("id")
            .eq("employee_id", employeeId)
            .maybeSingle();
          if (profile) {
            await admin.auth.admin.updateUserById(profile.id, { password });
          }
        } catch (e) {
          console.warn("Password update error:", e);
        }
      }

      return json({ success: true });
    }

    // ── DELETE EMPLOYEE ──
    if (mode === "delete") {
      if (!employeeId) return json({ error: "employeeId required" }, 400);

      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("employee_id", employeeId)
        .maybeSingle();

      const { error: empErr } = await admin.from("employees").delete().eq("id", employeeId);
      if (empErr) return json({ error: empErr.message }, 400);

      if (profile) {
        try {
          await admin.auth.admin.deleteUser(profile.id);
        } catch { /* ignore */ }
      }

      return json({ success: true });
    }

    return json({ error: "Invalid mode" }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message ?? String(e) }, 500);
  }
});
