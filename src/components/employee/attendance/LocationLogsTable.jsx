"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { MapPin } from "lucide-react";



const LocationLogsTable = ({ attendanceId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now.setHours(0, 0, 0, 0));
  const end = new Date(now.setHours(23, 59, 59, 999));

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};
 const fetchLogs = async () => {
  if (!attendanceId) return;

  setLoading(true);

  const { start, end } = getTodayRange();

  const { data, error } = await supabase
    .from("attendance_location_logs")
    .select("id, activity, recorded_at")
    .eq("attendance_id", attendanceId)
    .gte("recorded_at", start)
    .lte("recorded_at", end)
    .order("recorded_at", { ascending: false });

  if (!error) setLogs(data || []);
  setLoading(false);
};
const formatDateTime = (iso) => {
  if (!iso) return "-";

  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
   //  second: "2-digit",
  });
};

  useEffect(() => {
    fetchLogs();
  }, [attendanceId]);

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-orange-600" />
          Riwayat Lokasi Kerja Hari ini
        </CardTitle>
      </CardHeader>

      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground">
            Memuat data lokasi...
          </p>
        ) : logs.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Belum ada update lokasi.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Keterangan</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {logs.map((log) => {
                

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="">
                        {formatDateTime(log.recorded_at)}
                      </TableCell>
                     
                      <TableCell>
                        {log.activity}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationLogsTable;