import React, { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Map, Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";
import {
  Fingerprint,
  UserPlus,
  CalendarDays,
  FileText,
  MapPin,
  Settings,
  CameraIcon,
  MapIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AttendanceFilterBar from "@/components/admin/attendance/AttendanceFilterBar";
import AttendanceTable from "@/components/admin/attendance/AttendanceTable";
import AttendanceReportTable from "@/components/admin/attendance/AttendanceReportTable";
import ManualAttendanceDialog from "@/components/admin/attendance/ManualAttendanceDialog";
import { addLog } from "@/lib/activityLogService";
import AttendanceMapTab from "@/components/admin/attendance/AttendanceMapTab";
import { exportAttendanceToExcel } from "@/lib/attendanceExportService";
import Pagination from "../components/ui/Pagination";
import AttendanceSetting from "../components/admin/attendance/AttendanceSetting";
import AttendanceSummaryCards from "../components/admin/attendance/AttendanceSummaryCards";
import DailyRecapTab from "../components/admin/attendance/tabs/DailyRecapTab";
import MapAttendanceTab from "../components/admin/attendance/tabs/MapAttendanceTab";
import ReportsAttendanceTab from "../components/admin/attendance/tabs/ReportsAttendanceTab";
import AttendanceSettingTab from "../components/admin/attendance/tabs/AttendanceSettingTab";
import ManualAttendanceTab from "../components/admin/attendance/tabs/ManualAttendanceTab";
import AttendanceUpdateLocationTab from "../components/admin/attendance/tabs/AttendanceUpdateLocationTab";
import AttendancePhotoTab from "../components/admin/attendance/tabs/AttendancePhotoTab";

const AdminAttendanceManagement = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState("daily_recap");
  const role = user?.role;

  const tabItems = [
    { id: "daily_recap", label: "Rekap Harian", icon: CalendarDays },
    {
      id: "map",
      label: "Peta Absensi",
      icon: MapPin,
    },
    {
      id: "map_update",
      label: "Update Lokasi Absensi",
      icon: MapIcon,
    },
    {
      id: "photo",
      label: "Photo Attendance",
      icon: Camera,
      onlyFor: "Super Admin",
    },
    {
      id: "manual_input",
      label: "Input Manual",
      icon: UserPlus,
      onlyFor: "Super Admin",
    },
    {
      id: "setting",
      label: "Pengaturan",
      icon: Settings,
      onlyFor: "Super Admin",
    },
    {
      id: "requests",
      label: "Pengajuan Izin",
      icon: FileText,
      onlyFor: "Super Admin",
    },
    { id: "reports", label: "Laporan Absensi", icon: FileText },
  ];

  const renderContent = () => {
    switch (currentTab) {
      case "daily_recap":
        return <DailyRecapTab />;

      case "manual_input":
        return <ManualAttendanceTab />;
      case "photo":
        return <AttendancePhotoTab />;

      case "reports":
        return <ReportsAttendanceTab />;
      case "map_update":
        return <AttendanceUpdateLocationTab />;

      case "requests":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Pengajuan Izin/Sakit</CardTitle>
              <CardDescription>Fitur ini belum tersedia.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                🚧 Pengelolaan pengajuan izin atau sakit dari karyawan akan
                segera hadir!
              </p>
            </CardContent>
          </Card>
        );
      case "map":
        return <MapAttendanceTab />;

      case "setting":
        return <AttendanceSettingTab />;

      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Manajemen Absensi Karyawan
          </h1>
          <p className="text-muted-foreground">
            Kelola catatan kehadiran, input manual, dan lihat laporan absensi.
          </p>
        </motion.div>
        <div className="flex border-b mb-6 overflow-x-auto">
          {tabItems
            .filter((tab) => {
              // kalau tab khusus Super Admin
              if (tab.onlyFor && role !== tab.onlyFor) return false;
              return true;
            })
            .map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium focus:outline-none whitespace-nowrap
          ${
            currentTab === tab.id
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }
        `}>
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
        </div>

        <motion.div
          key={currentTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}>
          {renderContent()}
        </motion.div>
      </div>
    </Layout>
  );
};

export default AdminAttendanceManagement;
