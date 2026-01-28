import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import AttendanceMap from "./AttendanceMap";
import { useMemo, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const AttendanceMapTab = ({
  records,
  employees,
  filterDate,
  setFilterDate,
  filterEmployee,
  setFilterEmployee,
}) => {
  const selectedEmployee = employees.find((e) => e.id === filterEmployee);
  const summary = useMemo(() => {
    let total = records.length;
    let checkInCount = 0;
    let checkOutCount = 0;

    records.forEach((r) => {
      if (r.loc_checkin?.lat && r.loc_checkin?.lng) {
        checkInCount++;
      }

      if (r.loc_checkout?.lat && r.loc_checkout?.lng) {
        checkOutCount++;
      }
    });

    return {
      total,
      checkInCount,
      checkOutCount,
    };
  }, [records]);
  const [recordsWithLogs, setRecordsWithLogs] = useState([]);
  useEffect(() => {
  const fetchLogs = async () => {
    if (!records || records.length === 0) {
      setRecordsWithLogs([]);
      return;
    }

    const attendanceIds = records.map((r) => r.id);

    const { data, error } = await supabase
      .from("attendance_location_logs")
      .select(`
        attendance_id,
        latitude,
        longitude,
        activity,
        recorded_at,
        address
      `)
      .in("attendance_id", attendanceIds)
      .order("recorded_at", { ascending: true });

    if (error) {
      console.error("Failed fetch location logs:", error);
      setRecordsWithLogs(records);
      return;
    }

    // group logs by attendance_id
    const logsByAttendance = data.reduce((acc, log) => {
      if (!acc[log.attendance_id]) acc[log.attendance_id] = [];
      acc[log.attendance_id].push(log);
      return acc;
    }, {});

    // merge ke records
    const merged = records.map((r) => ({
      ...r,
      attendance_location_logs: logsByAttendance[r.id] || [],
    }));

    setRecordsWithLogs(merged);
  };

  fetchLogs();
}, [records]);
  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>Peta Absensi</CardTitle>
        <CardDescription>
          Lokasi check-in dan check-out karyawan
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ===== FILTER BAR ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* TANGGAL */}
          <div className="space-y-1">
            <Label>Tanggal</Label>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {/* KARYAWAN SEARCHABLE */}
          <div className="space-y-1">
            <Label>Karyawan</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between">
                  {selectedEmployee ? selectedEmployee.name : "Semua Karyawan"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[300px] p-0 z-[9999]" align="start">
                <Command>
                  <CommandInput placeholder="Cari karyawan..." />
                  <CommandList>
                    <CommandEmpty>Karyawan tidak ditemukan</CommandEmpty>

                    <CommandItem
                      value="ALL"
                      onSelect={() => setFilterEmployee("")}>
                      Semua Karyawan
                      {!filterEmployee && <Check className="ml-auto h-4 w-4" />}
                    </CommandItem>

                    {employees.map((e) => (
                      <CommandItem
                        key={e.id}
                        value={e.name}
                        onSelect={() => setFilterEmployee(e.id)}>
                        {e.name}
                        {filterEmployee === e.id && (
                          <Check className="ml-auto h-4 w-4" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="rounded-md md:flex justify-center items-center gap-4 px-4 py-2 text-sm">
          <span className="font-medium">
            Peta absensi
            {filterDate && (
              <>
                {" "}
                tanggal{" "}
                {new Date(filterDate).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </>
            )} ,
          </span>

          <div className=" flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
            <span className="text-blue-500">
              Check-in: <b >{summary.checkInCount}</b> lokasi
            </span>
            <span className="text-red-500">
              Check-out: <b>{summary.checkOutCount}</b> lokasi
            </span>
          </div>
        </div>

        {/* ===== MAP ===== */}
        <div className="relative z-0">
       <AttendanceMap records={recordsWithLogs} />
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceMapTab;
