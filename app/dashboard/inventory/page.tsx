"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Package, 
  Filter,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category_id: "",
    cost_price: 0,
    selling_price: 0,
    stock_quantity: 0,
    low_stock_threshold: 5,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: productsData } = await supabase
      .from("products")
      .select("*, categories(name)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });
    
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*");

    setProducts(productsData || []);
    setCategories(categoriesData || []);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const payload = {
        ...formData,
        shop_id: profile.shop_id,
        category_id: formData.category_id || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { error } = await supabase
          .from("products")
          .insert(payload);
        if (error) throw error;
        toast.success("Product created");
      }

      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        sku: "",
        category_id: "",
        cost_price: 0,
        selling_price: 0,
        stock_quantity: 0,
        low_stock_threshold: 5,
      });
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save product");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_deleted: true })
        .eq("id", id);
      if (error) throw error;
      toast.success("Product deleted");
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete product");
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Inventory</h2>
          <p className="text-sm text-stone-500">Manage your products and stock levels</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({
              name: "",
              sku: "",
              category_id: "",
              cost_price: 0,
              selling_price: 0,
              stock_quantity: 0,
              low_stock_threshold: 5,
            });
            setShowModal(true);
          }}
          className="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-black/10 active:scale-95 transition-all"
        >
          <Plus size={20} />
          Add Product
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-black/5 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name or SKU..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-stone-50 border border-black/5 rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2.5 bg-stone-50 border border-black/5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-stone-100 transition-colors">
            <Filter size={16} />
            Categories
          </button>
          <button className="px-4 py-2.5 bg-stone-50 border border-black/5 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-stone-100 transition-colors">
            Stock Status
          </button>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/50 border-b border-black/5">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Product</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Category</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">SKU</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Stock</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold">Price</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-stone-400 font-bold text-right">Actions</th>
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
              ) : filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 shrink-0">
                          <Package size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-black">{product.name}</p>
                          <p className="text-[10px] text-stone-400 uppercase tracking-wider">ID: {product.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium bg-stone-100 px-2 py-1 rounded-full text-stone-600">
                        {product.categories?.name || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-500 font-mono">{product.sku || "-"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-bold",
                          product.stock_quantity <= product.low_stock_threshold ? "text-red-500" : "text-black"
                        )}>
                          {product.stock_quantity}
                        </span>
                        {product.stock_quantity <= product.low_stock_threshold && (
                          <AlertTriangle size={14} className="text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold">{formatCurrency(product.selling_price)}</p>
                      <p className="text-[10px] text-stone-400">Cost: {formatCurrency(product.cost_price)}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingProduct(product);
                            setFormData({
                              name: product.name,
                              sku: product.sku || "",
                              category_id: product.category_id || "",
                              cost_price: product.cost_price,
                              selling_price: product.selling_price,
                              stock_quantity: product.stock_quantity,
                              low_stock_threshold: product.low_stock_threshold,
                            });
                            setShowModal(true);
                          }}
                          className="p-2 text-stone-400 hover:text-black hover:bg-stone-100 rounded-lg transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-stone-300">
                      <Package size={48} className="mb-4 opacity-10" />
                      <p className="text-sm font-medium">No products found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-stone-50/50 border-t border-black/5 flex items-center justify-between">
          <p className="text-xs text-stone-500 font-medium">
            Showing <span className="text-black font-bold">{filteredProducts.length}</span> products
          </p>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg border border-black/5 bg-white text-stone-400 hover:text-black disabled:opacity-50 transition-all">
              <ChevronLeft size={16} />
            </button>
            <button className="p-2 rounded-lg border border-black/5 bg-white text-stone-400 hover:text-black disabled:opacity-50 transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-black/5 flex items-center justify-between">
                <h3 className="text-lg font-black">{editingProduct ? "Edit Product" : "Add New Product"}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Product Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
                      placeholder="e.g. Wireless Mouse"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">SKU / Barcode</label>
                    <input 
                      type="text" 
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium font-mono"
                      placeholder="e.g. WMS-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Category</label>
                    <select 
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Stock Quantity</label>
                    <input 
                      type="number" 
                      required
                      value={formData.stock_quantity}
                      onChange={(e) => setFormData({ ...formData, stock_quantity: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Cost Price (KSh)</label>
                    <input 
                      type="number" 
                      required
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">Selling Price (KSh)</label>
                    <input 
                      type="number" 
                      required
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: Number(e.target.value) })}
                      className="w-full bg-stone-50 border border-black/5 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-black/5 text-sm font-medium"
                    />
                  </div>
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
                    {editingProduct ? "Update Product" : "Create Product"}
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
