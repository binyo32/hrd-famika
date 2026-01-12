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

const AttendanceMapTab = ({
  records,
  employees,
  filterDate,
  setFilterDate,
  filterEmployee,
  setFilterEmployee,
}) => {
  const selectedEmployee = employees.find(
    (e) => e.id === filterEmployee
  );

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
                  className="w-full justify-between"
                >
                  {selectedEmployee
                    ? selectedEmployee.name
                    : "Semua Karyawan"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="w-[300px] p-0 z-[9999]"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Cari karyawan..." />
                  <CommandList>
                    <CommandEmpty>
                      Karyawan tidak ditemukan
                    </CommandEmpty>

                    <CommandItem
                      value="ALL"
                      onSelect={() => setFilterEmployee("")}
                    >
                      Semua Karyawan
                      {!filterEmployee && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </CommandItem>

                    {employees.map((e) => (
                      <CommandItem
                        key={e.id}
                        value={e.name}
                        onSelect={() =>
                          setFilterEmployee(e.id)
                        }
                      >
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

        {/* ===== MAP ===== */}
        <div className="relative z-0">
          <AttendanceMap records={records} />
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceMapTab;
