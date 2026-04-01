import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
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

  // Use service role for admin operations (create user, update profile)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { mode, payload, email, employeeId } = await req.json();

    // ── CREATE EMPLOYEE ──
    if (mode === "create") {
      const password = payload.password || "karyawan123";
      payload.password = password;

      // Check duplicate NIK
      if (payload.nik) {
        const { data: existNik } = await admin.from("employees").select("id").eq("nik", payload.nik).maybeSingle();
        if (existNik) return json({ error: `NIK ${payload.nik} sudah terdaftar` }, 400);
      }

      // Check duplicate email
      const cleanEmail = email?.trim();
      if (cleanEmail) {
        const { data: existEmail } = await admin.from("employees").select("id").eq("email", cleanEmail).maybeSingle();
        if (existEmail) return json({ error: `Email ${cleanEmail} sudah terdaftar` }, 400);
      }

      // 1) Insert employee record
      const { data: emp, error: empErr } = await admin
        .from("employees")
        .insert(payload)
        .select("id")
        .single();

      if (empErr) return json({ error: empErr.message }, 400);

      // 2) If email provided, create auth account + link profile
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

        } catch (e: any) {
          console.warn("Auth setup error:", e);
          await admin.from("employees").update({ email: cleanEmail }).eq("id", emp.id);
          return json({ employee: emp, warning: "Karyawan dibuat, akun login gagal: " + e.message });
        }
      }

      return json({ employee: emp });
    }

    // ── UPDATE EMPLOYEE ──
    if (mode === "update") {
      if (!employeeId) return json({ error: "employeeId required" }, 400);

      const password = payload.password;
      delete payload.password;

      // 1) Update employee record
      const { error: empErr } = await admin
        .from("employees")
        .update(payload)
        .eq("id", employeeId);

      if (empErr) return json({ error: empErr.message }, 400);

      // 2) If password provided, update auth user password
      if (password && password.trim()) {
        try {
          // Find auth user by employee's email
          const { data: emp } = await admin
            .from("employees")
            .select("email")
            .eq("id", employeeId)
            .single();

          if (emp?.email) {
            // Find the profile linked to this employee
            const { data: profile } = await admin
              .from("profiles")
              .select("id")
              .eq("employee_id", employeeId)
              .single();

            if (profile) {
              await admin.auth.admin.updateUserById(profile.id, { password });
            }
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

      // Find linked auth user
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("employee_id", employeeId)
        .single();

      // Delete employee (cascade will handle face_descriptors etc)
      const { error: empErr } = await admin
        .from("employees")
        .delete()
        .eq("id", employeeId);

      if (empErr) return json({ error: empErr.message }, 400);

      // Delete auth user if exists
      if (profile) {
        try {
          await admin.auth.admin.deleteUser(profile.id);
        } catch {}
      }

      return json({ success: true });
    }

    return json({ error: "Invalid mode" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
