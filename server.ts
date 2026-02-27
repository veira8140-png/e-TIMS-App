import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("veira_pos.db");

  // Initialize Database
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      name TEXT,
      location TEXT,
      is_hq INTEGER
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT,
      sku TEXT,
      price REAL,
      cost_price REAL,
      category_id TEXT,
      tax_rate REAL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS inventory (
      product_id TEXT,
      branch_id TEXT,
      quantity INTEGER,
      reorder_level INTEGER,
      PRIMARY KEY (product_id, branch_id)
    );

    CREATE TABLE IF NOT EXISTS transaction_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT,
      product_id TEXT,
      quantity INTEGER,
      unit_price REAL,
      unit_cost REAL,
      FOREIGN KEY(transaction_id) REFERENCES transactions(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      branch_id TEXT,
      staff_id TEXT,
      total REAL,
      discount REAL DEFAULT 0,
      payment_method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      branch_id TEXT,
      name TEXT,
      role TEXT,
      pin TEXT,
      status TEXT
    );
  `);

  // Ensure columns exist (Migration for existing DBs)
  try { db.exec("ALTER TABLE products ADD COLUMN is_active INTEGER DEFAULT 1"); } catch(e) {}
  try { db.exec("ALTER TABLE transactions ADD COLUMN discount REAL DEFAULT 0"); } catch(e) {}
  try { db.exec("ALTER TABLE staff ADD COLUMN pin TEXT"); } catch(e) {}

// Seed Data (Simplified from your JSON)
const seed = () => {
  const branchCount = db.prepare("SELECT count(*) as count FROM branches").get() as any;
  if (branchCount.count === 0) {
    db.prepare("INSERT INTO branches (id, name, location, is_hq) VALUES (?, ?, ?, ?)").run("BR-001", "Westlands Main Store", "Westlands, Nairobi", 1);
    db.prepare("INSERT INTO branches (id, name, location, is_hq) VALUES (?, ?, ?, ?)").run("BR-002", "Karen Outlet", "Karen, Nairobi", 0);
    
    db.prepare("INSERT INTO products (id, name, sku, price, cost_price, category_id, tax_rate) VALUES (?, ?, ?, ?, ?, ?, ?)").run("PRD-001", "Samsung Galaxy A55", "SAM-A55-BLK", 45000, 38000, "CAT-002", 0.16);
    db.prepare("INSERT INTO products (id, name, sku, price, cost_price, category_id, tax_rate) VALUES (?, ?, ?, ?, ?, ?, ?)").run("PRD-002", "iPhone 15 Pro Max", "APL-15PM-256-NTT", 185000, 165000, "CAT-002", 0.16);
    
    db.prepare("INSERT INTO inventory (product_id, branch_id, quantity, reorder_level) VALUES (?, ?, ?, ?)").run("PRD-001", "BR-001", 12, 5);
    db.prepare("INSERT INTO inventory (product_id, branch_id, quantity, reorder_level) VALUES (?, ?, ?, ?)").run("PRD-001", "BR-002", 3, 5);
    
    db.prepare("INSERT INTO staff (id, branch_id, name, role, pin, status) VALUES (?, ?, ?, ?, ?, ?)").run("STF-001", "BR-001", "Amina Wanjiku", "manager", "1234", "active");
  }
};
seed();

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // Broadcast to all clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  app.post("/api/login", (req, res) => {
    const { staff_id, pin } = req.body;
    const staff = db.prepare("SELECT * FROM staff WHERE id = ? AND pin = ?").get(staff_id, pin) as any;
    
    if (staff) {
      const { pin: _, ...user } = staff;
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: "Invalid ID or PIN" });
    }
  });

  // API Routes
  app.get("/api/dashboard", (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const stats = db.prepare(`
        SELECT 
          SUM(total) as revenue,
          COUNT(id) as transaction_count,
          (SELECT SUM((ti.unit_price - ti.unit_cost) * ti.quantity) 
           FROM transaction_items ti 
           JOIN transactions t ON ti.transaction_id = t.id 
           WHERE date(t.created_at) = ?) as profit
        FROM transactions 
        WHERE date(created_at) = ?
      `).get(today, today) as any;

      const topItems = db.prepare(`
        SELECT p.name, SUM(ti.quantity) as sold
        FROM transaction_items ti
        JOIN products p ON ti.product_id = p.id
        GROUP BY ti.product_id
        ORDER BY sold DESC
        LIMIT 5
      `).all();

      const salesByMethod = db.prepare(`
        SELECT payment_method as method, SUM(total) as total
        FROM transactions
        WHERE date(created_at) = ?
        GROUP BY payment_method
      `).all(today);

      const salesTrend = db.prepare(`
        SELECT date(created_at) as date, SUM(total) as total
        FROM transactions
        GROUP BY date(created_at)
        ORDER BY date DESC
        LIMIT 7
      `).all();

      const lowStock = db.prepare(`
        SELECT p.name, i.quantity, i.reorder_level, b.name as branch_name 
        FROM inventory i 
        JOIN products p ON i.product_id = p.id 
        JOIN branches b ON i.branch_id = b.id
        WHERE i.quantity <= i.reorder_level
      `).all();

      res.json({
        revenue: stats?.revenue || 0,
        profit: stats?.profit || 0,
        transaction_count: stats?.transaction_count || 0,
        topItems,
        salesByMethod,
        salesTrend: salesTrend.reverse(),
        alerts: lowStock
      });
    } catch (error) {
      console.error("Dashboard API Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Product CRUD
  app.get("/api/products", (req, res) => {
    try {
      const products = db.prepare("SELECT * FROM products WHERE is_active = 1").all();
      res.json(products);
    } catch (error) {
      console.error("Products API Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/products", (req, res) => {
    const { id, name, sku, price, cost_price, category_id, tax_rate } = req.body;
    db.prepare(`
      INSERT INTO products (id, name, sku, price, cost_price, category_id, tax_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, sku, price, cost_price, category_id, tax_rate);
    
    // Initialize inventory for all branches
    const branches = db.prepare("SELECT id FROM branches").all() as any[];
    for (const b of branches) {
      db.prepare("INSERT INTO inventory (product_id, branch_id, quantity, reorder_level) VALUES (?, ?, ?, ?)").run(id, b.id, 0, 5);
    }
    
    res.json({ success: true });
  });

  app.put("/api/products/:id", (req, res) => {
    const { name, sku, price, cost_price, tax_rate } = req.body;
    db.prepare(`
      UPDATE products SET name = ?, sku = ?, price = ?, cost_price = ?, tax_rate = ?
      WHERE id = ?
    `).run(name, sku, price, cost_price, tax_rate, req.params.id);
    res.json({ success: true });
  });

  // Transaction with Items
  app.post("/api/transactions", (req, res) => {
    const { branch_id, staff_id, total, discount, payment_method, items } = req.body;
    const id = `TXN-${Date.now()}`;
    
    const transaction = db.transaction(() => {
      db.prepare("INSERT INTO transactions (id, branch_id, staff_id, total, discount, payment_method) VALUES (?, ?, ?, ?, ?, ?)").run(id, branch_id, staff_id, total, discount || 0, payment_method);
      
      for (const item of items) {
        const product = db.prepare("SELECT cost_price FROM products WHERE id = ?").get(item.product_id) as any;
        db.prepare(`
          INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, unit_cost)
          VALUES (?, ?, ?, ?, ?)
        `).run(id, item.product_id, item.quantity, item.unit_price, product.cost_price);
        
        db.prepare("UPDATE inventory SET quantity = quantity - ? WHERE product_id = ? AND branch_id = ?").run(item.quantity, item.product_id, branch_id);
      }
    });

    transaction();
    broadcast({ type: "NEW_TRANSACTION" });
    res.json({ id, success: true });
  });

  // Reports
  app.get("/api/reports/sales", (req, res) => {
    const { start, end } = req.query;
    const sales = db.prepare(`
      SELECT t.*, s.name as staff_name, b.name as branch_name
      FROM transactions t
      JOIN staff s ON t.staff_id = s.id
      JOIN branches b ON t.branch_id = b.id
      WHERE date(t.created_at) BETWEEN ? AND ?
      ORDER BY t.created_at DESC
    `).all(start, end);
    res.json(sales);
  });

  // Staff CRUD
  app.get("/api/staff", (req, res) => {
    try {
      const staff = db.prepare("SELECT id, name, role, branch_id, status FROM staff").all();
      res.json(staff);
    } catch (error) {
      console.error("Staff API Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/staff", (req, res) => {
    const { id, name, role, pin, branch_id } = req.body;
    db.prepare("INSERT INTO staff (id, name, role, pin, branch_id, status) VALUES (?, ?, ?, ?, ?, 'active')").run(id, name, role, pin, branch_id);
    res.json({ success: true });
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Veira POS running on http://localhost:${PORT}`);
  });
}

startServer();
