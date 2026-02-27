import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      shops: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          settings: any;
          created_at: string;
          updated_at: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          shop_id: string;
          full_name: string;
          role: 'admin' | 'cashier';
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          category_id: string | null;
          name: string;
          sku: string | null;
          description: string | null;
          cost_price: number;
          selling_price: number;
          stock_quantity: number;
          low_stock_threshold: number;
          is_active: boolean;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
      };
      categories: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      sales: {
        Row: {
          id: string;
          shop_id: string;
          profile_id: string;
          total_amount: number;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          payment_method: 'cash' | 'mpesa' | 'card';
          status: string;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};
