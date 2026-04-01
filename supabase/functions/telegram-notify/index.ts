import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const BOT_TOKEN = "8268065628:AAHOghabaVzF7QZ-fvlWX27Xzjrs3j4-vqw";
const CHAT_ID = "-1003838208798";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function sendTelegram(text: string) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "HTML" }),
  });
}

function formatTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  } catch { return isoStr; }
}

serve(async (req) => {
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  try {
    const { type, record, old_record } = await req.json();

    // Get employee name
    let empName = "Unknown";
    let empPosition = "";
    let empDivision = "";
    if (record?.employee_id) {
      const { data: emp } = await admin.from("employees").select("name, position, division").eq("id", record.employee_id).single();
      if (emp) { empName = emp.name; empPosition = emp.position || ""; empDivision = emp.division || ""; }
    }

    // CHECK-IN (new record with check_in_time)
    if (type === "INSERT" && record?.check_in_time) {
      const time = formatTime(record.check_in_time);
      const project = record.project || "-";
      const isKiosk = project.includes("Face Recognition");

      let location = "";
      if (record.loc_checkin) {
        const loc = typeof record.loc_checkin === "string" ? JSON.parse(record.loc_checkin) : record.loc_checkin;
        location = loc.address || `${loc.lat}, ${loc.lng}`;
      }

      const msg = [
        isKiosk ? "📷 <b>CHECK-IN (Face Recognition)</b>" : "✅ <b>CHECK-IN</b>",
        "",
        `👤 <b>${empName}</b>`,
        empPosition ? `💼 ${empPosition}${empDivision ? " - " + empDivision : ""}` : "",
        `🕐 ${time} WIB`,
        project !== "-" ? `📋 ${project}` : "",
        location ? `📍 ${location}` : "",
      ].filter(Boolean).join("\n");

      await sendTelegram(msg);
    }

    // CHECK-OUT (update with check_out_time that was previously null)
    if (type === "UPDATE" && record?.check_out_time && !old_record?.check_out_time) {
      const timeIn = record.check_in_time ? formatTime(record.check_in_time) : "-";
      const timeOut = formatTime(record.check_out_time);

      let location = "";
      if (record.loc_checkout) {
        const loc = typeof record.loc_checkout === "string" ? JSON.parse(record.loc_checkout) : record.loc_checkout;
        location = loc.address || `${loc.lat}, ${loc.lng}`;
      }

      const msg = [
        "🔴 <b>CHECK-OUT</b>",
        "",
        `👤 <b>${empName}</b>`,
        empPosition ? `💼 ${empPosition}${empDivision ? " - " + empDivision : ""}` : "",
        `🕐 ${timeIn} ➜ ${timeOut} WIB`,
        location ? `📍 ${location}` : "",
      ].filter(Boolean).join("\n");

      await sendTelegram(msg);
    }

    // LOCATION UPDATE (update with changed loc_checkin or new location log)
    if (type === "UPDATE" && record?.loc_checkin && old_record?.loc_checkin) {
      const newLoc = typeof record.loc_checkin === "string" ? JSON.parse(record.loc_checkin) : record.loc_checkin;
      const oldLoc = typeof old_record.loc_checkin === "string" ? JSON.parse(old_record.loc_checkin) : old_record.loc_checkin;

      // Only notify if location actually changed significantly
      if (newLoc.lat && oldLoc.lat) {
        const dist = Math.abs(newLoc.lat - oldLoc.lat) + Math.abs(newLoc.lng - oldLoc.lng);
        if (dist > 0.001) { // ~100m movement
          const msg = [
            "📍 <b>UPDATE LOKASI</b>",
            "",
            `👤 <b>${empName}</b>`,
            `📍 ${newLoc.address || `${newLoc.lat}, ${newLoc.lng}`}`,
          ].join("\n");

          await sendTelegram(msg);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json", ...CORS },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
});
