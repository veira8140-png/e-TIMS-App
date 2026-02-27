"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  LogOut, 
  TrendingUp,
  Menu,
  X,
  Bell,
  MapPin
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: ShoppingCart, label: "Terminal", href: "/dashboard/pos" },
  { icon: Package, label: "Inventory", href: "/dashboard/inventory" },
  { icon: Users, label: "Staff", href: "/dashboard/staff" },
  { icon: FileText, label: "Reports", href: "/dashboard/reports" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*, shops(*)")
        .eq("id", session.user.id)
        .single();
      
      setProfile(profileData);
    };

    getUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (!user || !profile) return null;

  return (
    <div className="flex h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-black/10 flex flex-col transition-all duration-300 z-30",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/10 shrink-0">
            <TrendingUp size={24} />
          </div>
          {isSidebarOpen && (
            <span className="font-bold text-xl tracking-tight truncate">Veira POS</span>
          )}
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all group",
                  isActive 
                    ? "bg-black text-white font-bold shadow-lg shadow-black/10" 
                    : "text-stone-500 hover:bg-stone-50"
                )}
              >
                <item.icon size={20} className={cn("shrink-0", isActive ? "text-white" : "group-hover:text-black")} />
                {isSidebarOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-black/5 space-y-2">
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-xl bg-stone-50",
            !isSidebarOpen && "justify-center"
          )}>
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold shrink-0">
              {profile.full_name?.[0] || "U"}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate">{profile.full_name}</p>
                <p className="text-[10px] text-stone-500 uppercase tracking-wider">{profile.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut size={20} className="shrink-0" />
            {isSidebarOpen && <span className="text-sm font-bold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-black/5 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-stone-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-semibold capitalize">
              {pathname.split("/").pop() === "dashboard" ? "Overview" : pathname.split("/").pop()}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-stone-100 relative">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-[1px] bg-black/5"></div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
              <MapPin size={16} />
              {profile.shops?.name}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
