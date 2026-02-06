import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

export default function AssignEmployeeAccount() {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from("employees")
      .select("id, name")
      .is("email", null)
      .order("name");

    setEmployees(data || []);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleAssign = async () => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "employee",
          employee_id: selected.id,
        },
      },
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("profiles").insert({
      id: data.user.id,
      name: selected.name,
      role: "employee",
      employee_id: selected.id,
      has_account: true,
    });

    await supabase
      .from("employees")
      .update({
        user_id: data.user.id,
        email,
      })
      .eq("id", selected.id);

    toast({ title: "Sukses", description: "Akun employee berhasil di-assign" });
    setSelected(null);
    setEmail("");
    setPassword("");
    fetchEmployees();
  };

  return (
    <div className="space-y-4 max-w-md">
      {/* <select
        className="w-full border rounded px-3 py-2"
        onChange={(e) =>
          setSelected(employees.find(emp => emp.id === e.target.value))
        }
      >
        <option value="">Pilih Employee</option>
        {employees.map(emp => (
          <option key={emp.id} value={emp.id}>{emp.name}</option>
        ))}
      </select>

      {selected && (
        <>
          <Input
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />

          <Button onClick={handleAssign}>
            Assign Employee Account
          </Button>
        </>
      )} */}

      <p className="text-muted-foreground">
        Fitur ini sedang dalam pengembangan.
      </p>
    </div>
  );
}
