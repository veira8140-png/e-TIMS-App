import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  ShieldCheck, 
  Bell, 
  TrendingUp, 
  CreditCard, 
  Smartphone,
  MapPin,
  AlertTriangle,
  ChevronRight,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  LogOut,
  Lock,
  DollarSign,
  BarChart3,
  FileText,
  Download,
  Trash2,
  Edit2,
  X,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

// Types based on your schema
interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  tax_rate: number;
}

interface Transaction {
  id: string;
  branch_id: string;
  total: number;
  payment_method: string;
  created_at: string;
}

interface Alert {
  name: string;
  quantity: number;
  reorder_level: number;
  branch_name: string;
}

interface DashboardData {
  revenue: number;
  profit: number;
  transaction_count: number;
  topItems: { name: string; sold: number }[];
  salesByMethod: { method: string; total: number }[];
  salesTrend: { date: string; total: number }[];
  alerts: Alert[];
}

interface User {
  id: string;
  name: string;
  role: string;
  branch_id: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('veira_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loginId, setLoginId] = useState('STF-001');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'inventory' | 'staff' | 'reports'>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    revenue: 0,
    profit: 0,
    transaction_count: 0,
    topItems: [],
    salesByMethod: [],
    salesTrend: [],
    alerts: []
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState<any>(null);
  const [showProductModal, setShowProductModal] = useState<any>(null);
  const [showStaffModal, setShowStaffModal] = useState<any>(null);
  const [reportRange, setReportRange] = useState({ start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] });
  const [reportData, setReportData] = useState<any[]>([]);

