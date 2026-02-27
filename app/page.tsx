import Link from "next/link";
import { TrendingUp, ArrowRight, Shield, Zap, BarChart3 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Navigation */}
      <nav className="border-b border-black/5 px-8 py-4 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <TrendingUp size={20} />
          </div>
          <span className="font-bold text-xl tracking-tight">Veira POS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-bold hover:text-stone-600 transition-colors">
            Sign In
          </Link>
          <Link href="/signup" className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-800 transition-all">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-8 py-24 max-w-7xl mx-auto text-center">
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-none">
          THE MODERN POS <br /> FOR MODERN BUSINESS.
        </h1>
        <p className="text-xl text-stone-500 max-w-2xl mx-auto mb-12 font-medium">
          Scalable, secure, and multi-tenant. Manage your inventory, sales, and team with a production-ready system built for growth.
        </p>
        <div className="flex flex-col md:flex-row items-center justify-center gap-4">
          <Link href="/signup" className="w-full md:w-auto bg-black text-white px-8 py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-xl shadow-black/20">
            Start Your Free Trial <ArrowRight size={20} />
          </Link>
          <Link href="/login" className="w-full md:w-auto bg-stone-100 text-black px-8 py-4 rounded-2xl text-lg font-bold hover:bg-stone-200 transition-all">
            View Demo
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-8 py-24 bg-stone-50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <FeatureCard 
            icon={<Shield size={32} />}
            title="Secure Multi-tenancy"
            description="Strict data isolation using Row Level Security (RLS) and shop-based scoping."
          />
          <FeatureCard 
            icon={<Zap size={32} />}
            title="Atomic Transactions"
            description="Ensuring data integrity with database-level transactions for every sale."
          />
          <FeatureCard 
            icon={<BarChart3 size={32} />}
            title="Real-time Analytics"
            description="Track your revenue, profit, and trends with a powerful dashboard."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-12 border-t border-black/5 text-center">
        <p className="text-stone-400 text-sm font-medium">
          © 2024 Veira POS. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="space-y-4">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-black/5">
        {icon}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-stone-500 leading-relaxed font-medium">{description}</p>
    </div>
  );
}
