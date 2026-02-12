import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  
} from "@/components/ui/select";

const MessagesFormDialog = ({
  isOpen,
  onOpenChange,
  currentMessage,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [grade, setGrade] = useState("basic");
  const [audienceType, setAudienceType] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    const filtered = employees.filter((emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [search, employees]);

  const resetForm = () => {
    setTitle("");
    setContent("");
    setGrade("basic");
    setAudienceType("all");
    setSelectedEmployees([]);
    setSearch("");
  };

  const fetchEmployees = async () => {
    const pageSize = 1000;
    let from = 0;
    let allEmployees = [];
    let done = false;

    while (!done) {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name")
        .order("name", { ascending: true })
        .range(from, from + pageSize - 1);

      if (error) {
        console.error(error);
        break;
      }

      allEmployees = [...allEmployees, ...data];

      if (data.length < pageSize) {
        done = true;
      } else {
        from += pageSize;
      }
    }

    setEmployees(allEmployees);
    setFilteredEmployees(allEmployees);
  };


  const toggleEmployee = (id) => {
    setSelectedEmployees((prev) =>
      prev.includes(id)
        ? prev.filter((empId) => empId !== id)
        : [...prev, id]
    );
  };
  useEffect(() => {
  if (isOpen) {
    if (currentMessage) {
      setTitle(currentMessage.title);
      setContent(currentMessage.content);
      setGrade(currentMessage.grade || "basic");

      if (currentMessage.audience?.type === "specific") {
        setAudienceType("specific");
        setSelectedEmployees(
          currentMessage.audience.employee_ids || []
        );
      } else {
        setAudienceType("all");
        setSelectedEmployees([]);
      }
    } else {
      resetForm();
    }

    fetchEmployees();
  }
}, [isOpen, currentMessage]);


  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !content) return;

    if (audienceType === "specific" && selectedEmployees.length === 0) {
      return;
    }

    setLoading(true);

    const formData = {
      title,
      content,
      grade,
      audience: audienceType,
      employee_ids:
        audienceType === "specific" ? selectedEmployees : [],
    };

    await onSubmit(formData);

    setLoading(false);
    onOpenChange(false);
  };

  const gradeColor = {
    basic: "text-gray-600",
    warning: "text-yellow-600",
    important: "text-red-600",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[700px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
  {currentMessage ? "Edit Pesan" : "Buat Pesan"}
</DialogTitle>

          <DialogDescription>
            Kirim pesan atau peringatan ke employee.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">

          {/* Title */}
          <div>
            <Label>Judul</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          {/* Content */}
          <div>
            <Label>Isi Pesan</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={5}
              className="mt-1"
            />
          </div>

          {/* Grade */}
          <div>
            <Label>Tingkat Prioritas</Label>
            <Select
              value={grade}
              onValueChange={(value) => setGrade(value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">
                  Basic
                </SelectItem>
                <SelectItem value="warning">
                  Warning
                </SelectItem>
                <SelectItem value="important">
                  Important
                </SelectItem>
              </SelectContent>
            </Select>

            <p className={`text-sm mt-2 ${gradeColor[grade]}`}>
              {grade === "basic" && "Informasi umum."}
              {grade === "warning" && "Perlu perhatian."}
              {grade === "important" && "Prioritas tinggi / Mendesak."}
            </p>
          </div>

          {/* Audience */}
          <div>
            <Label>Target Audiens</Label>
            <Select
              value={audienceType}
              onValueChange={(value) => setAudienceType(value)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Semua Employee
                </SelectItem>
                <SelectItem value="specific">
                  Employee Tertentu
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Specific Employee */}
          {audienceType === "specific" && (
            <div className="space-y-3">
              <Input
                placeholder="Search employee..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                {filteredEmployees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployees.includes(emp.id)}
                      onChange={() => toggleEmployee(emp.id)}
                    />
                    {emp.name}
                  </label>
                ))}

                {filteredEmployees.length === 0 && (
                  <p className="text-sm text-gray-400">
                    Tidak ditemukan.
                  </p>
                )}
              </div>

              <div className="text-sm text-gray-500">
                Dipilih: {selectedEmployees.length} employee
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MessagesFormDialog;
