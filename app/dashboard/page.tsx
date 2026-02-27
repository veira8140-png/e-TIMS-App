"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { motion } from "motion/react";
import { formatCurrency, cn } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    revenue: 0,
    profit: 0,
    transactions: 0,
    alerts: 0
  });
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Fetch Today's Stats
        const { data: salesData } = await supabase
          .from("sales")
          .select("total_amount, subtotal")
          .gte("created_at", today.toISOString());

        const revenue = salesData?.reduce((acc, s) => acc + Number(s.total_amount), 0) || 0;
        const transactions = salesData?.length || 0;

        // 2. Fetch Low Stock Alerts
        const { count: alertsCount } = await supabase
          .from("products")
          .select("*", { count: 'exact', head: true })
          .lt("stock_quantity", 10) // Example threshold
          .eq("is_deleted", false);

        setStats({
          revenue,
          profit: revenue * 0.25, // Placeholder for profit logic
          transactions,
          alerts: alertsCount || 0
        });

        // 3. Fetch Sales Trend (Last 7 days)
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        
        const { data: trendData } = await supabase
          .from("sales")
          .select("total_amount, created_at")
          .gte("created_at", last7Days.toISOString());

        // Group by date
        const groupedTrend = trendData?.reduce((acc: any, s) => {
          const date = new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          acc[date] = (acc[date] || 0) + Number(s.total_amount);
          return acc;
        }, {});

        setSalesTrend(Object.entries(groupedTrend || {}).map(([date, total]) => ({ date, total })));

        // 4. Fetch Top Items
        const { data: itemsData } = await supabase
          .from("sale_items")
          .select("product_id, quantity, products(name)")
          .limit(5);

        setTopItems(itemsData || []);

      } catch (error) {
        console.error("Dashboard error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Today's Revenue" 
          value={formatCurrency(stats.revenue)} 
          trend="+12.5%" 
          icon={<DollarSign size={20} />} 
        />
        <StatCard 
          label="Today's Profit" 
          value={formatCurrency(stats.profit)} 
          trend="+8.2%" 
          icon={<TrendingUp size={20} />} 
        />
        <StatCard 
          label="Transactions" 
          value={stats.transactions.toString()} 
          trend="+4.2%" 
          icon={<ShoppingCart size={20} />} 
        />
        <StatCard 
          label="Low Stock Alerts" 
          value={stats.alerts.toString()} 
          trend="Critical" 
          isAlert={stats.alerts > 0} 
          icon={<AlertTriangle size={20} />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold">Sales Trend (Last 7 Days)</h3>
            <select className="text-xs bg-stone-50 border border-black/5 rounded-lg px-2 py-1 outline-none">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#888' }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#888' }} 
                  tickFormatter={(val) => `KSh ${val}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#000000" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#000000' }} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
          <h3 className="font-semibold mb-6">Top Selling Items</h3>
          <div className="space-y-4">
            {topItems.length > 0 ? topItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500 group-hover:bg-black group-hover:text-white transition-colors">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium">{item.products?.name || "Unknown Product"}</span>
                </div>
                <span className="text-xs font-bold bg-stone-100 text-black px-2 py-1 rounded-full">
                  {item.quantity} sold
                </span>
              </div>
            )) : (
              <div className="text-center py-12 text-stone-400 text-sm">
                No sales data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, trend, icon, isAlert }: { label: string; value: string; trend: string; icon: React.ReactNode; isAlert?: boolean }) {
  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className={`bg-white p-6 rounded-2xl border border-black/5 shadow-sm ${isAlert ? 'ring-2 ring-red-500/20' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAlert ? 'bg-red-50 text-red-600' : 'bg-stone-50 text-stone-500'}`}>
          {icon}
        </div>
        <div className={cn(
          "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
          isAlert ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
        )}>
          {isAlert ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
          {trend}
        </div>
      </div>
      <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">{label}</p>
      <h2 className="text-2xl font-black tracking-tight">{value}</h2>
    </motion.div>
  );
}
