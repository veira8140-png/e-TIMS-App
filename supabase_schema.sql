-- VEIRA POS SUPABASE SCHEMA
-- Multi-tenant SaaS POS System

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- SHOPS (Tenants)
CREATE TABLE IF NOT EXISTS shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    currency TEXT DEFAULT 'KES',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES (Linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'cashier')) NOT NULL DEFAULT 'cashier',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    sku TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALES
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    total DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    discount DECIMAL(12,2) DEFAULT 0,
    payment_method TEXT NOT NULL,
    payment_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SALE ITEMS
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    user_id UUID NOT NULL REFERENCES profiles(id),
    quantity INTEGER NOT NULL,
    type TEXT CHECK (type IN ('SALE', 'ADJUSTMENT', 'RESTOCK', 'RETURN')) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX idx_profiles_shop ON profiles(shop_id);
CREATE INDEX idx_products_shop ON products(shop_id);
CREATE INDEX idx_categories_shop ON categories(shop_id);
CREATE INDEX idx_sales_shop ON sales(shop_id);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_audit_logs_shop ON audit_logs(shop_id);

-- 4. ROW LEVEL SECURITY (RLS)

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get shop_id from profile
CREATE OR REPLACE FUNCTION get_my_shop_id()
RETURNS UUID AS $$
  SELECT shop_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- POLICIES

-- Profiles: Users can only see profiles in their shop
CREATE POLICY "Users can view profiles in their shop" ON profiles
    FOR SELECT USING (shop_id = get_my_shop_id());

-- Shops: Users can only view their own shop
CREATE POLICY "Users can view their own shop" ON shops
    FOR SELECT USING (id = get_my_shop_id());

-- Categories
CREATE POLICY "Tenant categories access" ON categories
    FOR ALL USING (shop_id = get_my_shop_id());

-- Products
CREATE POLICY "Tenant products access" ON products
    FOR ALL USING (shop_id = get_my_shop_id());

-- Sales
CREATE POLICY "Tenant sales access" ON sales
    FOR ALL USING (shop_id = get_my_shop_id());

-- Sale Items
CREATE POLICY "Tenant sale items access" ON sale_items
    FOR ALL USING (shop_id = get_my_shop_id());

-- Stock Movements
CREATE POLICY "Tenant stock movements access" ON stock_movements
    FOR ALL USING (shop_id = get_my_shop_id());

-- Audit Logs
CREATE POLICY "Tenant audit logs access" ON audit_logs
    FOR ALL USING (shop_id = get_my_shop_id());


-- 5. ATOMIC SALE RPC FUNCTION
CREATE OR REPLACE FUNCTION create_sale_atomic(
    p_shop_id UUID,
    p_user_id UUID,
    p_total DECIMAL,
    p_subtotal DECIMAL,
    p_discount DECIMAL,
    p_payment_method TEXT,
    p_items JSONB -- Array of {product_id, quantity, unit_price, unit_cost}
) RETURNS UUID AS $$
DECLARE
    v_sale_id UUID;
    v_item RECORD;
BEGIN
    -- 1. Insert Sale
    INSERT INTO sales (shop_id, user_id, total, subtotal, discount, payment_method)
    VALUES (p_shop_id, p_user_id, p_total, p_subtotal, p_discount, p_payment_method)
    RETURNING id INTO v_sale_id;

    -- 2. Process Items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, quantity INTEGER, unit_price DECIMAL, unit_cost DECIMAL)
    LOOP
        -- Check stock
        IF (SELECT stock FROM products WHERE id = v_item.product_id AND shop_id = p_shop_id) < v_item.quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product %', v_item.product_id;
        END IF;

        -- Insert Sale Item
        INSERT INTO sale_items (shop_id, sale_id, product_id, quantity, unit_price, unit_cost)
        VALUES (p_shop_id, v_sale_id, v_item.product_id, v_item.quantity, v_item.unit_price, v_item.unit_cost);

        -- Deduct Stock
        UPDATE products 
        SET stock = stock - v_item.quantity,
            updated_at = NOW()
        WHERE id = v_item.product_id AND shop_id = p_shop_id;

        -- Record Stock Movement
        INSERT INTO stock_movements (shop_id, product_id, user_id, quantity, type, reason)
        VALUES (p_shop_id, v_item.product_id, p_user_id, -v_item.quantity, 'SALE', 'Sale ' || v_sale_id);
    END LOOP;

    -- 3. Audit Log
    INSERT INTO audit_logs (shop_id, user_id, action, details)
    VALUES (p_shop_id, p_user_id, 'SALE_COMPLETE', jsonb_build_object('sale_id', v_sale_id, 'total', p_total));

    RETURN v_sale_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
