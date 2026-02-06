"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMySubordinates } from "@/lib/fetchMySubordinates";
import { motion } from "framer-motion";
const Skeleton = ({ className = "" }) => {
  return (
    <div className={`animate-pulse rounded-md bg-muted/60 ${className}`} />
  );
};

const TableSkeleton = ({ rows = 5 }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>No</TableHead>
          <TableHead>Nama Karyawan</TableHead>
          <TableHead>Jabatan</TableHead>
          <TableHead>Divisi</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Telepon</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-6" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-40" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-24 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-48" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-28" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
const EmployeeTeamPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

 useEffect(() => {
 if (!user?.employeeData?.id) return;
  loadMyTeam();
}, [user?.employeeData?.id]);

  const loadMyTeam = async () => {
    setLoading(true);
     const data = await fetchMySubordinates(user.employeeData.id);
    setEmployees(data);
    setLoading(false);
  };
  const filteredEmployees = employees.filter((emp) =>
    emp.name?.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredEmployees.length / pageSize);

  const paginatedEmployees = filteredEmployees.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Data Tim Saya
          </h1>
          <p className="text-muted-foreground">
            Data karyawan bawahan langsung Anda.
          </p>
        </motion.div>

        <Card>
          <CardContent>
            <div className="flex flex-col mt-5 md:flex-row md:items-center md:justify-between gap-4 mb-4">
              {/* SEARCH */}
              <input
                type="text"
                placeholder="Cari nama karyawan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-64 rounded-md border px-3 py-2 text-sm"
              />

              {/* PAGE SIZE */}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-32 rounded-md border px-2 py-2 text-sm">
                <option value={10}>10 baris</option>
                <option value={25}>25 baris</option>
                <option value={50}>50 baris</option>
              </select>
            </div>
            {loading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <TableSkeleton rows={5} />
              </motion.div>
            ) : employees.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Anda tidak memiliki bawahan
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No</TableHead>
                    <TableHead>Nama Karyawan</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Divisi</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telepon</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {paginatedEmployees.map((emp, index) => (
                    <TableRow key={emp.id}>
                      <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
                      <TableCell>{emp.name}</TableCell>
                      <TableCell>{emp.position}</TableCell>
                      <TableCell>
                        <Badge variant="primary">{emp.division}</Badge>
                      </TableCell>
                      <TableCell>{emp.email || "-"}</TableCell>
                      <TableCell>{emp.phone || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Menampilkan {(page - 1) * pageSize + 1}–
                {Math.min(page * pageSize, filteredEmployees.length)} dari{" "}
                {filteredEmployees.length} data
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages || totalPages === 0}
                  onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EmployeeTeamPage;
