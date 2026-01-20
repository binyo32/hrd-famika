"use client";

import React, { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMySubordinates } from "@/lib/fetchMySubordinates";
import { motion } from "framer-motion";
const Skeleton = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/60 ${className}`}
    />
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

  useEffect(() => {
    if (!user?.id) return;
    loadMyTeam();
  }, [user]);

  const loadMyTeam = async () => {
    setLoading(true);
    const data = await fetchMySubordinates(user.id);
    setEmployees(data);
    setLoading(false);
  };
  

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
                  {employees.map((emp, index) => (
                    <TableRow key={emp.id}>
                      <TableCell>{index + 1}</TableCell>
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
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default EmployeeTeamPage;
