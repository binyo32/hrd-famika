"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
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
import { ChevronsUpDown, Check } from "lucide-react";

export default function CreateAccountForm({ onSuccess }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "",
  });

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openEmployee, setOpenEmployee] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH EMPLOYEE ================= */
  const fetchEmployeesWithoutEmail = async () => {
    let from = 0;
    const limit = 1000;
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, nik")
      .is("email", null)
      .order("name")
      .range(from, from + limit - 1);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setEmployees(data);
  };

  useEffect(() => {
    fetchEmployeesWithoutEmail();
  }, []);

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedEmployee || !form.email || !form.role) {
      toast({
        title: "Validasi gagal",
        description: "Lengkapi karyawan, email, password, dan role",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1️⃣ CREATE AUTH USER
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password || "karyawan123",
      });

      if (error) throw error;

      // tunggu trigger profile
      await new Promise((r) => setTimeout(r, 300));

      // 2️⃣ UPDATE PROFILE ROLE
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          role: form.role,
          employee_id: selectedEmployee.id,
        })
        .eq("id", data.user.id);

      if (profileError) throw profileError;

      // 3️⃣ UPDATE EMPLOYEE
      const { error: empError } = await supabase
        .from("employees")
        .update({
          email: form.email,
          // user_id: data.user.id,
          migrated: true,
        })
        .eq("id", selectedEmployee.id);

      if (empError) throw empError;

      toast({
        title: "Akun berhasil dibuat",
        description: `${selectedEmployee.name} berhasil dimigrasi`,
      });

      setSelectedEmployee(null);
      setForm({ email: "", password: "", role: "" });
      fetchEmployeesWithoutEmail();
      onSuccess?.();
    } catch (err) {
      toast({
        title: "Gagal membuat akun",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-lg border bg-background p-6 space-y-5">
      <h1 className="text-xl font-bold">BUAT AKUN BARU</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* EMPLOYEE SEARCH */}
        <div className="space-y-2 ">
          <Label>Pilih Karyawan</Label>
          <Popover open={openEmployee} onOpenChange={setOpenEmployee}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between">
                {selectedEmployee
                  ? `${selectedEmployee.name} - ${selectedEmployee.nik}`
                  : "Pilih karyawan"}
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Cari karyawan..." />
                <CommandEmpty>Karyawan tidak ditemukan</CommandEmpty>
                <CommandList>
                  {employees.map((emp) => (
                    <CommandItem
                      key={emp.id}
                      value={emp.name}
                      onSelect={() => {
                        setSelectedEmployee(emp);
                        setOpenEmployee(false);
                      }}>
                      {emp.name} - {emp.nik}
                      {selectedEmployee?.id === emp.id && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* ROLE */}
        <div className="space-y-2">
          <Label>Role</Label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            disabled={loading}
            className="w-full rounded-md dark:bg-background dark:text-muted-foreground border px-3 py-2 text-sm">
            <option value="">-- Pilih Role --</option>
            <option value="admin">
              Admin{" "}
              <b className=" font-bold">(Akses Management Absensi)</b>{" "}
            </option>
            <option value="super_admin">
              Super Admin <b className=" font-bold"> (All Access)</b>
            </option>
            <option value="pm">
              PM <b className=" font-bold">(Sebagai PM Absensi Employee)</b>
            </option>
            <option value="employee">Employee</option>
          </select>
        </div>

        {/* EMAIL */}
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            name="email_dummy"
            autoComplete="new-email"
            inputMode="email"
            placeholder="user@email.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={loading}
          />
        </div>

        {/* PASSWORD */}
        <div className="space-y-2">
          <Label>Password</Label>
          <Input
            type="password"
            name="password_dummy"
            autoComplete="new-password"
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            disabled={loading}
          />

          <Label className="text-xs text-muted-foreground">
            {" "}
            default password: karyawan123
          </Label>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={loading || !selectedEmployee || !form.email || !form.role}>
          {loading ? "Creating..." : "Create Account"}
        </Button>
      </div>
    </form>
  );
}
