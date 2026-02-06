"use client";

import { useState } from "react";
import { ChevronDown, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ================= TIMELINE ================= */
export function AttendanceLocationTimeline({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tidak ada data lokasi
      </p>
    );
  }

  return (
    <div className="space-y-3 mt-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex gap-3 items-start"
        >
          <div className="mt-1">
            <MapPin className="h-4 w-4 text-primary" />
          </div>

          <div className="flex-1">
            <div className="flex justify-between text-sm">
              <span className="capitalize font-medium">
                {log.activity}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(log.recorded_at).toLocaleTimeString("id-ID")}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              {log.address || `${log.latitude}, ${log.longitude}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ================= CARD ================= */
export default function AttendanceLocationCard({ record }) {
  const [open, setOpen] = useState(false);

  const logs = record.attendance_location_logs || [];
  const totalUpdates = logs.length;

  return (
    <motion.div
      layout
      transition={{ layout: { duration: 0.35, type: "spring" } }}
      className="rounded-lg border bg-background"
    >
      {/* HEADER (CLICKABLE) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
      >
        {/* LEFT */}
        <div>
          <p className="font-medium">
            {record.employee?.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {record.employee?.nik}
          </p>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">
          {/* BADGE JUMLAH UPDATE */}
          <span
            className="
              inline-flex items-center rounded-full
              bg-primary/10 text-primary
              px-2 py-0.5 text-xs font-medium
            "
          >
            {totalUpdates} update
          </span>

          {/* CHEVRON */}
          <motion.div
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      {/* EXPAND CONTENT */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="px-4 pb-4"
          >
            <AttendanceLocationTimeline logs={logs} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
