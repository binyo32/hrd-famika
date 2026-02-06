import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion } from "framer-motion";

const ROLE_OPTIONS = [
  { value: "Super Admin", label: "Super Admin" },
  { value: "Admin", label: "Admin" },
  { value: "employee", label: "Employee" },
];

export default function ProfilesTable() {
  const [profiles, setProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(null);
  const [roleDraft, setRoleDraft] = useState({});

  // pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selected, setSelected] = useState([]);

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("email, role, is_active, created_at")
      .order("role", { ascending: false });

    setProfiles(data || []);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("profiles-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        fetchProfiles,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return profiles.filter((p) =>
      p.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [profiles, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [search, pageSize]);

  const handleUpdateRole = async (email) => {
    const newRole = roleDraft[email];
    if (!newRole) return;

    setUpdatingEmail(email);

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("email", email);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal ",
        variant: "destructive",
      });
    } else {
      setRoleDraft((prev) => {
        const copy = { ...prev };
        delete copy[email];
        return copy;
      });
      toast({
        title: "Berhasil",
        description: "Berhasil update role",
        variant: "success",
      });
    }

    setUpdatingEmail(null);
  };

  const normalizeRole = (role) => {
    if (!role) return "";

    const r = role.trim().toLowerCase();

    if (r === "super admin" || r === "super_admin" || r === "superadmin") {
      return "Super Admin";
    }

    if (r === "admin") {
      return "Admin";
    }

    return "employee";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4">
      {/* Top controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <Input
          placeholder="Search email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        <div className="flex items-center gap-2 mt-4">
          <span className="text-sm text-muted-foreground">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm bg-background">
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Role</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Update</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center py-6 text-muted-foreground">
                  Tidak ada data
                </TableCell>
              </TableRow>
            )}

            {paginatedData.map((p, i) => (
              <motion.tr
                key={p.email}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="border-b last:border-b-0">
                <TableCell className="font-medium">{p.email}</TableCell>

                <TableCell className="text-center">
                  <select
                    value={roleDraft[p.email] ?? normalizeRole(p.role)}
                    onChange={(e) =>
                      setRoleDraft((prev) => ({
                        ...prev,
                        [p.email]: e.target.value,
                      }))
                    }
                    className="border rounded px-2 py-1 text-sm bg-background">
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </TableCell>

                <TableCell className="text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      p.is_active
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                    {p.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </TableCell>

                <TableCell className="text-center">
                  <Button
                    size="sm"
                    disabled={
                      updatingEmail === p.email ||
                      (roleDraft[p.email] ?? p.role) === p.role
                    }
                    onClick={() => handleUpdateRole(p.email)}>
                    {updatingEmail === p.email ? "Updating..." : "Save"}
                  </Button>
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Page {page} dari {totalPages || 1}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages || totalPages === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Next
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
