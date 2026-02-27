"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Smartphone, 
  DollarSign,
  Package,
  Printer,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrency, cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function POSPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [showReceipt, setShowReceipt] = useState<any>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("is_deleted", false)
        .eq("is_active", true);
      setProducts(data || []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const addToCart = (product: any) => {
    if (product.stock_quantity <= 0) {
      toast.error("Out of stock!");
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast.error("Cannot add more than available stock");
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > item.stock_quantity) {
          toast.error("Insufficient stock");
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const handleCheckout = async (method: string) => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from("profiles")
        .select("shop_id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Call the atomic RPC function
      const { data: saleId, error } = await supabase.rpc("process_sale", {
        p_shop_id: profile.shop_id,
        p_profile_id: user.id,
        p_total_amount: total,
        p_subtotal: subtotal,
        p_discount_amount: discount,
        p_payment_method: method.toLowerCase(),
        p_items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.selling_price
        }))
      });

      if (error) throw error;

      toast.success("Sale completed successfully!");
      setShowReceipt({
        id: saleId,
        items: [...cart],
        total,
        subtotal,
        discount,
        method,
        date: new Date().toLocaleString()
      });
      setCart([]);
      setDiscount(0);

      // Refresh products to update stock
      const { data: updatedProducts } = await supabase
        .from("products")
        .select("*")
        .eq("is_deleted", false)
        .eq("is_active", true);
      setProducts(updatedProducts || []);

    } catch (error: any) {
      toast.error(error.message || "Checkout failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-160px)]">
      {/* Product Selection */}
      <div className="lg:col-span-2 flex flex-col gap-6 overflow-hidden">
        <div className="relative shrink-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
          <input 
            type="text" 
            placeholder="Search products or scan barcode..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-black/5 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-black/5 shadow-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <button 
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock_quantity <= 0}
                className={cn(
                  "bg-white p-4 rounded-2xl border border-black/5 hover:border-black transition-all text-left group relative",
                  product.stock_quantity <= 0 && "opacity-50 grayscale cursor-not-allowed"
                )}
              >
                <div className="aspect-square bg-stone-100 rounded-xl mb-3 flex items-center justify-center text-stone-300 group-hover:bg-stone-200 transition-colors">
                  <Package size={32} />
                </div>
                <p className="text-sm font-bold group-hover:text-black truncate">{product.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-stone-500">{product.sku || "No SKU"}</p>
                  <p className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded",
                    product.stock_quantity < 10 ? "bg-red-50 text-red-600" : "bg-stone-100 text-stone-600"
                  )}>
                    {product.stock_quantity} in stock
                  </p>
                </div>
                <p className="text-base font-black mt-2">{formatCurrency(product.selling_price)}</p>
                {product.stock_quantity <= 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl">
                    <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Out of Stock</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart / Checkout */}
      <div className="bg-white rounded-3xl border border-black/5 shadow-xl flex flex-col overflow-hidden">
        <div className="p-6 border-b border-black/5 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart size={20} />
            Current Order
          </h3>
          <span className="text-xs font-bold bg-stone-100 px-2 py-1 rounded-full">{cart.length} items</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <AnimatePresence initial={false}>
            {cart.map(item => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{item.name}</p>
                  <p className="text-xs text-stone-500">{formatCurrency(item.selling_price)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-stone-50 rounded-lg p-1">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)} 
                      className="p-1 rounded-md hover:bg-stone-200 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)} 
                      className="p-1 rounded-md hover:bg-stone-200 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)} 
                    className="text-stone-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-stone-300 py-12">
              <ShoppingCart size={48} className="mb-4 opacity-10" />
              <p className="text-sm font-medium">Your cart is empty</p>
              <p className="text-[10px] uppercase tracking-widest mt-1">Add products to start a sale</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-stone-50 border-t border-black/5 space-y-4 shrink-0">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">Subtotal</span>
              <span className="font-bold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-500">Discount</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-stone-400">KSh</span>
                <input 
                  type="number" 
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-20 bg-white border border-black/5 rounded-lg px-2 py-1 text-right font-bold focus:outline-none focus:ring-2 focus:ring-black/5 text-xs"
                />
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-black/10 flex justify-between items-end">
            <span className="text-stone-500 font-medium text-sm">Total Amount</span>
            <span className="text-3xl font-black text-black">{formatCurrency(total)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button 
              onClick={() => handleCheckout('Cash')} 
              disabled={cart.length === 0 || isProcessing}
              className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-white border border-black/5 text-black font-bold hover:bg-stone-100 transition-all disabled:opacity-50 shadow-sm"
            >
              <DollarSign size={20} />
              <span className="text-xs">Cash</span>
            </button>
            <button 
              onClick={() => handleCheckout('M-Pesa')} 
              disabled={cart.length === 0 || isProcessing}
              className="flex flex-col items-center justify-center gap-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
            >
              <Smartphone size={20} />
              <span className="text-xs">M-Pesa</span>
            </button>
            <button 
              onClick={() => handleCheckout('Card')} 
              disabled={cart.length === 0 || isProcessing}
              className="col-span-2 flex items-center justify-center gap-2 py-4 rounded-2xl bg-black text-white font-bold hover:bg-stone-800 transition-all disabled:opacity-50 shadow-lg shadow-black/20"
            >
              <CreditCard size={20} />
              <span className="text-sm">Pay with Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center border-b border-dashed border-stone-200">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart size={24} />
                </div>
                <h2 className="text-xl font-black">Sale Completed</h2>
                <p className="text-xs text-stone-500 mt-1">Receipt #{showReceipt.id.slice(0, 8)}</p>
              </div>

              <div className="p-8 space-y-4">
                <div className="space-y-2">
                  {showReceipt.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-stone-600">{item.name} x{item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.selling_price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-dashed border-stone-200 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">Subtotal</span>
                    <span>{formatCurrency(showReceipt.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-400">Discount</span>
                    <span className="text-red-500">-{formatCurrency(showReceipt.discount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black pt-2">
                    <span>Total</span>
                    <span>{formatCurrency(showReceipt.total)}</span>
                  </div>
                </div>
                <div className="pt-4 text-center">
                  <p className="text-[10px] text-stone-400 uppercase tracking-widest">Paid via {showReceipt.method}</p>
                  <p className="text-[10px] text-stone-400 mt-1">{showReceipt.date}</p>
                </div>
              </div>

              <div className="p-6 bg-stone-50 flex gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex-1 bg-white border border-black/5 text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-100 transition-all"
                >
                  <Printer size={18} /> Print
                </button>
                <button 
                  onClick={() => setShowReceipt(null)}
                  className="flex-1 bg-black text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all"
                >
                  <X size={18} /> Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
