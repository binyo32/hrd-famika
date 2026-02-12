import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { supabase } from "../lib/supabaseClient";
import { Button } from "@/components/ui/button";
import MessagesFormDialog from "../components/admin/messages/MessagesFormDialog";
import { motion } from "framer-motion";
import { MessageSquareDashed } from "lucide-react";

const AdminMessages = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [employeesMap, setEmployeesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentMessage, setCurrentMessage] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchMessages();
  }, []);

  const fetchEmployees = async () => {
    const { data } = await supabase.from("employees").select("id, name");

    if (data) {
      const map = {};
      data.forEach((emp) => {
        map[emp.id] = emp.name;
      });
      setEmployeesMap(map);
    }
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select(
        `
    *,
    profiles:created_by (
      id,
      role,
      employee_id,
      employees (
        id,
        name
      )
    )
  `,
      )
      .order("created_at", { ascending: false });

    if (!error) {
      setMessages(data);
      console.log(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (formData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const audience =
      formData.audience === "all"
        ? { type: "all" }
        : {
            type: "specific",
            employee_ids: formData.employee_ids || [],
          };

    if (currentMessage) {
      // UPDATE
      await supabase
        .from("messages")
        .update({
          title: formData.title,
          content: formData.content,
          grade: formData.grade,
          audience,
        })
        .eq("id", currentMessage.id);
    } else {
      // CREATE
      await supabase.from("messages").insert([
        {
          created_by: user.id,
          title: formData.title,
          content: formData.content,
          grade: formData.grade,
          audience,
        },
      ]);
    }

    setCurrentMessage(null);
    setIsOpen(false);
    fetchMessages();
  };
  const handleDelete = async (id) => {
    const confirmDelete = confirm("Yakin ingin menghapus pesan ini?");
    if (!confirmDelete) return;

    await supabase.from("messages").delete().eq("id", id);
    fetchMessages();
  };

  const renderAudience = (audience) => {
    if (!audience) return "-";

    if (audience.type === "all") {
      return (
        <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
          Semua Employee
        </span>
      );
    }

    if (audience.type === "specific") {
      return (
        <div className="flex flex-wrap gap-2">
          {audience.employee_ids?.map((id) => (
            <span
              key={id}
              className="text-xs bg-blue-200 dark:text-blue-800 px-2 py-1 rounded">
              {employeesMap[id] || "Unknown"}
            </span>
          ))}
        </div>
      );
    }

    return "-";
  };
  const renderGrade = (grade = "basic") => {
    const styles = {
      basic: "bg-green-100 text-green-700 border-green-200",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
      important: "bg-red-100 text-red-700 border-red-200",
    };

    const label = {
      basic: "Basic",
      warning: "Warning",
      important: "Important",
    };

    return (
      <span
        className={`text-xs font-medium px-3 py-1 rounded-full border ${styles[grade] || styles.basic}`}>
        {label[grade] || "Basic"}
      </span>
    );
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Pesan Admin
            </h1>
            <p className="text-muted-foreground">
              Bagikan pesan untuk seluruh tim atau beberapa employee.
            </p>
          </div>
          <Button onClick={() => setIsOpen(true)}>+ Buat Pesan Baru</Button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-500 dark:text-white">Belum ada pengumuman.</p>
        ) : (
          <div className="grid gap-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="border rounded-xl p-5 shadow-sm bg-white dark:bg-background dark:text-white space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold">
                      {msg.title}- {renderGrade(msg.grade)}
                    </h2>
                  </div>

                  <span className="text-xs text-gray-400">
                    {new Date(msg.created_at).toLocaleString()}
                  </span>
                </div>

                <p className="text-gray-700 dark:text-white whitespace-pre-line">
                  {msg.content}
                </p>

                <div>
                  <p className="text-sm font-medium mb-1">Target Audiens:</p>
                  {renderAudience(msg.audience)}
                </div>
                <div className="flex justify-between items-center gap-2 pt-3 border-t">
                  <div>
                    <p className="text-sm font-medium mb-1">Created By:</p>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {msg.profiles?.role ||
                        msg.profiles?.name ||
                        "Unknown"}
                    </span>
                  </div>

                  <div className=" flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setCurrentMessage(msg);
                        setIsOpen(true);
                      }}>
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(msg.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <MessagesFormDialog
          isOpen={isOpen}
          onOpenChange={(value) => {
            setIsOpen(value);
            if (!value) setCurrentMessage(null);
          }}
          onSubmit={handleSubmit}
          currentMessage={currentMessage}
        />
      </div>
    </Layout>
  );
};

export default AdminMessages;
