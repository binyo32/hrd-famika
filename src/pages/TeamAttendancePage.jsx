"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Layout from "../components/Layout";
import { motion } from "framer-motion";

const TeamAttendancePage = () => {
  const { user } = useAuth();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // FILTER STATE
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(handler);
  }, [search]);
  useEffect(() => {
    if (!user) return;
    fetchAttendance();
  }, [user, debouncedSearch, dateFrom, dateTo]);

  const fetchAttendance = async () => {
  setLoading(true);

  let query = supabase
    .from("attendance_records")
    .select(
      `
      id,
      attendance_date,
      check_in_time,
      check_out_time,
      notes,
      loc_checkin,
      loc_checkout,
      employees:employee_id (
        name,
        nik
      ),
      direct_pm:direct_pm_id (
        name
      ),
      attendance_statuses (
        name
      )
    `
    )
    .eq("direct_pm_id", user.id)
    .order("attendance_date", { ascending: false });

  if (dateFrom) {
    query = query.gte("attendance_date", dateFrom);
  }

  if (dateTo) {
    query = query.lte("attendance_date", dateTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Fetch attendance error:", error);
    setRecords([]);
  } else {
    let filteredData = data || [];

    if (debouncedSearch) {
      const keyword = debouncedSearch.toLowerCase();
      filteredData = filteredData.filter((item) =>
        item.employees?.name?.toLowerCase().includes(keyword)
      );
    }

    setRecords(filteredData);
  }

  setLoading(false);
};


  const calculateWorkDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "-";

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    const diffMs = end - start;
    if (diffMs <= 0) return "-";

    const totalMinutes = Math.floor(diffMs / 1000 / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours} jam ${minutes} menit`;
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
          Absensi Tim Saya
        </h1>
        <p className="text-muted-foreground">
          Pantau riwayat kehadiran team Anda.
        </p>
      </motion.div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Absensi Tim</CardTitle>

          {/* FILTER */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>Cari Nama Karyawan</Label>
              <Input
                placeholder=""
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Dari Tanggal</Label>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Sampai Tanggal</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Karyawan</TableHead>
                <TableHead>NIK</TableHead>
                <TableHead>Direct PM</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Total Jam Kerja</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground">
                    Tidak ada catatan absensi.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.attendance_date).toLocaleDateString(
                        "id-ID",
                        { timeZone: "UTC" }
                      )}
                    </TableCell>

                    <TableCell>{record.employees?.name || "N/A"}</TableCell>
                    <TableCell>{record.employees?.nik || "N/A"}</TableCell>
                    <TableCell>{record.direct_pm?.name || "N/A"}</TableCell>

                    <TableCell>
                      {record.check_in_time
                        ? new Date(record.check_in_time).toLocaleTimeString(
                            "id-ID",
                            { hour: "2-digit", minute: "2-digit" }
                          )
                        : "-"}
                    </TableCell>

                    <TableCell>
                      {record.check_out_time
                        ? new Date(record.check_out_time).toLocaleTimeString(
                            "id-ID",
                            { hour: "2-digit", minute: "2-digit" }
                          )
                        : "-"}
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary">
                        {record.attendance_statuses?.name ||
                          (record.check_in_time ? "Hadir" : "-")}
                      </Badge>
                    </TableCell>

                    <TableCell>{record.notes || "-"}</TableCell>

                    <TableCell className="space-y-1">
                      {record.loc_checkin && (
                        <a
                          href={`https://www.google.com/maps?q=${record.loc_checkin.lat},${record.loc_checkin.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-green-600 hover:underline">
                          Check-In
                        </a>
                      )}

                      {record.loc_checkout && (
                        <a
                          href={`https://www.google.com/maps?q=${record.loc_checkout.lat},${record.loc_checkout.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-red-600 hover:underline">
                          Check-Out
                        </a>
                      )}

                      {!record.loc_checkin && !record.loc_checkout && "-"}
                    </TableCell>

                    <TableCell className="font-medium text-center">
                      {calculateWorkDuration(
                        record.check_in_time,
                        record.check_out_time
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default TeamAttendancePage;
