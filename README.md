# HRD Famika — HRIS & Absensi (Admin Web)

Aplikasi web **HRIS (Human Resource Information System)** untuk Famika: manajemen karyawan, absensi, cuti, kontrak, pengumuman, hingga **kiosk absensi berbasis pengenalan wajah**. Dibangun dengan **React + Vite** dan **Supabase** sebagai backend (Auth, PostgreSQL, Edge Functions, Storage).

> Backend Supabase ini **dipakai bersama** dengan aplikasi mobile **Famika Absen** (Flutter) dan modul **Project Management/ERP** (tabel ber-prefix `pm_*`). Domain HRD = semua tabel **non-`pm_`**.

---

## ✨ Fitur

**Admin / HRD**
- **Dashboard** — ringkasan statistik & grafik (Recharts).
- **Manajemen Karyawan** — CRUD lengkap; pembuatan akun login karyawan otomatis lewat Edge Function `employee-sync` (membuat user Supabase Auth + profil).
- **Manajemen Absensi** — rekap, filter, peta lokasi check-in/out (Leaflet), ekspor (xlsx/PDF).
- **Manajemen Cuti** — jenis cuti, kuota per karyawan, persetujuan permintaan.
- **Manajemen Kontrak** — kontrak kerja per karyawan.
- **Pengumuman & Pesan** — broadcast ke karyawan (memicu push notification di app mobile).
- **Email** — pengiriman email via Edge Function (`email-proxy`).
- **Struktur Organisasi** — org chart (atasan langsung / direct manager).
- **Manajemen Wajah** — kelola face descriptor karyawan untuk kiosk.
- **Log Aktivitas** — audit trail aksi admin.
- **AI Chat** — asisten AI (Edge Function `ai-chat`).
- **Pengaturan** — konfigurasi aplikasi (mis. toggle fitur AI, mobile settings).

**Karyawan**
- Dashboard, riwayat absensi, pengajuan cuti, profil, dan tampilan tim (untuk manager/PM: melihat absensi anggota tim).

**Kiosk**
- **Absensi otomatis dengan pengenalan wajah** (`@vladmandic/face-api`) di perangkat bersama (login satu akun kiosk khusus).

---

## 🧰 Teknologi

| Kategori | Teknologi |
|---|---|
| Framework | React 18, Vite 4, React Router 6 |
| Backend | Supabase (`@supabase/supabase-js` v2) — Auth, Postgres (RLS), Edge Functions, Storage |
| UI | Tailwind CSS, Radix UI, lucide-react, framer-motion, cmdk |
| Data viz / peta | Recharts, Leaflet + react-leaflet (+ marker cluster), react-organizational-chart |
| Dokumen | pdf-lib, pdfjs-dist, react-pdf, xlsx |
| Wajah | @vladmandic/face-api, @mediapipe/tasks-vision |
| Utility | date-fns, clsx, class-variance-authority |

---

## 🚀 Menjalankan secara lokal

**Prasyarat:** Node.js **20.19.1** (lihat `.nvmrc`).

```bash
# 1) Gunakan versi Node yang sesuai
nvm use            # atau: nvm install 20.19.1

# 2) Instal dependensi
npm install

# 3) Siapkan environment variables
cp .env.example .env
#   lalu isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY

# 4) Jalankan dev server (http://localhost:3000)
npm run dev
```

Build & preview produksi:

```bash
npm run build      # output ke dist/
npm run preview
```

### Variabel lingkungan

| Variabel | Keterangan |
|---|---|
| `VITE_SUPABASE_URL` | URL project Supabase (mis. `https://<ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key |

> Hanya gunakan **anon/publishable key** di sisi klien. **Jangan pernah** menaruh `service_role` key di kode frontend.

---

## 🗂️ Struktur proyek

```
src/
├── pages/            # 25 halaman (Admin* & Employee*, KioskAttendance, LoginPage, ...)
├── components/       # 85 komponen (ui/ Radix, employee/, admin/, shared/)
├── contexts/         # AuthContext, ThemeContext, SuccessModalContext
├── hooks/            # useEmployeeManagement, useLeaveManagement, useLiveLocation, ...
├── lib/              # supabaseClient, employeeService, activityLogService, pdfGenerator, ...
└── App.jsx, main.jsx
supabase/
└── functions/        # Edge Functions: ai-chat, email-proxy, employee-sync, telegram-notify
scripts/
└── backfill_auth.mjs # helper opsional provisioning akun Auth
```

---

## 🔐 Keamanan & otorisasi

- **Autentikasi:** Supabase Auth (`signInWithPassword`). Setelah login, request berjalan sebagai role `authenticated`.
- **Row Level Security (RLS):** **aktif** di seluruh tabel domain HRD. Akses dibatasi per baris:
  - Karyawan hanya melihat data miliknya; **Manager/PM** melihat data timnya (via `direct_pm_id`); **Admin / Super Admin** akses penuh.
  - Otorisasi admin ditentukan oleh `profiles.role` (`Admin` / `Super Admin`).
- **Edge Function `employee-sync`** memerlukan JWT admin (`verify_jwt=true`) dan menyetel password hanya pada Supabase Auth (bukan menyimpan plaintext di tabel).
- Kredensial mobile/web tidak menyimpan password di tabel `employees`.

### Peran (role) di `profiles.role`
`Super Admin`, `Admin` — akses penuh HRD · `PM` — manager (lihat tim) · `employee` — karyawan biasa.

---

## ☁️ Edge Functions

Berada di `supabase/functions/`. Deploy via Supabase CLI:

```bash
supabase functions deploy employee-sync
supabase functions deploy ai-chat
supabase functions deploy email-proxy
supabase functions deploy telegram-notify
```

> `employee-sync` di-set `verify_jwt=true` (wajib admin). Pastikan source di repo ini = versi yang ter-deploy agar redeploy tidak menurunkan keamanan.

---

## 📦 Repositori terkait

- **Famika Absen** — aplikasi mobile absensi karyawan (Flutter) yang berbagi backend Supabase yang sama.

---

## 📄 Lisensi

Proyek privat — © Famika. Hak cipta dilindungi.
