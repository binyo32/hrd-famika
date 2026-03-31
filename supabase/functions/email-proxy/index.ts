import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const EMAIL_SERVER_URL = Deno.env.get("EMAIL_SERVER_URL") || "http://148.230.97.77:8889";
const ENCRYPT_KEY = Deno.env.get("EMAIL_ENCRYPT_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ─── Crypto (AES-256-CBC) ─── */

function hexToBytes(hex: string): Uint8Array {
  const b = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) b[i / 2] = parseInt(hex.substr(i, 2), 16);
  return b;
}

async function encrypt(text: string): Promise<string> {
  const key = hexToBytes(ENCRYPT_KEY);
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const ck = await crypto.subtle.importKey("raw", key, "AES-CBC", false, ["encrypt"]);
  const enc = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CBC", iv }, ck, new TextEncoder().encode(text)));
  const combined = new Uint8Array(iv.length + enc.length);
  combined.set(iv);
  combined.set(enc, iv.length);
  return btoa(String.fromCharCode(...combined));
}

async function decrypt(data: string): Promise<string> {
  const key = hexToBytes(ENCRYPT_KEY);
  const raw = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const iv = raw.slice(0, 16);
  const encrypted = raw.slice(16);
  const ck = await crypto.subtle.importKey("raw", key, "AES-CBC", false, ["decrypt"]);
  const dec = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, ck, encrypted);
  return new TextDecoder().decode(dec);
}

/* ─── Helpers ─── */

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

async function proxyToVPS(body: string): Promise<Response> {
  const res = await fetch(EMAIL_SERVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  return new Response(await res.text(), {
    status: res.status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

/* ─── Auth helper ─── */

async function getUser(authHeader: string) {
  // Use service role key to verify user token reliably
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/* ─── Main ─── */

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    // Parse body first
    const body = await req.json();
    const { action, ...params } = body;
    const authHeader = req.headers.get("Authorization") || "";

    // ── Test: proxy directly (credentials in request) ──
    if (action === "test") {
      return await proxyToVPS(JSON.stringify({ action, ...params }));
    }

    // ── Auth required for all other actions ──
    const user = await getUser(authHeader);
    if (!user) return json({ error: "Not authenticated" }, 401);

    // Use anon client for DB queries (respects RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // ── Config: get ──
    if (action === "get-config") {
      const { data } = await supabase
        .from("user_email_accounts")
        .select("email, imap_server, imap_port, smtp_server, smtp_port")
        .eq("user_id", user.id)
        .single();
      return json({ config: data });
    }

    // ── Config: save ──
    if (action === "save-config") {
      const encrypted = await encrypt(params.password);
      const row = {
        user_id: user.id,
        email: params.email,
        password_encrypted: encrypted,
        imap_server: "mail.fajarmitra.co.id",
        imap_port: 993,
        smtp_server: "mail.fajarmitra.co.id",
        smtp_port: 465,
        updated_at: new Date().toISOString(),
      };
      // Upsert
      const { data: existing } = await supabase
        .from("user_email_accounts")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (existing) {
        await supabase.from("user_email_accounts").update(row).eq("user_id", user.id);
      } else {
        await supabase.from("user_email_accounts").insert(row);
      }
      return json({ success: true });
    }

    // ── Config: delete ──
    if (action === "delete-config") {
      await supabase.from("user_email_accounts").delete().eq("user_id", user.id);
      return json({ success: true });
    }

    // ── All other actions → proxy to VPS ──
    const { data: config } = await supabase
      .from("user_email_accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!config) return json({ error: "Email not configured" }, 400);

    let password: string;
    try {
      password = await decrypt(config.password_encrypted);
    } catch {
      try {
        password = atob(config.password_encrypted);
      } catch {
        return json({ error: "Cannot decrypt password. Please reconnect email." }, 400);
      }
    }

    return await proxyToVPS(JSON.stringify({
      action,
      ...params,
      email: config.email,
      password,
      imap_server: config.imap_server || "mail.fajarmitra.co.id",
      imap_port: config.imap_port || 993,
      smtp_server: config.smtp_server || "mail.fajarmitra.co.id",
      smtp_port: config.smtp_port || 465,
    }));

  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});
