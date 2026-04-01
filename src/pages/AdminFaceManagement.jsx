import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Search, Trash2, Loader2, Users, Camera, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminFaceManagement() {
  const [employees, setEmployees] = useState([]);
  const [faceData, setFaceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all, registered, unregistered
  const [deleting, setDeleting] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [empRes, faceRes] = await Promise.all([
      supabase.from("employees").select("id, name, position, division, active_status").eq("active_status", "Aktif").order("name"),
      supabase.from("employee_face_descriptors").select("employee_id, validated_at, photos"),
    ]);
    if (empRes.data) setEmployees(empRes.data);
    if (faceRes.data) {
      const map = {};
      faceRes.data.forEach(f => { map[f.employee_id] = f; });
      setFaceData(map);
    }
    setLoading(false);
  };

  const handleDelete = async (empId) => {
    setDeleting(empId);
    await supabase.from("employee_face_descriptors").delete().eq("employee_id", empId);
    setFaceData(prev => { const n = { ...prev }; delete n[empId]; return n; });
    setDeleting(null);
  };

  const registered = Object.keys(faceData).length;
  const total = employees.length;

  const filtered = employees.filter(e => {
    const matchSearch = !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.position?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "registered" && faceData[e.id]) || (filter === "unregistered" && !faceData[e.id]);
    return matchSearch && matchFilter;
  });

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Face Recognition</h1>
              <p className="text-xs text-muted-foreground">Kelola data wajah karyawan</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("all")}>
            <Users className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total Karyawan</p>
          </Card>
          <Card className="p-4 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("registered")}>
            <CheckCircle className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold text-emerald-600">{registered}</p>
            <p className="text-xs text-muted-foreground">Sudah Validasi</p>
          </Card>
          <Card className="p-4 text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("unregistered")}>
            <XCircle className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold text-amber-600">{total - registered}</p>
            <p className="text-xs text-muted-foreground">Belum Validasi</p>
          </Card>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progress validasi wajah</span>
            <span>{registered}/{total} ({total ? Math.round(registered / total * 100) : 0}%)</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${total ? (registered / total) * 100 : 0}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full" />
          </div>
        </div>

        {/* Filter tabs + Search */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
            {[["all", "Semua"], ["registered", "Terdaftar"], ["unregistered", "Belum"]].map(([key, label]) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari karyawan..." className="pl-9 h-9 text-sm" />
          </div>
        </div>

        {/* Employee list */}
        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Tidak ada data</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map((emp) => {
                const face = faceData[emp.id];
                const isRegistered = !!face;
                return (
                  <div key={emp.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      isRegistered ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-gradient-to-br from-slate-400 to-slate-500"
                    }`}>
                      {emp.name?.[0]}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.position} &middot; {emp.division}</p>
                    </div>

                    {/* Status */}
                    {isRegistered ? (
                      <div className="flex items-center gap-2">
                        {/* Thumbnail photos */}
                        <div className="hidden sm:flex gap-1">
                          {(face.photos || []).slice(0, 3).map((p, i) => {
                            const url = supabase.storage.from("photo.attendance").getPublicUrl(p).data.publicUrl;
                            return <img key={i} src={url} className="h-8 w-8 rounded object-cover" />;
                          })}
                        </div>
                        <div className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs font-medium hidden sm:inline">
                            {new Date(face.validated_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <button onClick={() => handleDelete(emp.id)} disabled={deleting === emp.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-muted-foreground/40 hover:text-red-500 transition-colors">
                          {deleting === emp.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/50 bg-muted/50 px-2.5 py-1 rounded-full">Belum validasi</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
