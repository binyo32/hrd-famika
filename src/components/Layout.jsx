import React, { useState, useEffect, useCallback } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  LayoutDashboard,
  Users,
  Megaphone,
  LogOut,
  UserCircle,
  Briefcase,
  ShoppingBasket as Sitemap,
  Fingerprint,
  Settings,
  History,
  UserCheck,
  FileText,
  UserCircle2Icon,
  UserXIcon,
  UserCog2,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { addLog } from "@/lib/activityLogService";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { supabase } from "@/lib/supabaseClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight } from "lucide-react";

const getNavLinks = (user, activeRole) => {
  // ADMIN MODE (KHUSUS role Admin)
  if (user.role === "Admin" && activeRole === "admin") {
    return [
      {
        to: "/admin/attendance-management",
        icon: Fingerprint,
        text: "Manajemen Absensi",
      },
    ];
  }

  // SUPER ADMIN (FULL)
  if (user.role === "Super Admin") {
    return [
      { to: "/admin/dashboard", icon: LayoutDashboard, text: "Dashboard" },
      { to: "/admin/employees", icon: Users, text: "Manajemen Karyawan" },
      { to: "/admin/direct-manager", icon: UserCheck, text: "Direct Manager" },
      { to: "/admin/announcements", icon: Megaphone, text: "Pengumuman" },
      {
        to: "/admin/leave-management",
        icon: Briefcase,
        text: "Manajemen Cuti",
      },
      {
        to: "/admin/contract-management",
        icon: FileText,
        text: "Manajemen Kontrak",
      },
      {
        to: "/admin/attendance-management",
        icon: Fingerprint,
        text: "Manajemen Absensi",
      },
      {
        to: "/admin/organization-chart",
        icon: Sitemap,
        text: "Struktur Organisasi",
      },
      { to: "/admin/settings", icon: Settings, text: "Pengaturan" },
      { to: "/admin/activity-log", icon: History, text: "Log Aktivitas" },
    ];
  }

  // EMPLOYEE DEFAULT
  const links = [
    { to: "/employee/dashboard", icon: LayoutDashboard, text: "Dashboard" },
    { to: "/employee/attendance", icon: Fingerprint, text: "Absensi" },
    {
      to: "/employee/leave-request",
      icon: Briefcase,
      text: "Pengajuan Cuti / Dinas",
    },
    { to: "/employee/profile", icon: UserCircle, text: "Profil Saya" },
  ];

  if (user.isPM) {
    links.splice(2, 0, {
      to: "/employee/pm-attendance",
      icon: UserCheck,
      text: "Absensi Tim",
    });
  }

  if (user.isDirectManager) {
    links.splice(2, 0, {
      to: "/employee/my-team",
      icon: UserCog2,
      text: "Tim Saya",
    });
  }

  return links;
};

const Sidebar = ({
  isOpen,
  isCollapsed,
  toggleSidebar,
  toggleCollapse,
  onLogout,
  activeRole,
  setActiveRole,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    if (user) {
      await addLog({
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action: "LOGOUT",
        targetType: "SESSION",
        details: { message: `User ${user.name || user.email} logged out.` },
      });
    }
    logout();
    navigate("/login");
  };

  const navLinks = getNavLinks(user, activeRole);

  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: "-100%" },
  };

  const navItemVariants = {
    open: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.05, delayChildren: 0.2 },
    },
    closed: { opacity: 0, y: 20 },
  };

  const linkVariants = {
    open: { opacity: 1, y: 0 },
    closed: { opacity: 0, y: 20 },
  };

  const collapsedWidth = "lg:w-20";
  const expandedWidth = "lg:w-64";

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      <motion.aside
        variants={sidebarVariants}
        initial="closed"
        animate={isOpen ? "open" : "closed"}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`
    fixed top-0 left-0 h-full
    w-[80vw] max-w-[320px]
    lg:w-64
    ${isCollapsed ? "lg:w-[80px]" : "lg:w-64"}
    bg-card text-card-foreground
    border-r border-border z-50
    flex flex-col transition-all duration-100
    lg:translate-x-0
    overflow-y-auto
  `}>
        {/* HEADER */}
        <div className="p-4 flex items-center justify-between ">
          {!isCollapsed && (
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              HRIS Famika
            </h1>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={toggleCollapse}
            className="hidden  lg:flex text-muted-foreground hover:text-foreground">
            {isCollapsed ? (
              <ChevronRight className="h-6 w-6" />
            ) : (
              <ChevronLeft className="h-6 w-6 " />
            )}
          </button>

          {/* Mobile Close */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* MENU */}
        <motion.nav
          className="flex-1 px-4 py-6 space-y-2 overflow-y-auto sidebar-scroll"
          variants={navItemVariants}>
          {navLinks.map((link) => (
            <motion.div key={link.to} variants={linkVariants}>
              <NavLink
                to={link.to}
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
                className={({ isActive }) =>
                  `
  flex items-center
  ${isCollapsed ? "justify-center px-0" : "px-4"}
  py-2.5 rounded-lg transition-all duration-200 text-sm font-medium
  ${
    isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"
  }
  `
                }>
                <link.icon
                  className={`h-5 w-5 ${!isCollapsed ? "mr-3" : ""}`}
                />

                {!isCollapsed && <span>{link.text}</span>}
              </NavLink>
            </motion.div>
          ))}
        </motion.nav>
        {user.role === "Admin" && (
          <button
            className="w-fit mx-auto mb-2 bg-gradient-to-r from-indigo-700 to-purple-800 hover:from-indigo-800 hover:to-indigo-900 text-white px-4 py-2 rounded-xl font-bold"
         onClick={() => {
  setActiveRole(activeRole === "admin" ? "employee" : "admin");
}}
>
            {activeRole === "admin"
              ? "Beralih ke Akun Karyawan"
              : "Beralih ke Akun Admin"}
          </button>
        )}

        {/* FOOTER */}
        <motion.div className="p-4 border-t" variants={navItemVariants}>
          <Button
            variant="ghost"
            onClick={onLogout}
            className="w-full justify-start space-x-3 text-red-500 hover:text-red-500 hover:bg-red-500/10">
            <LogOut className="h-5 w-5" />
            {!isCollapsed && <span>Logout</span>}
          </Button>

          <div className="flex justify-center mt-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-full">
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </motion.div>
      </motion.aside>
    </>
  );
};