  // Real-time updates via WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'NEW_TRANSACTION') {
        fetchDashboard();
      }
    };

    fetchDashboard();
    fetchProducts();
    fetchStaff();

    return () => socket.close();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboardData(data);
    } catch (e) {
      console.error("Failed to fetch dashboard", e);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      setProducts(data);
    } catch (e) {
      console.error("Failed to fetch products", e);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff');
      const data = await res.json();
      setStaffList(data);
    } catch (e) {
      console.error("Failed to fetch staff", e);
    }
  };

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/reports/sales?start=${reportRange.start}&end=${reportRange.end}`);
      const data = await res.json();
      setReportData(data);
    } catch (e) {
      console.error("Failed to fetch report", e);
    }
  };

  const exportCSV = () => {
    try {
      if (reportData.length === 0) return;
      const headers = Object.keys(reportData[0]).join(',');
      const rows = reportData.map(row => 
        Object.values(row).map(val => `"${val}"`).join(',')
      ).join('\n');
      const csv = `${headers}\n${rows}`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `veira_report_${reportRange.start}_to_${reportRange.end}.csv`);
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = showProductModal.id ? 'PUT' : 'POST';
    const url = showProductModal.id ? `/api/products/${showProductModal.id}` : '/api/products';
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(showProductModal)
    });
    setShowProductModal(null);
    fetchProducts();
  };

  const saveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(showStaffModal)
    });
    setShowStaffModal(null);
    fetchStaff();
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0), [cart]);
  const cartTotal = Math.max(0, cartSubtotal - discount);

  const handleCheckout = async (method: string) => {
    if (cart.length === 0 || !user) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: user.branch_id,
          staff_id: user.id,
          total: cartTotal,
          discount: discount,
          payment_method: method,
          items: cart.map(item => ({ 
            product_id: item.product.id, 
            quantity: item.quantity,
            unit_price: item.product.price
          }))
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShowReceipt({
          id: data.id,
          items: cart,
          total: cartTotal,
          discount,
          method,
          date: new Date().toLocaleString()
        });
        setCart([]);
        setDiscount(0);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: loginId, pin: loginPin })
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem('veira_user', JSON.stringify(data.user));
      } else {
        setLoginError(data.message);
      }
    } catch (err) {
      setLoginError('Connection error');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('veira_user');
    setActiveTab('dashboard');
  };

  if (!user) {
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
            <p className="text-stone-400 text-sm mt-1">Cloud-Based Business Management</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">Staff ID</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                <input 
                  type="text" 
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className="w-full bg-stone-50 border border-black/5 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-black/5 font-medium"
                  placeholder="STF-001"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">Security PIN</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                <input 
                  type="password" 
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="w-full bg-stone-50 border border-black/5 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-black/5 font-medium tracking-widest"
                  placeholder="••••"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            {loginError && (
              <motion.p 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-xs font-bold text-red-500 text-center"
              >
                {loginError}
              </motion.p>
            )}

            <button 
              type="submit"
              className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg shadow-black/10 active:scale-95 transition-all"
            >
              Sign In to Terminal
            </button>

            <p className="text-center text-[10px] text-stone-400 font-medium">
              Demo Access: STF-001 / PIN: 1234
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F5F5] text-[#1A1A1A] font-sans overflow-hidden">
      {/* Sidebar */}
      <nav className="w-20 lg:w-64 bg-white border-r border-black/10 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/10">
            <TrendingUp size={24} />
          </div>
          <span className="hidden lg:block font-bold text-xl tracking-tight">Veira POS</span>
        </div>

        <div className="flex-1 px-3 space-y-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavItem active={activeTab === 'pos'} onClick={() => setActiveTab('pos')} icon={<ShoppingCart size={20} />} label="Terminal" />
          <NavItem active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20} />} label="Inventory" />
          <NavItem active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={<Users size={20} />} label="Staff" />
          <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={20} />} label="Reports" />
        </div>

        <div className="p-4 border-t border-black/5 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-stone-50">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-bold">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-semibold">{user.name}</p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            <span className="hidden lg:block text-sm font-bold">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-bottom border-black/5 px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold capitalize">{activeTab}</h1>
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-stone-100 relative">
              <Bell size={20} />
              {dashboardData.alerts.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
            <div className="h-8 w-[1px] bg-black/5"></div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-500">
              <MapPin size={16} />
              Westlands Main Store
            </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard label="Today's Revenue" value={`KES ${dashboardData.revenue.toLocaleString()}`} trend="+12.5%" icon={<DollarSign size={20} />} />
                  <StatCard label="Today's Profit" value={`KES ${dashboardData.profit.toLocaleString()}`} trend="+8.2%" icon={<TrendingUp size={20} />} />
                  <StatCard label="Transactions" value={dashboardData.transaction_count.toString()} trend="+4.2%" icon={<ShoppingCart size={20} />} />
                  <StatCard label="Active Alerts" value={dashboardData.alerts.length.toString()} trend="Critical" isAlert={dashboardData.alerts.length > 0} icon={<AlertTriangle size={20} />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Sales Trend Chart */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
                    <h3 className="font-semibold mb-6">Sales Trend (Last 7 Days)</h3>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboardData.salesTrend}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            formatter={(value: any) => [`KES ${value.toLocaleString()}`, 'Revenue']}
                          />
                          <Line type="monotone" dataKey="total" stroke="#000000" strokeWidth={3} dot={{ r: 4, fill: '#000000' }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top Selling Items */}
                  <div className="bg-white rounded-2xl border border-black/5 p-6 shadow-sm">
                    <h3 className="font-semibold mb-6">Top Selling Items</h3>
                    <div className="space-y-4">
                      {dashboardData.topItems.map((item, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-xs font-bold text-stone-500">{i + 1}</div>
                            <span className="text-sm font-medium">{item.name}</span>
                          </div>
                          <span className="text-xs font-bold bg-stone-100 text-black px-2 py-1 rounded-full">{item.sold} sold</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'pos' && (
              <motion.div 
                key="pos"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-160px)]"
              >
                {/* Product Selection */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="Search products or scan barcode..." 
                      className="w-full bg-white border border-black/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2">
                    {products.map(product => (
                      <button 
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className="bg-white p-4 rounded-2xl border border-black/5 hover:border-black transition-all text-left group"
                      >
                        <div className="aspect-square bg-stone-100 rounded-xl mb-3 flex items-center justify-center text-stone-300">
                          <Package size={32} />
                        </div>
                        <p className="text-sm font-bold group-hover:text-black truncate">{product.name}</p>
                        <p className="text-xs text-stone-500 mb-2">{product.sku}</p>
                        <p className="text-base font-black">KES {product.price.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cart / Checkout */}
                <div className="bg-white rounded-3xl border border-black/5 shadow-xl flex flex-col overflow-hidden">
                  <div className="p-6 border-b border-black/5">
                    <h3 className="font-bold text-lg">Current Order</h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-bold">{item.product.name}</p>
                          <p className="text-xs text-stone-500">KES {item.product.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200"><Minus size={14} /></button>
                          <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 rounded-lg bg-stone-100 hover:bg-stone-200"><Plus size={14} /></button>
                          <button onClick={() => removeFromCart(item.product.id)} className="ml-2 text-stone-300 hover:text-red-500"><ChevronRight size={18} /></button>
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-stone-300 py-12">
                        <ShoppingCart size={48} className="mb-4 opacity-20" />
                        <p className="text-sm">Cart is empty</p>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-stone-50 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-500">Subtotal</span>
                      <span className="font-bold">KES {cartSubtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-500">Discount</span>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-400">KES</span>
                        <input 
                          type="number" 
                          value={discount}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="w-20 bg-white border border-black/5 rounded-lg px-2 py-1 text-right font-bold focus:outline-none focus:ring-2 focus:ring-black/5"
                        />
                      </div>
                    </div>
                    <div className="pt-4 border-t border-black/5 flex justify-between items-end">
                      <span className="text-stone-500 font-medium">Total Amount</span>
                      <span className="text-2xl font-black text-black">KES {cartTotal.toLocaleString()}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-4">
                      <PaymentButton 
                        onClick={() => handleCheckout('M-Pesa')} 
                        disabled={cart.length === 0 || isProcessing}
                        icon={<Smartphone size={18} />} 
                        label="M-Pesa" 
                        color="bg-black" 
                      />
                      <PaymentButton 
                        onClick={() => handleCheckout('Card')} 
                        disabled={cart.length === 0 || isProcessing}
                        icon={<CreditCard size={18} />} 
                        label="Card" 
                        color="bg-stone-800" 
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Product Management</h2>
                  <button 
                    onClick={() => setShowProductModal({ id: '', name: '', sku: '', price: 0, cost_price: 0, tax_rate: 0.16, category_id: 'CAT-001' })}
                    className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-black/10"
                  >
                    <Plus size={20} /> Add Product
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 border-b border-black/5">
                      <tr>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Product</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">SKU</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Cost</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Price</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Profit</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {products.map(p => (
                        <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4 font-bold text-sm">{p.name}</td>
                          <td className="px-6 py-4 text-sm text-stone-500">{p.sku}</td>
                          <td className="px-6 py-4 text-sm">KES {p.cost_price?.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm font-bold">KES {p.price.toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-black font-bold">KES {(p.price - (p.cost_price || 0)).toLocaleString()}</td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => setShowProductModal(p)} className="p-2 text-stone-400 hover:text-black"><Edit2 size={16} /></button>
                            <button className="p-2 text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'staff' && (
              <motion.div 
                key="staff"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Staff Directory</h2>
                  <button 
                    onClick={() => setShowStaffModal({ id: '', name: '', role: 'cashier', pin: '', branch_id: 'BR-001' })}
                    className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-black/10"
                  >
                    <Plus size={20} /> Add Staff
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {staffList.map(s => (
                    <div key={s.id} className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold">
                        {s.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{s.name}</p>
                        <p className="text-xs text-stone-500 uppercase tracking-wider">{s.role}</p>
                      </div>
                      <button className="p-2 text-stone-300 hover:text-stone-600"><ChevronRight size={20} /></button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">Start Date</label>
                    <input 
                      type="date" 
                      value={reportRange.start}
                      onChange={(e) => setReportRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-2 focus:outline-none"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-2">End Date</label>
                    <input 
                      type="date" 
                      value={reportRange.end}
                      onChange={(e) => setReportRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-2 focus:outline-none"
                    />
                  </div>
                  <button 
                    onClick={fetchReport}
                    className="bg-black text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-black/10"
                  >
                    Generate
                  </button>
                  <button 
                    onClick={exportCSV}
                    disabled={reportData.length === 0}
                    className="bg-stone-800 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-stone-800/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Download size={18} /> Export CSV
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-black/5 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 border-b border-black/5">
                      <tr>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Date</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">ID</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Staff</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Method</th>
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {reportData.map(r => (
                        <tr key={r.id} className="hover:bg-stone-50 transition-colors">
                          <td className="px-6 py-4 text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm font-mono">{r.id}</td>
                          <td className="px-6 py-4 text-sm">{r.staff_name}</td>
                          <td className="px-6 py-4 text-sm uppercase">{r.payment_method}</td>
                          <td className="px-6 py-4 text-sm font-bold">KES {r.total.toLocaleString()}</td>
                        </tr>
                      ))}
                      {reportData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-stone-400">No data for selected range</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-stone-100 text-black rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-black mb-1">Payment Successful</h2>
              <p className="text-stone-500 text-sm mb-6">Transaction ID: {showReceipt.id}</p>
              
              <div className="border-t border-dashed border-stone-200 py-4 space-y-2 text-left">
                {showReceipt.items.map((item: any) => (
                  <div key={item.product.id} className="flex justify-between text-xs">
                    <span>{item.product.name} x{item.quantity}</span>
                    <span className="font-bold">KES {(item.product.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                {showReceipt.discount > 0 && (
                  <div className="flex justify-between text-xs text-red-500 font-bold">
                    <span>Discount</span>
                    <span>- KES {showReceipt.discount.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-stone-100 pt-4 flex justify-between items-center mb-8">
                <span className="text-sm font-bold">Total Paid</span>
                <span className="text-xl font-black text-black">KES {showReceipt.total.toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowReceipt(null)} className="py-3 rounded-xl bg-stone-100 font-bold text-sm">Close</button>
                <button onClick={() => window.print()} className="py-3 rounded-xl bg-black text-white font-bold text-sm flex items-center justify-center gap-2">
                  <Printer size={16} /> Print
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">{showProductModal.id ? 'Edit Product' : 'Add New Product'}</h3>
                <button onClick={() => setShowProductModal(null)}><X size={24} /></button>
              </div>
              <form onSubmit={saveProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Product Name</label>
                    <input 
                      type="text" 
                      value={showProductModal.name}
                      onChange={(e) => setShowProductModal({ ...showProductModal, name: e.target.value })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-2 mt-1"
                      required
                    />
                  </div>
                  {!showProductModal.id && (
                    <div>
                      <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">ID</label>
                      <input 
                        type="text" 
                        value={showProductModal.id}
                        onChange={(e) => setShowProductModal({ ...showProductModal, id: e.target.value })}
                        className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-2 mt-1"
                        placeholder="PRD-XXX"
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">SKU</label>
                    <input 
                      type="text" 
                      value={showProductModal.sku}
                      onChange={(e) => setShowProductModal({ ...showProductModal, sku: e.target.value })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-2 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Cost Price</label>
                    <input 
                      type="number" 
                      value={showProductModal.cost_price}
                      onChange={(e) => setShowProductModal({ ...showProductModal, cost_price: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-2 mt-1"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Selling Price</label>
                    <input 
                      type="number" 
                      value={showProductModal.price}
                      onChange={(e) => setShowProductModal({ ...showProductModal, price: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl px-4 py-2 mt-1"
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-black text-white py-4 rounded-xl font-bold mt-4">Save Product</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
        active 
          ? 'bg-black text-white font-bold' 
          : 'text-stone-500 hover:bg-stone-50'
      }`}
    >
      {icon}
      <span className="hidden lg:block text-sm">{label}</span>
    </button>
  );
}

function StatCard({ label, value, trend, icon, isAlert }: { label: string; value: string; trend: string; icon: React.ReactNode; isAlert?: boolean }) {
  return (
    <div className={`bg-white p-6 rounded-2xl border border-black/5 shadow-sm ${isAlert ? 'ring-2 ring-red-500/20' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isAlert ? 'bg-red-50 text-red-600' : 'bg-stone-50 text-stone-500'}`}>
          {icon}
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
          isAlert ? 'bg-red-50 text-red-600' : 'bg-stone-100 text-black'
        }`}>
          {trend}
        </span>
      </div>
      <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">{label}</p>
      <h2 className="text-2xl font-black tracking-tight">{value}</h2>
    </div>
  );
}

function PaymentButton({ onClick, disabled, icon, label, color }: { onClick: () => void; disabled: boolean; icon: React.ReactNode; label: string; color: string }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold transition-all active:scale-95 disabled:opacity-50 disabled:grayscale ${color} shadow-lg shadow-black/10`}
    >
      {icon}
      {label}
    </button>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-stone-50 rounded-xl border border-black/5">
      <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function LogItem({ id, status }: { id: string; status: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="font-mono text-stone-500">{id}</span>
      <span className="text-black font-bold">{status}</span>
    </div>
  );
}
