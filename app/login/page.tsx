"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TrendingUp, Lock, Mail } from "lucide-react";
import { motion } from "motion/react";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Logged in successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-black/5 overflow-hidden"
      >
        <div className="bg-black p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <TrendingUp size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Veira POS</h1>
          <p className="text-stone-400 text-sm mt-1">Sign in to your shop terminal</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-stone-50 border border-black/5 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-black/5 font-medium"
                placeholder="admin@veira.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-stone-50 border border-black/5 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-black/5 font-medium"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg shadow-black/10 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="text-center text-xs text-stone-500">
            Don't have a shop?{" "}
            <Link href="/signup" className="text-black font-bold hover:underline">
              Create one now
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
