"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight,
  Filter
} from "lucide-react";
import { motion } from "motion/react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchSales();
  }, [dateRange]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("*, profiles(full_name)")
        .gte("created_at", `${dateRange.start}T00:00:00Z`)
        .lte("created_at", `${dateRange.end}T23:59:59Z`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSales(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (sales.length === 0) return;

    const headers = ["ID", "Date", "Staff", "Method", "Subtotal", "Discount", "Total"];
    const rows = sales.map(s => [
      s.id,
      new Date(s.created_at).toLocaleString(),
      s.profiles?.full_name || "Unknown",
      s.payment_method.toUpperCase(),
      s.subtotal,
      s.discount_amount,
      s.total_amount
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `veira_sales_report_${dateRange.start}_to_${dateRange.end}.csv`);
    link.click();
    toast.success("Report exported!");
  };

  const totalRevenue = sales.reduce((acc, s) => acc + Number(s.total_amount), 0);
  const totalTransactions = sales.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Sales Reports</h2>
          <p className="text-sm text-stone-500">Analyze your business performance</p>
        </div>
        <button 
          onClick={exportToCSV}
          disabled={sales.length === 0}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-black/10 active:scale-95 transition-all disabled:opacity-50"
        >
          <Download size={20} />
          Export CSV
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex flex-wrap items-end gap-6">
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="bg-stone-50 border border-black/5 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">End Date</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="bg-stone-50 border border-black/5 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
            />
          </div>
        </div>
        <div className="flex-1"></div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total Revenue</p>
            <p className="text-xl font-black">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="h-10 w-[1px] bg-black/5"></div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Transactions</p>
            <p className="text-xl font-black">{totalTransactions}</p>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/50 border-b border-black/5">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Date & Time</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Transaction ID</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Staff</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Method</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Amount</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-4 bg-stone-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : sales.length > 0 ? (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">
                      {new Date(sale.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-xs text-stone-400 font-mono">
                      {sale.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-bold text-stone-500">
                          {sale.profiles?.full_name?.[0] || "U"}
                        </div>
                        <span className="text-sm font-medium">{sale.profiles?.full_name || "Unknown"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-stone-100 px-2 py-1 rounded-full">
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold">{formatCurrency(sale.total_amount)}</p>
                      {sale.discount_amount > 0 && (
                        <p className="text-[10px] text-red-500">Disc: -{formatCurrency(sale.discount_amount)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-wider">
                        Completed
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-stone-300">
                      <FileText size={48} className="mb-4 opacity-10" />
                      <p className="text-sm font-medium">No sales found for this range</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