const Header = ({
  toggleSidebar,
  isDesktop,
  onLogout,
  toggleCollapse,
  notifications,
  unreadCount,
  onOpenNotifications,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleNotificationClick = () => {
    const path =
      user.role === "admin" ? "/admin/announcements" : "/employee/dashboard";
    navigate(path);
  };
  const shouldAnimate = !isDesktop;

  return (
    <header
      className="fixed top-0 inset-x-0 z-40
  h-16
  bg-card/80 backdrop-blur-lg
  border-b border-border
  flex items-center justify-between
  px-4 md:px-8
  lg:static lg:z-auto
">
      <Button
        variant="ghost"
        size="icon"
        onClick={isDesktop ? toggleCollapse : toggleSidebar}
        className="lg:hidden">
        <Menu className="h-6 w-6" />
      </Button>
      <div className="lg:hidden"></div>
      <div className="flex items-center space-x-4 ml-auto">
        <DropdownMenu
          onOpenChange={(isOpen) => {
            if (isOpen) onOpenNotifications();
          }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 md:w-96">
            <DropdownMenuLabel className="flex justify-between items-center px-3 py-2">
              <span className="font-semibold">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                  {unreadCount} Baru
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notif) => (
                  <DropdownMenuItem
                    key={notif.id}
                    onSelect={handleNotificationClick}
                    className="cursor-pointer items-start p-3 gap-3">
                    <div className="flex items-center justify-center h-8 w-8 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/50">
                      <Megaphone className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex flex-col w-full">
                      <p className="font-medium text-sm text-foreground leading-tight whitespace-normal">
                        {notif.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notif.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-4 text-sm text-center text-muted-foreground">
                  Tidak ada notifikasi baru.
                </div>
              )}
            </div>
            {notifications.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onSelect={handleNotificationClick}
              className="justify-center cursor-pointer p-2 text-sm font-medium text-primary hover:text-primary focus:text-primary focus:bg-accent">
              Lihat semua pengumuman
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <UserCircle className="h-8 w-8 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48 border-none">
            {/* MOBILE ONLY */}
            {!isDesktop && (
              <>
                <DropdownMenuItem
                  onSelect={toggleSidebar}
                  className="cursor-pointer gap-2">
                  <Menu className="h-4 w-4" />
                  Menu
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem
              onSelect={() =>
                navigate(
                  user.role === "admin"
                    ? "/admin/profile"
                    : "/employee/profile",
                )
              }
              className="cursor-pointer gap-2">
              <UserCircle className="h-4 w-4" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={onLogout}
              className="cursor-pointer gap-2 text-red-600 focus:text-red-600">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const [isDesktop, setIsDesktop] = useState(
    window.matchMedia("(min-width: 1024px)").matches,
  );
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  // TAMBAHKAN
  const getActiveRole = (user) => {
    if (!user) return null;

    const stored = localStorage.getItem("activeRole");
    if (stored) return stored;

    // ❗ KHUSUS Admin saja
    if (user.role === "Admin") {
      return "employee";
    }

    return user.role === "Admin" ? "employee" : "employee";
  };

  const [activeRole, setActiveRole] = useState(() => getActiveRole(user));

  useEffect(() => {
    if (activeRole) {
      localStorage.setItem("activeRole", activeRole);
    }
  }, [activeRole]);
useEffect(() => {
  if (!activeRole || !user) return;
  if (user.role !== "Admin") return;

  // 🔒 Cegah override saat user klik menu
  if (activeRole === "admin") {
    if (!location.pathname.startsWith("/admin")) {
      navigate("/admin/attendance-management", { replace: true });
    }
  } else {
    if (!location.pathname.startsWith("/employee")) {
      navigate("/employee/dashboard", { replace: true });
    }
  }
}, [activeRole, user, location.pathname, navigate]);


  const { logout } = useAuth();

  const handleLogout = async () => {
    if (user) {
      await addLog({
        userId: user.id,
        userName: user.name || user.email,
        userRole: user.role,
        action: "LOGOUT",
        targetType: "SESSION",
        details: {
          message: `User ${user.name || user.email} logged out.`,
        },
      });
    }

    await logout();
    navigate("/login");
  };

  const showToast = useCallback(
    (announcement) => {
      toast({
        duration: 9000,
        title: (
          <div className="flex items-center gap-3">
            <Megaphone className="h-6 w-6 text-blue-500" />
            <span className="font-bold text-lg">Pengumuman Baru!</span>
          </div>
        ),
        description: (
          <div className="mt-2">
            <h3 className="font-semibold">{announcement.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
              {announcement.content}
            </p>
          </div>
        ),
      });
    },
    [toast, navigate, user],
  );

  const fetchNotifications = useCallback(
    async (isInitialFetch = false) => {
      if (!user) return;
      try {
        let query = supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10);

        if (user?.role === "employee") {
          query = query.or("audience.eq.all,audience.is.null");
        }

        const { data, error } = await query;
        if (error) throw error;

        const announcements = data || [];
        setNotifications(announcements.slice(0, 5));

        const seenAnnouncements = JSON.parse(
          localStorage.getItem("seen_announcements") || "[]",
        );
        const newUnreadCount = announcements.filter(
          (ann) => !seenAnnouncements.includes(ann.id),
        ).length;
        setUnreadCount(newUnreadCount);

        if (isInitialFetch) {
          const unreadAnnouncements = announcements.filter(
            (ann) => !seenAnnouncements.includes(ann.id),
          );
          if (unreadAnnouncements.length > 0) {
            showToast(unreadAnnouncements[0]);
            const newSeen = [
              ...new Set([...seenAnnouncements, unreadAnnouncements[0].id]),
            ];
            localStorage.setItem("seen_announcements", JSON.stringify(newSeen));
            setUnreadCount(newUnreadCount - 1);
          }
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    },
    [user, showToast],
  );

  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("announcements-channel")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        (payload) => {
          const newAnnouncement = payload.new;
          if (
            user?.role === "employee" &&
            newAnnouncement.audience === "admin"
          ) {
            return;
          }

          showToast(newAnnouncement);
          fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate, fetchNotifications, showToast]);

  const handleOpenNotifications = () => {
    if (unreadCount > 0) {
      const currentlyDisplayedIds = notifications.map((n) => n.id);
      const seenAnnouncements = JSON.parse(
        localStorage.getItem("seen_announcements") || "[]",
      );
      const newSeen = [
        ...new Set([...seenAnnouncements, ...currentlyDisplayedIds]),
      ];
      localStorage.setItem("seen_announcements", JSON.stringify(newSeen));
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleResize = () => {
      setIsDesktop(mediaQuery.matches);
      if (mediaQuery.matches) {
        setIsSidebarOpen(false);
      }
    };
    mediaQuery.addEventListener("change", handleResize);
    return () => mediaQuery.removeEventListener("change", handleResize);
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (location.pathname === "/login" || !user) {
    return <main>{children}</main>;
  }

  const sidebarVisible = isSidebarOpen || isDesktop;

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      <Sidebar
        isOpen={isSidebarOpen || isDesktop}
        isCollapsed={isCollapsed}
        toggleSidebar={toggleSidebar}
        toggleCollapse={toggleCollapse}
        onLogout={handleLogout}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
      />

      <div
        className={`
    flex-1 flex flex-col min-w-0
    transition-all duration-300
    ${isDesktop ? (isCollapsed ? "lg:pl-20" : "lg:pl-64") : ""}
  `}>
        <Header
          toggleSidebar={toggleSidebar}
          isDesktop={isDesktop}
          onLogout={handleLogout}
          toggleCollapse={toggleCollapse}
          notifications={notifications}
          unreadCount={unreadCount}
          onOpenNotifications={handleOpenNotifications}
        />
        <main className="flex-1 min-w-0 mt-12 md:mt-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
