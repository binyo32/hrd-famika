import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Search } from "lucide-react";
import {
  workLocations,
  educationLevels,
  activeStatuses,
  initialFormData as baseInitialFormData,
} from "@/lib/employeeConfig";
import { getEmployees } from "@/lib/employeeService";
const initialFormState = {
  ...baseInitialFormData,
};
const EmployeeFormDialog = ({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
  editingEmployee,
  divisions,
  statuses,
  genders,
  jobPositions,
}) => {
  const [formData, setFormData] = useState(initialFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [searchTermPosition, setSearchTermPosition] = useState("");
  const [searchTermDivision, setSearchTermDivision] = useState("");
  const [managers, setManagers] = useState([]);
  const [managerSearchTerm, setManagerSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  useEffect(() => {
    const fetchManagers = async () => {
      if (isOpen) {
        try {
          const allEmployees = await getEmployees();
          // Filter out the current employee from the list of potential managers
          const potentialManagers = editingEmployee
            ? allEmployees.filter((emp) => emp.id !== editingEmployee.id)
            : allEmployees;
          setManagers(potentialManagers);
        } catch (error) {
          console.error("Failed to fetch managers:", error);
        }
      }
    };
    fetchManagers();
  }, [isOpen, editingEmployee]);
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          ...initialFormState,
          ...initialData,
          password: "",
          termination_date: initialData.terminationDate || null,
          active_status: initialData.activeStatus || "Aktif",
          bpjs_number: initialData.bpjsNumber || "",
          direct_manager_id: initialData.directManagerId || null,
          project: initialData.project || "",
          npwp: initialData.npwp || "",
          ptkp_status: initialData.ptkp_status || "",
          dependents_count: initialData.dependents_count || "",
        });
      } else {
        setFormData(initialFormState);
      }
      setSearchTermPosition("");
      setSearchTermDivision("");
      setManagerSearchTerm("");
    }
  }, [initialData, isOpen]);
  const handleChange = (e) => {
    const { id, value, type } = e.target;
    if (type === "number" && value !== "") {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue >= 0) {
        setFormData((prev) => ({
          ...prev,
          [id]: numValue,
        }));
      } else if (value === "") {
        setFormData((prev) => ({ ...prev, [id]: "" }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: type === "date" && value === "" ? null : value,
      }));
    }
  };
  const handleSelectChange = (id, value) => {
    setFormData((prev) => ({
      ...prev,
      [id]: value === "none" ? null : value,
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // ⛔ guard double submit
    setIsSubmitting(true);

    try {
      const dataToSubmit = { ...formData };

      if (!editingEmployee && !dataToSubmit.password) {
        dataToSubmit.password = "karyawan123";
      }

      const submissionData = {
        ...dataToSubmit,
        terminationDate: dataToSubmit.termination_date,
        activeStatus: dataToSubmit.active_status,
        bpjsNumber: dataToSubmit.bpjs_number,
        directManagerId: dataToSubmit.direct_manager_id,
        project: dataToSubmit.project,
        npwp: dataToSubmit.npwp,
        ptkp_status: dataToSubmit.ptkp_status,
        dependents_count:
          dataToSubmit.dependents_count === ""
            ? null
            : dataToSubmit.dependents_count,
      };

      delete submissionData.termination_date;
      delete submissionData.active_status;
      delete submissionData.bpjs_number;

      await onSubmit(submissionData); // ⬅️ WAJIB await
    } finally {
      setIsSubmitting(false); // ✔️ pasti jalan (success / error)
    }
  };

  const filteredJobPositions = (jobPositions || []).filter(
    (pos) =>
      pos && pos.toLowerCase().includes(searchTermPosition.toLowerCase()),
  );
  const filteredDivisions = (divisions || []).filter(
    (div) =>
      div && div.toLowerCase().includes(searchTermDivision.toLowerCase()),
  );
  const filteredManagers = managers.filter((manager) =>
    manager.name.toLowerCase().includes(managerSearchTerm.toLowerCase()),
  );
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingEmployee ? "Edit Karyawan" : "Tambah Karyawan Baru"}
          </DialogTitle>
          <DialogDescription>
            {editingEmployee
              ? "Perbarui informasi karyawan"
              : "Masukkan data karyawan baru"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nik">NIK/Nomor Pegawai *</Label>
              <Input
                id="nik"
                value={formData.nik}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Tanggal Lahir *</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Jenis Kelamin *</Label>
              <Select
                value={formData.gender || ""}
                onValueChange={(value) => handleSelectChange("gender", value)}
                required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis kelamin" />
                </SelectTrigger>
                <SelectContent>
                  {(genders || []).filter(Boolean).map((gender) => (
                    <SelectItem key={gender} value={gender}>
                      {gender}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Jabatan *</Label>
              <Input
                id="position-search"
                placeholder="Cari jabatan..."
                value={searchTermPosition}
                onChange={(e) => setSearchTermPosition(e.target.value)}
                className="mb-2"
              />
              <Select
                value={formData.position || ""}
                onValueChange={(value) => handleSelectChange("position", value)}
                required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jabatan" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {filteredJobPositions.length > 0 ? (
                    filteredJobPositions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Jabatan tidak ditemukan
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="division">Divisi *</Label>
              <Input
                id="division-search"
                placeholder="Cari divisi..."
                value={searchTermDivision}
                onChange={(e) => setSearchTermDivision(e.target.value)}
                className="mb-2"
              />
              <Select
                value={formData.division || ""}
                onValueChange={(value) => handleSelectChange("division", value)}
                required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih divisi" />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {filteredDivisions.length > 0 ? (
                    filteredDivisions.map((division) => (
                      <SelectItem key={division} value={division}>
                        {division}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      Divisi tidak ditemukan
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinDate">Tanggal Masuk *</Label>
              <Input
                id="joinDate"
                type="date"
                value={formData.joinDate || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="termination_date">Tanggal Keluar</Label>
              <Input
                id="termination_date"
                type="date"
                value={formData.termination_date || ""}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status Karyawan *</Label>
              <Select
                value={formData.status || ""}
                onValueChange={(value) => handleSelectChange("status", value)}
                required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status karyawan" />
                </SelectTrigger>
                <SelectContent>
                  {(statuses || []).filter(Boolean).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="active_status">Status Aktif *</Label>
              <Select
                value={formData.active_status || ""}
                onValueChange={(value) =>
                  handleSelectChange("active_status", value)
                }
                required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status aktif" />
                </SelectTrigger>
                <SelectContent>
                  {(activeStatuses || []).filter(Boolean).map((as) => (
                    <SelectItem key={as} value={as}>
                      {as}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="direct_manager_id">Direct Manager (Atasan)</Label>
              <Select
                value={formData.direct_manager_id || "none"}
                onValueChange={(value) =>
                  handleSelectChange("direct_manager_id", value)
                }>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih atasan langsung" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Cari manajer..."
                        value={managerSearchTerm}
                        onChange={(e) => setManagerSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <SelectItem value="none">Tidak ada atasan</SelectItem>
                  {filteredManagers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Proyek (Opsional)</Label>
              <Input
                id="project"
                value={formData.project || ""}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (Opsional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon (Opsional)</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workLocation">Lokasi Kerja *</Label>
              <Select
                value={formData.workLocation || ""}
                onValueChange={(value) =>
                  handleSelectChange("workLocation", value)
                }
                required>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih lokasi kerja" />
                </SelectTrigger>
                <SelectContent>
                  {(workLocations || []).filter(Boolean).map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="education">Pendidikan Terakhir</Label>
              <Select
                value={formData.education || ""}
                onValueChange={(value) =>
                  handleSelectChange("education", value)
                }>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pendidikan" />
                </SelectTrigger>
                <SelectContent>
                  {(educationLevels || []).filter(Boolean).map((edu) => (
                    <SelectItem key={edu} value={edu}>
                      {edu}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area Project</Label>
              <Input
                id="area"
                value={formData.area || ""}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bpjs_number">Nomor BPJS (Jika Ada)</Label>
              <Input
                id="bpjs_number"
                value={formData.bpjs_number || ""}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npwp">NPWP (Opsional)</Label>
              <Input
                id="npwp"
                value={formData.npwp || ""}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ptkp_status">Status PTKP (Opsional)</Label>
              <Input
                id="ptkp_status"
                value={formData.ptkp_status || ""}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dependents_count">
                Jumlah Tanggungan (Opsional)
              </Label>
              <Input
                id="dependents_count"
                type="number"
                value={formData.dependents_count || ""}
                onChange={handleChange}
                min="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat (Sesuai KTP) *</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="photo">URL Foto (Opsional)</Label>
            <Input
              id="photo"
              type="url"
              value={formData.photo || ""}
              onChange={handleChange}
              placeholder="https://example.com/photo.jpg"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder={
                  editingEmployee
                    ? "Kosongkan jika tidak ingin mengubah"
                    : "Password default: karyawan123"
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!editingEmployee && (
              <p className="text-xs text-muted-foreground">
                Password default akan digunakan jika dikosongkan.
              </p>
            )}
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-blue-500 to-purple-600 disabled:opacity-60 disabled:cursor-not-allowed">
              {isSubmitting
                ? "Menyimpan..."
                : editingEmployee
                  ? "Perbarui Karyawan"
                  : "Tambah Karyawan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
EmployeeFormDialog.FilterSelect = ({
  value,
  onValueChange,
  placeholder,
  options,
  allValue = "all",
}) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent className="max-h-60 overflow-y-auto">
      <SelectItem value={allValue}>{placeholder}</SelectItem>
      {(options || [])
        .filter((option) => option)
        .map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
    </SelectContent>
  </Select>
);
export default EmployeeFormDialog;
