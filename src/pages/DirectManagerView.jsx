import React, { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Building,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DirectManagerView = () => {
  const [groupedManagers, setGroupedManagers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openManagers, setOpenManagers] = useState({});
  const navigate = useNavigate();

  const [workLocations, setWorkLocations] = useState([]);
  const [areas, setAreas] = useState([]);
  const [selectedWorkLocation, setSelectedWorkLocation] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");

  const processEmployeeData = (employees) => {
    const managerMap = new Map();
    const uniqueWorkLocations = new Set();
    const uniqueAreas = new Set();

    employees.forEach((e) => {
      if (e.work_location) uniqueWorkLocations.add(e.work_location);
      if (e.area) uniqueAreas.add(e.area);
    });

    setWorkLocations(["all", ...Array.from(uniqueWorkLocations).sort()]);
    setAreas(["all", ...Array.from(uniqueAreas).sort()]);

    const managerIds = new Set(
      employees.map((e) => e.direct_manager_id).filter(Boolean)
    );

    managerIds.forEach((managerId) => {
      const managerInfo = employees.find((e) => e.id === managerId);
      if (managerInfo) {
        managerMap.set(managerId, {
          ...managerInfo,
          subordinates: employees.filter(
            (e) => e.direct_manager_id === managerId
          ),
        });
      }
    });

    const allManagers = Array.from(managerMap.values());
    const grouped = {};

    allManagers.forEach((manager) => {
      const workLocation = manager.work_location || "Tanpa Lokasi Kerja";
      const area = manager.area || "Tanpa Area";

      if (!grouped[workLocation]) {
        grouped[workLocation] = {};
      }
      if (!grouped[workLocation][area]) {
        grouped[workLocation][area] = [];
      }
      grouped[workLocation][area].push(manager);
    });

    for (const location in grouped) {
      for (const area in grouped[location]) {
        grouped[location][area].sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    setGroupedManagers(grouped);
  };

  const fetchAllEmployees = async () => {
    let allEmployees = [];
    let from = 0;
    const step = 1000;
    let keepFetching = true;

    while (keepFetching) {
      const { data, error } = await supabase
        .from("employees")
        .select(
          `
          id,
          name,
          photo,
          position,
          division,
          direct_manager_id,
          work_location,
          area
        `
        )
        .range(from, from + step - 1);

      if (error) {
        console.error("Error fetching employees in range:", error);
        throw error;
      }

      if (data) {
        allEmployees.push(...data);
      }

      if (!data || data.length < step) {
        keepFetching = false;
      }

      from += step;
    }
    return allEmployees;
  };

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const employees = await fetchAllEmployees();
      processEmployeeData(employees);
    } catch (error) {
      console.error("Error fetching managers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();

    const channel = supabase
      .channel("employees-direct-manager-view")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        (payload) => {
          fetchInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInitialData]);

  const toggleManager = (managerId) => {
    setOpenManagers((prev) => ({ ...prev, [managerId]: !prev[managerId] }));
  };

  const filteredGroupedManagers = useMemo(() => {
    const filtered = {};
    const workLocationKeys =
      selectedWorkLocation === "all"
        ? Object.keys(groupedManagers)
        : groupedManagers[selectedWorkLocation]
        ? [selectedWorkLocation]
        : [];

    workLocationKeys.forEach((location) => {
      const areaKeys =
        selectedArea === "all"
          ? Object.keys(groupedManagers[location])
          : groupedManagers[location][selectedArea]
          ? [selectedArea]
          : [];

      areaKeys.forEach((area) => {
        const managers = groupedManagers[location][area].filter((manager) => {
          return (
            searchTerm === "" ||
            manager.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            manager.subordinates.some((sub) =>
              sub.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
          );
        });

        if (managers.length > 0) {
          if (!filtered[location]) {
            filtered[location] = {};
          }
          filtered[location][area] = managers;
        }
      });
    });

    return filtered;
  }, [groupedManagers, selectedWorkLocation, selectedArea, searchTerm]);

  const isEmpty = Object.keys(filteredGroupedManagers).length === 0;

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Tampilan Manajer Langsung
          </h1>
          <p className="text-muted-foreground">
            Lihat hierarki tim berdasarkan lokasi dan area.
          </p>
        </motion.div>

        <Card className="glass-effect border-0 shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Daftar Manajer</span>
              </CardTitle>
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <Select
                  value={selectedWorkLocation}
                  onValueChange={setSelectedWorkLocation}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Building className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Lokasi Kerja" />
                  </SelectTrigger>
                  <SelectContent>
                    {workLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location === "all" ? "Semua Lokasi" : location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedArea} onValueChange={setSelectedArea}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <MapPin className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area === "all" ? "Semua Area" : area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Cari manajer atau bawahan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-auto"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !isEmpty ? (
              <div className="space-y-6">
                {Object.entries(filteredGroupedManagers).map(
                  ([location, areas]) => (
                    <div key={location}>
                      <h2 className="text-lg font-semibold flex items-center mb-3 text-primary">
                        <Building className="h-5 w-5 mr-2" /> {location}
                      </h2>
                      <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                        {Object.entries(areas).map(([area, managers]) => (
                          <div key={area}>
                            <h3 className="text-md font-medium flex items-center mb-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 mr-2" /> {area}
                            </h3>
                            <div className="space-y-3 pl-4">
                              {managers.map((manager) => (
                                <motion.div
                                  key={manager.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  layout>
                                  <Card className="overflow-hidden bg-card/50">
                                    <div
                                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                                      onClick={() => toggleManager(manager.id)}>
                                      <div className="flex items-center space-x-3">
                                        <Avatar className="h-9 w-9">
                                          <AvatarImage src={manager.photo} />
                                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                                            {manager.name.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <p className="font-semibold text-sm">
                                            {manager.name}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {manager.position}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center space-x-3">
                                        <Badge variant="outline">
                                          {manager.subordinates.length} Bawahan
                                        </Badge>
                                        {openManagers[manager.id] ? (
                                          <ChevronUp className="h-4 w-4" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4" />
                                        )}
                                      </div>
                                    </div>
                                    <AnimatePresence initial={false}>
                                      {openManagers[manager.id] && (
                                        <motion.div
                                          key="subordinates"
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          exit={{ opacity: 0 }}
                                          transition={{
                                            duration: 0.2,
                                            ease: "easeInOut",
                                          }}
                                          layout
                                          className="bg-muted/20 p-3 border-t overflow-hidden">
                                          <h4 className="font-semibold mb-2 text-xs">
                                            Tim {manager.name}:
                                          </h4>

                                          {manager.subordinates.length > 0 ? (
                                            <ul className="space-y-2">
                                              {manager.subordinates.map(
                                                (subordinate) => (
                                                  <motion.li
                                                    key={subordinate.id}
                                                    layout
                                                    className="flex items-center justify-between p-2 rounded-md hover:bg-background cursor-pointer"
                                                    onClick={() =>
                                                      navigate(
                                                        `/admin/employees/${subordinate.id}`
                                                      )
                                                    }>
                                                    <div className="flex items-center space-x-3">
                                                      <Avatar className="h-8 w-8">
                                                        <AvatarImage
                                                          src={
                                                            subordinate.photo
                                                          }
                                                        />
                                                        <AvatarFallback>
                                                          {subordinate.name.charAt(
                                                            0
                                                          )}
                                                        </AvatarFallback>
                                                      </Avatar>
                                                      <div>
                                                        <p className="text-sm font-medium">
                                                          {subordinate.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                          {subordinate.position}
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <Badge variant="secondary">
                                                      {subordinate.division}
                                                    </Badge>
                                                  </motion.li>
                                                )
                                              )}
                                            </ul>
                                          ) : (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                              Manajer ini tidak memiliki bawahan
                                              langsung.
                                            </p>
                                          )}
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </Card>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Tidak Ada Manajer Ditemukan
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ||
                  selectedWorkLocation !== "all" ||
                  selectedArea !== "all"
                    ? "Tidak ada hasil yang cocok dengan filter atau pencarian Anda."
                    : "Tidak ada karyawan yang ditugaskan sebagai manajer."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default DirectManagerView;
