#!/usr/bin/env node
/**
 * backfill_auth.mjs — OPSIONAL.
 *
 * Konteks (per audit 2026-06-10):
 *   - DROP kolom employees.password AMAN tanpa skrip ini: 968 karyawan sudah punya
 *     akun Auth (login lewat auth.users/bcrypt), sisanya tak bisa login (1.200 tanpa email).
 *   - Skrip ini HANYA untuk meng-onboard karyawan yang punya email+password TAPI belum
 *     punya akun Auth (~23 kandidat) supaya mereka bisa login SEBELUM kolom password di-DROP.
 *   - Membuat Auth user dgn password lama (seamless). Karena password lama dianggap bocor,
 *     JADWALKAN forced password reset setelah ini (lihat AUDIT-2026-06-10.md Fase 0).
 *
 * Jalankan SETELAH deploy employee-sync hardened, SEBELUM DROP COLUMN password.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill_auth.mjs           # DRY-RUN (default)
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill_auth.mjs --apply    # eksekusi
 *
 * service_role key = RAHASIA. Jangan commit. Jalankan lokal/CI aman saja.
 */
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes("--apply");

if (!URL || !KEY) {
  console.error("ERROR: set SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di env.");
  process.exit(1);
}

const admin = createClient(URL, KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY (akan membuat akun)" : "DRY-RUN (tidak mengubah apa pun)"}`);

  // Kandidat: employees punya email + password, BELUM punya profile link (belum bisa login).
  // Ambil bertahap (range) agar aman bila jumlah bertambah.
  const candidates = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await admin
      .from("employees")
      .select("id, name, email, password")
      .not("email", "is", null)
      .not("password", "is", null)
      .range(from, from + step - 1);
    if (error) throw error;
    if (!data?.length) break;
    candidates.push(...data);
    if (data.length < step) break;
    from += step;
  }

  let created = 0, skipped = 0, failed = 0;
  for (const e of candidates) {
    const email = (e.email || "").trim();
    const password = (e.password || "").trim();
    if (!email || !password) { skipped++; continue; }

    // Sudah punya profile link? -> sudah bisa login, lewati.
    const { data: prof } = await admin.from("profiles").select("id").eq("employee_id", e.id).maybeSingle();
    if (prof) { skipped++; continue; }

    if (!APPLY) {
      console.log(`[DRY] akan buat akun untuk: ${email} (employee ${e.id} ${e.name ?? ""})`);
      created++;
      continue;
    }

    try {
      const { data: au, error: aerr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (aerr) {
        // Kemungkinan email sudah ada di Auth tapi belum ter-link -> coba link saja.
        console.warn(`  createUser gagal utk ${email}: ${aerr.message} (lewati/link manual)`);
        failed++;
        continue;
      }
      await sleep(300);
      await admin.from("profiles").update({ role: "employee", employee_id: e.id }).eq("id", au.user.id);
      await admin.from("employees").update({ migrated: true }).eq("id", e.id);
      console.log(`  OK ${email} -> auth ${au.user.id}`);
      created++;
      await sleep(200); // hindari rate limit Auth
    } catch (err) {
      console.warn(`  ERROR ${email}: ${err?.message ?? err}`);
      failed++;
    }
  }

  console.log(`\nSelesai. kandidat=${candidates.length} dibuat=${created} dilewati=${skipped} gagal=${failed}`);
  if (!APPLY) console.log("Ini DRY-RUN. Tambahkan --apply untuk eksekusi.");
}

main().catch((e) => { console.error(e); process.exit(1); });
