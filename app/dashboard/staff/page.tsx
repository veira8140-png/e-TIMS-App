"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, 
  Users, 
  Shield, 
  UserPlus, 
  MoreVertical, 
  Mail,
  Smartphone,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function StaffPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "cashier",
    password: ""
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch staff");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.error("Staff invitation flow requires Supabase Admin API or Server Action with Service Role. For this demo, please use the signup flow for new users.");
    // In a real production app, you'd use a server action with supabase.auth.admin.createUser
    // to invite staff members and then create their profile.
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Staff Management</h2>
          <p className="text-sm text-stone-500">Manage team members and permissions</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-black/10 active:scale-95 transition-all"
        >
          <UserPlus size={20} />
          Add Team Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-3xl border border-black/5 animate-pulse"></div>
          ))
        ) : staff.map((member) => (
          <motion.div 
            key={member.id}
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm flex flex-col justify-between group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-400 font-bold text-lg group-hover:bg-black group-hover:text-white transition-all">
                  {member.full_name?.[0] || "U"}
                </div>
                <div>
                  <h3 className="font-bold text-black">{member.full_name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Shield size={12} className="text-stone-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                      {member.role}
                    </span>
                  </div>
                </div>
              </div>
              <button className="p-2 text-stone-300 hover:text-black hover:bg-stone-50 rounded-lg transition-all">
                <MoreVertical size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <Mail size={14} className="text-stone-300" />
                <span>{member.email || "No email provided"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>Active Account</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-black/5 flex items-center justify-between">
              <div className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">
                Joined {new Date(member.created_at).toLocaleDateString()}
              </div>
              <button className="text-[10px] font-bold text-stone-400 hover:text-red-500 transition-colors">
                Disable Access
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <h3 className="text-lg font-black">Add Team Member</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddStaff} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
                      placeholder="e.g. Jane Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Role</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
                    >
                      <option value="cashier">Cashier</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-black/5">
                  <p className="text-[10px] text-stone-500 leading-relaxed italic">
                    Note: For security, team members must be invited via the Supabase Dashboard or a custom Admin API. This form is a UI placeholder for the invitation flow.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 bg-stone-100 text-stone-600 py-3 rounded-xl font-bold hover:bg-stone-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-black text-white py-3 rounded-xl font-bold shadow-lg shadow-black/10 hover:bg-stone-800 transition-all"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
