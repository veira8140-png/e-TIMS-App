-- Supabase SQL Schema for Veira POS
-- Multi-tenant strategy: shared database with shop_id column and RLS

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Shops table
CREATE TABLE shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL, -- References auth.users
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Profiles table (linked to auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Categories table
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    description TEXT,
    cost_price DECIMAL(12,2) DEFAULT 0,
    selling_price DECIMAL(12,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Sales table
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id),
    total_amount DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'mpesa', 'card')),
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create SaleItems table
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create StockMovements table
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL, -- Positive for addition, negative for deduction
    type TEXT NOT NULL CHECK (type IN ('sale', 'adjustment', 'return', 'restock')),
    reason TEXT,
    reference_id UUID, -- Can link to sale_id or other records
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Create AuditLogs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Indexes for performance
CREATE INDEX idx_profiles_shop_id ON profiles(shop_id);
CREATE INDEX idx_categories_shop_id ON categories(shop_id);
CREATE INDEX idx_products_shop_id ON products(shop_id);
CREATE INDEX idx_sales_shop_id ON sales(shop_id);
CREATE INDEX idx_sale_items_shop_id ON sale_items(shop_id);
CREATE INDEX idx_stock_movements_shop_id ON stock_movements(shop_id);
CREATE INDEX idx_audit_logs_shop_id ON audit_logs(shop_id);

-- 11. Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get the current user's shop_id
CREATE OR REPLACE FUNCTION get_auth_shop_id()
RETURNS UUID AS $$
    SELECT shop_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Shops Policies
CREATE POLICY "Users can view their own shop" ON shops
    FOR SELECT USING (id = get_auth_shop_id());

-- Profiles Policies
CREATE POLICY "Users can view profiles in their shop" ON profiles
    FOR SELECT USING (shop_id = get_auth_shop_id());

-- Categories Policies
CREATE POLICY "Users can manage categories in their shop" ON categories
    FOR ALL USING (shop_id = get_auth_shop_id());

-- Products Policies
CREATE POLICY "Users can manage products in their shop" ON products
    FOR ALL USING (shop_id = get_auth_shop_id());

-- Sales Policies
CREATE POLICY "Users can manage sales in their shop" ON sales
    FOR ALL USING (shop_id = get_auth_shop_id());

-- SaleItems Policies
CREATE POLICY "Users can manage sale items in their shop" ON sale_items
    FOR ALL USING (shop_id = get_auth_shop_id());

-- StockMovements Policies
CREATE POLICY "Users can manage stock movements in their shop" ON stock_movements
    FOR ALL USING (shop_id = get_auth_shop_id());

-- AuditLogs Policies
CREATE POLICY "Users can view audit logs in their shop" ON audit_logs
    FOR SELECT USING (shop_id = get_auth_shop_id());

-- 12. Atomic Sale RPC Function
CREATE OR REPLACE FUNCTION process_sale(
    p_shop_id UUID,
    p_profile_id UUID,
    p_total_amount DECIMAL,
    p_subtotal DECIMAL,
    p_discount_amount DECIMAL,
    p_payment_method TEXT,
    p_items JSONB -- Array of {product_id, quantity, unit_price}
) RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Insert Sale record
    INSERT INTO sales (shop_id, profile_id, total_amount, subtotal, discount_amount, payment_method)
    VALUES (p_shop_id, p_profile_id, p_total_amount, p_subtotal, p_discount_amount, p_payment_method)
    RETURNING id INTO v_sale_id;

    -- 2. Process each item
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, unit_price DECIMAL)
    LOOP
        -- a. Check stock
        IF (SELECT stock_quantity FROM products WHERE id = v_item.product_id) < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_item.product_id;
        END IF;

        -- b. Deduct stock
        UPDATE products 
        SET stock_quantity = stock_quantity - v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.product_id;

        -- c. Insert Sale Item
        INSERT INTO sale_items (shop_id, sale_id, product_id, quantity, unit_price, total_price)
        VALUES (p_shop_id, v_sale_id, v_item.product_id, v_item.quantity, v_item.unit_price, v_item.quantity * v_item.unit_price);

        -- d. Record Stock Movement
        INSERT INTO stock_movements (shop_id, product_id, quantity, type, reference_id)
        VALUES (p_shop_id, v_item.product_id, -v_item.quantity, 'sale', v_sale_id);
    END LOOP;

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
