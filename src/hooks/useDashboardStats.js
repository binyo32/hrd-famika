import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/components/ui/use-toast";
import { getEmployees } from "@/lib/employeeService";
import {
  Users,
  UserCheck,
  Briefcase,
  Clock,
  UserPlus,
  UserX,
  UserMinus,
} from "lucide-react";
import {
  format,
  addDays,
  isAfter,
  parseISO,
  addYears,
  differenceInMonths,
  differenceInDays,
  getMonth,
  getDate,
  isWithinInterval,
  startOfDay,
} from "date-fns";

export const useDashboardStats = () => {
  const [employees, setEmployees] = useState([]);
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [mppEmployees, setMppEmployees] = useState([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const employeeData = await getEmployees();
        setEmployees(employeeData);

        const today = startOfDay(new Date());
        const next30Days = addDays(today, 30);

        const { data: contractData, error: contractError } = await supabase
          .from("employee_contracts")
          .select("*, employee:employees (id, name, nik, photo)")
          .not("end_date", "is", null)
          .gte("end_date", format(today, "yyyy-MM-dd"))
          .lte("end_date", format(next30Days, "yyyy-MM-dd"))
          .order("end_date", { ascending: true });

        if (contractError) throw contractError;

        const activeContracts = (contractData || [])
          .map((c) => ({
            ...c,
            employee: c.employee || {
              id: c.employee_id,
              name: "Karyawan Tidak Ditemukan",
              nik: "-",
              photo: null,
            },
          }))
          .filter((c) =>
            employeeData.some(
              (e) => e.id === c.employee_id && e.activeStatus === "Aktif",
            ),
          );

        setExpiringContracts(activeContracts);

        const currentYear = today.getFullYear();
        const birthdayEmployees = employeeData
          .filter((emp) => emp.birthDate && emp.activeStatus === "Aktif")
          .map((emp) => {
            const birthDate = parseISO(emp.birthDate);
            const birthdayThisYear = new Date(
              currentYear,
              getMonth(birthDate),
              getDate(birthDate),
            );
            return { ...emp, birthdayThisYear };
          })
          .filter((emp) =>
            isWithinInterval(emp.birthdayThisYear, {
              start: today,
              end: next30Days,
            }),
          )
          .sort((a, b) => a.birthdayThisYear - b.birthdayThisYear);

        setUpcomingBirthdays(birthdayEmployees);
      } catch (error) {
        toast({
          title: "Error",
          description: "Gagal memuat data dasbor: " + error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    if (employees.length === 0) {
      return {
        employees: [],
        loading: true,
        expiringContracts: [],
        mppEmployees: [],
        upcomingBirthdays: [],
        employmentStatus: [],
        activeStatusDistribution: [],
        ageCategory: [],
        genderDiversity: [],
        lengthOfService: [],
        jobLevel: [],
        provinceDistribution: [],
      };
    }
    const today = startOfDay(new Date());
    // Ambil hanya karyawan aktif
    const activeEmployees = employees.filter(
      (emp) => emp.activeStatus === "Aktif",
    );

    const total = activeEmployees.length;

    // Hitung status berdasarkan karyawan aktif saja
    const statusCounts = activeEmployees.reduce((acc, emp) => {
      const status = emp.status || "Tidak Diketahui";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const employmentStatus = Object.entries(statusCounts).map(
      ([name, value]) => ({
        name,
        value,
        description: `Karyawan ${name.toLowerCase()} (Aktif)`,
        icon:
          name === "Tetap"
            ? UserCheck
            : name === "Kontrak"
              ? Briefcase
              : UserPlus,
        color:
          name === "Tetap"
            ? "from-green-500 to-green-600"
            : name === "Kontrak"
              ? "from-blue-500 to-blue-600"
              : "from-orange-500 to-orange-600",
        bgColor:
          name === "Tetap"
            ? "bg-green-50 dark:bg-green-900/20"
            : name === "Kontrak"
              ? "bg-blue-50 dark:bg-blue-900/20"
              : "bg-orange-50 dark:bg-orange-900/20",
        percentage: total > 0 ? (value / total) * 100 : 0,
        filter: { type: "status", value: name },
      }),
    );

    employmentStatus.unshift({
      name: "Total Karyawan",
      value: total,
      description: "Semua karyawan aktif",
      icon: Users,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      filter: { type: "activeStatus", value: "Aktif" },
    });

    const activeStatusCounts = employees.reduce((acc, emp) => {
      const status = emp.activeStatus || "Tidak Diketahui";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    const activeStatusDistribution = Object.entries(activeStatusCounts).map(
      ([name, value]) => {
        let icon = UserCheck;
        let color = "from-gray-500 to-gray-600";
        let bgColor = "bg-gray-50 dark:bg-gray-900/20";
        switch (name) {
          case "Aktif":
            icon = UserCheck;
            color = "from-green-500 to-green-600";
            bgColor = "bg-green-50 dark:bg-green-900/20";
            break;
          case "Tidak Aktif":
            icon = UserX;
            color = "from-red-500 to-red-600";
            bgColor = "bg-red-50 dark:bg-red-900/20";
            break;
          case "Cuti":
            icon = Clock;
            color = "from-yellow-500 to-yellow-600";
            bgColor = "bg-yellow-50 dark:bg-yellow-900/20";
            break;
          case "Resign":
            icon = UserMinus;
            color = "from-slate-500 to-slate-600";
            bgColor = "bg-slate-50 dark:bg-slate-900/20";
            break;
        }
        return {
          name,
          value,
          description: `Karyawan dengan status ${name.toLowerCase()}`,
          icon,
          color,
          bgColor,
          percentage: total > 0 ? (value / total) * 100 : 0,
          filter: { type: "activeStatus", value: name },
        };
      },
    );

    const ageCategories = employees.reduce(
      (acc, emp) => {
        if (emp.age === null || emp.age === undefined) return acc;
        if (emp.age < 30) acc.under30 = (acc.under30 || 0) + 1;
        else if (emp.age >= 30 && emp.age <= 58)
          acc.between30_58 = (acc.between30_58 || 0) + 1;
        else if (emp.age > 58) acc.over58 = (acc.over58 || 0) + 1;
        return acc;
      },
      { under30: 0, between30_58: 0, over58: 0 },
    );
    const ageCategory = [
      {
        name: "< 30 Tahun",
        value: ageCategories.under30,
        percentage: total > 0 ? (ageCategories.under30 / total) * 100 : 0,
        description: "Usia di bawah 30 tahun",
        filter: { type: "age", value: "under30" },
      },
      {
        name: "30-58 Tahun",
        value: ageCategories.between30_58,
        percentage: total > 0 ? (ageCategories.between30_58 / total) * 100 : 0,
        description: "Usia 30 hingga 58 tahun",
        filter: { type: "age", value: "between30_58" },
      },
      {
        name: "> 58 Tahun",
        value: ageCategories.over58,
        percentage: total > 0 ? (ageCategories.over58 / total) * 100 : 0,
        description: "Usia di atas 58 tahun",
        filter: { type: "age", value: "over58" },
      },
    ];

    const genderCounts = employees.reduce((acc, emp) => {
      acc[emp.gender] = (acc[emp.gender] || 0) + 1;
      return acc;
    }, {});
    const genderDiversity = Object.entries(genderCounts).map(
      ([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? value / total : 0,
        filter: { type: "gender", value: name },
      }),
    );

    const serviceLengths = employees.reduce(
      (acc, emp) => {
        if (
          emp.workDurationYears === null ||
          emp.workDurationYears === undefined
        )
          return acc;
        if (emp.workDurationYears < 5) acc.under5 = (acc.under5 || 0) + 1;
        else if (emp.workDurationYears > 10) acc.over10 = (acc.over10 || 0) + 1;
        else acc.between5_10 = (acc.between5_10 || 0) + 1;
        return acc;
      },
      { under5: 0, over10: 0, between5_10: 0 },
    );
    const lengthOfService = [
      {
        name: "< 5 Tahun",
        value: serviceLengths.under5,
        percentage: total > 0 ? (serviceLengths.under5 / total) * 100 : 0,
        description: "Masa kerja di bawah 5 tahun",
        filter: { type: "service", value: "under5" },
      },
      {
        name: "5-10 Tahun",
        value: serviceLengths.between5_10,
        percentage: total > 0 ? (serviceLengths.between5_10 / total) * 100 : 0,
        description: "Masa kerja 5 hingga 10 tahun",
        filter: { type: "service", value: "between5_10" },
      },
      {
        name: "> 10 Tahun",
        value: serviceLengths.over10,
        percentage: total > 0 ? (serviceLengths.over10 / total) * 100 : 0,
        description: "Masa kerja di atas 10 tahun",
        filter: { type: "service", value: "over10" },
      },
    ];

    const jobLevelCounts = employees.reduce((acc, emp) => {
      const position = emp.position || "Tidak Diketahui";
      acc[position] = (acc[position] || 0) + 1;
      return acc;
    }, {});
    const jobLevel = Object.entries(jobLevelCounts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        filter: { type: "position", value: name },
      }))
      .sort((a, b) => b.value - a.value);

    const provinceCounts = employees.reduce((acc, emp) => {
      const area = emp.area || "Tidak Diketahui";
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {});
    const provinceDistribution = Object.entries(provinceCounts)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        filter: { type: "area", value: name },
      }))
      .sort((a, b) => b.value - a.value);

    const mppEmployees = employees
      .filter((emp) => emp.age === 57 && emp.activeStatus === "Aktif")
      .map((emp) => {
        const birthDate = parseISO(emp.birthDate);
        const retirementDate = addYears(birthDate, 58);
        const totalDays = differenceInDays(retirementDate, today);
        const months = Math.floor(totalDays / 30);
        const days = totalDays % 30;
        return {
          ...emp,
          retirementDate: format(retirementDate, "dd MMMM yyyy"),
          timeRemaining: { months, days },
        };
      })
      .sort(
        (a, b) =>
          a.timeRemaining.months * 30 +
          a.timeRemaining.days -
          (b.timeRemaining.months * 30 + b.timeRemaining.days),
      );

    return {
      employees,
      loading,
      expiringContracts,
      mppEmployees,
      upcomingBirthdays,
      employmentStatus,
      activeStatusDistribution,
      ageCategory,
      genderDiversity,
      lengthOfService,
      jobLevel,
      provinceDistribution,
    };
  }, [employees, loading, expiringContracts, upcomingBirthdays]);

  return stats;
};
