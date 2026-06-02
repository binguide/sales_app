import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createHash, randomBytes } from "crypto";
import { initDb, all, get, run, transaction, lastInsertId } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Auth middleware
const tokens = {};
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !tokens[token]) return res.status(401).json({ error: "Unauthorized" });
  req.user = tokens[token];
  next();
}

// Public endpoints (no auth)
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = get("SELECT * FROM users WHERE username = ? AND is_active = 1", [username]);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const parts = user.password_hash.split(":");
  if (parts.length !== 2) return res.status(401).json({ error: "Invalid credentials" });
  const hash = createHash("sha256").update(parts[0] + password).digest("hex");
  if (hash !== parts[1]) return res.status(401).json({ error: "Invalid credentials" });
  const token = randomBytes(32).toString("hex");
  tokens[token] = { id: user.id, username: user.username, name: user.name, name_en: user.name_en, role: user.role };
  res.json({ token, user: { id: user.id, username: user.username, name: user.name, name_en: user.name_en, role: user.role } });
});

app.post("/api/logout", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (token) delete tokens[token];
  res.json({ ok: true });
});

// Protect all /api routes from here on
app.all("/api/*", authMiddleware);

app.get("/api/me", (req, res) => {
  res.json(req.user);
});

// Users CRUD
app.get("/api/users", (req, res) => {
  res.json(all("SELECT id, username, name, name_en, role, is_active, created_at FROM users ORDER BY id"));
});

app.post("/api/users", (req, res) => {
  const { username, password, name, name_en, role } = req.body;
  if (!username || !password || !name) return res.status(400).json({ error: "Missing required fields" });
  const existing = get("SELECT id FROM users WHERE username = ?", [username]);
  if (existing) return res.status(400).json({ error: "Username already exists" });
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(salt + password).digest("hex");
  run("INSERT INTO users (username, password_hash, name, name_en, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
    [username, salt + ":" + hash, name, name_en || null, role || "cashier", new Date().toISOString()]);
  res.json({ id: lastInsertId() });
});

app.put("/api/users/:id", (req, res) => {
  const { username, password, name, name_en, role, is_active } = req.body;
  const existing = get("SELECT id FROM users WHERE username = ? AND id != ?", [username, req.params.id]);
  if (existing) return res.status(400).json({ error: "Username already exists" });
  if (password) {
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256").update(salt + password).digest("hex");
    run("UPDATE users SET username=?, password_hash=?, name=?, name_en=?, role=?, is_active=? WHERE id=?",
      [username, salt + ":" + hash, name, name_en || null, role || "cashier", is_active != null ? (is_active ? 1 : 0) : 1, req.params.id]);
  } else {
    run("UPDATE users SET username=?, name=?, name_en=?, role=?, is_active=? WHERE id=?",
      [username, name, name_en || null, role || "cashier", is_active != null ? (is_active ? 1 : 0) : 1, req.params.id]);
  }
  res.json({ ok: true });
});

app.delete("/api/users/:id", (req, res) => {
  run("DELETE FROM users WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/stats", (req, res) => {
  const { from, to } = req.query;
  const hasFilter = from && to;
  const dateFilter = hasFilter ? " WHERE date(date) BETWEEN ? AND ?" : "";
  const dateParams = hasFilter ? [from, to] : [];

  const totalSales = get(`SELECT COALESCE(SUM(total), 0) as value FROM sales${dateFilter}`, dateParams);
  const totalPurchases = get(`SELECT COALESCE(SUM(total), 0) as value FROM purchases${dateFilter}`, dateParams);

  const cash = get(`SELECT
    COALESCE(SUM(CASE WHEN a.code = '1-1-1' THEN jei.debit - jei.credit ELSE 0 END), 0) as cash_in_hand,
    COALESCE(SUM(CASE WHEN a.code = '1-1-2' THEN jei.debit - jei.credit ELSE 0 END), 0) as cash_in_bank
  FROM journal_entry_items jei
  JOIN accounts a ON a.id = jei.account_id`);

  let topProducts;
  if (hasFilter) {
    topProducts = all(`SELECT p.id, p.name, p.name_en, COALESCE(SUM(si.quantity), 0) as total_qty, COALESCE(SUM(si.quantity * si.price), 0) as total_revenue FROM sale_items si JOIN products p ON p.id = si.product_id JOIN sales s ON s.id = si.sale_id WHERE date(s.date) BETWEEN ? AND ? GROUP BY si.product_id ORDER BY total_qty DESC LIMIT 5`, [from, to]);
  } else {
    topProducts = all(`SELECT p.id, p.name, p.name_en, COALESCE(SUM(si.quantity), 0) as total_qty, COALESCE(SUM(si.quantity * si.price), 0) as total_revenue FROM sale_items si JOIN products p ON p.id = si.product_id GROUP BY si.product_id ORDER BY total_qty DESC LIMIT 5`);
  }

  res.json({ totalSales, totalPurchases, cashInHand: { value: cash.cash_in_hand }, cashInBank: { value: cash.cash_in_bank }, topProducts });
});

app.get("/api/stats/daily-sales", (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = all(`SELECT date(date) as day, COALESCE(SUM(total), 0) as total FROM sales WHERE date(date) BETWEEN ? AND ? GROUP BY date(date) ORDER BY day`, [from, to]);
  } else {
    rows = all(`SELECT date(date) as day, COALESCE(SUM(total), 0) as total FROM sales GROUP BY date(date) ORDER BY day`);
  }
  res.json(rows);
});

app.get("/api/stats/daily-profit", (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = all(`
      SELECT date(s.date) as day,
             COALESCE(SUM(s.total), 0) - COALESCE(SUM(si.quantity * p.cost_price), 0) as profit
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON p.id = si.product_id
      WHERE date(s.date) BETWEEN ? AND ?
      GROUP BY date(s.date)
      ORDER BY day
    `, [from, to]);
  } else {
    rows = all(`
      SELECT date(s.date) as day,
             COALESCE(SUM(s.total), 0) - COALESCE(SUM(si.quantity * p.cost_price), 0) as profit
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id
      LEFT JOIN products p ON p.id = si.product_id
      GROUP BY date(s.date)
      ORDER BY day
    `);
  }
  res.json(rows);
});

// Settings
app.get("/api/settings", (req, res) => {
  const rows = all("SELECT key, value FROM settings");
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  res.json(obj);
});

app.put("/api/settings", (req, res) => {
  for (const [key, value] of Object.entries(req.body)) {
    const existing = get("SELECT key FROM settings WHERE key = ?", [key]);
    if (existing) run("UPDATE settings SET value = ? WHERE key = ?", [String(value), key]);
    else run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, String(value)]);
  }
  res.json({ ok: true });
});

// Currencies
app.get("/api/currencies", (req, res) => {
  res.json(all("SELECT * FROM currencies ORDER BY is_main DESC, code"));
});

app.post("/api/currencies", (req, res) => {
  const { code, name, name_en, symbol, rate } = req.body;
  run("INSERT INTO currencies (code, name, name_en, symbol, rate, is_main) VALUES (?, ?, ?, ?, ?, 0)",
    [code.toUpperCase(), name, name_en || null, symbol || code, rate || 1]);
  res.json({ id: lastInsertId() });
});

app.put("/api/currencies/:id", (req, res) => {
  const { code, name, name_en, symbol, rate, is_main } = req.body;
  if (is_main) {
    run("UPDATE currencies SET is_main = 0");
  }
  run("UPDATE currencies SET code=?, name=?, name_en=?, symbol=?, rate=?, is_main=? WHERE id=?",
    [(code || "").toUpperCase(), name, name_en || null, symbol || code, rate || 1, is_main ? 1 : 0, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/currencies/:id", (req, res) => {
  const c = get("SELECT * FROM currencies WHERE id = ?", [req.params.id]);
  if (c && c.is_main) return res.status(400).json({ error: "Cannot delete main currency" });
  run("DELETE FROM currencies WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Warehouses
app.get("/api/warehouses", (req, res) => {
  res.json(all("SELECT * FROM warehouses ORDER BY id"));
});

app.get("/api/warehouses/:id/stock", (req, res) => {
  const stock = all(`
    SELECT ws.*, p.name as product_name, p.name_en as product_name_en, p.price
    FROM warehouse_stock ws JOIN products p ON ws.product_id = p.id
    WHERE ws.warehouse_id = ? AND ws.quantity > 0
    ORDER BY p.name
  `, [req.params.id]);
  res.json(stock);
});

app.post("/api/warehouses", (req, res) => {
  const { name, name_en, location } = req.body;
  run("INSERT INTO warehouses (name, name_en, location) VALUES (?, ?, ?)",
    [name, name_en || null, location || null]);
  res.json({ id: lastInsertId() });
});

app.put("/api/warehouses/:id", (req, res) => {
  const { name, name_en, location } = req.body;
  run("UPDATE warehouses SET name=?, name_en=?, location=? WHERE id=?",
    [name, name_en || null, location || null, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/warehouses/:id", (req, res) => {
  run("DELETE FROM warehouse_stock WHERE warehouse_id = ?", [req.params.id]);
  run("DELETE FROM warehouses WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

app.post("/api/warehouses/transfer", (req, res) => {
  const { product_id, from_warehouse_id, to_warehouse_id, quantity } = req.body;
  transaction(() => {
    const from = get("SELECT quantity FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
      [product_id, from_warehouse_id]);
    if (!from || from.quantity < quantity) throw new Error("Insufficient stock");

    run("UPDATE warehouse_stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?",
      [quantity, product_id, from_warehouse_id]);
    run("DELETE FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ? AND quantity <= 0",
      [product_id, from_warehouse_id]);

    const to = get("SELECT id FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
      [product_id, to_warehouse_id]);
    if (to) {
      run("UPDATE warehouse_stock SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?",
        [quantity, product_id, to_warehouse_id]);
    } else {
      run("INSERT INTO warehouse_stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)",
        [product_id, to_warehouse_id, quantity]);
    }
  });
  res.json({ ok: true });
});

// Stock Transfers (multi-item)
app.get("/api/stock-transfers", (req, res) => {
  const transfers = all(`
    SELECT st.*, fw.name as from_name, fw.name_en as from_name_en,
           tw.name as to_name, tw.name_en as to_name_en
    FROM stock_transfers st
    JOIN warehouses fw ON fw.id = st.from_warehouse_id
    JOIN warehouses tw ON tw.id = st.to_warehouse_id
    ORDER BY st.date DESC, st.id DESC
  `);
  res.json(transfers);
});

app.get("/api/stock-transfers/:id", (req, res) => {
  const transfer = get(`
    SELECT st.*, fw.name as from_name, fw.name_en as from_name_en,
           tw.name as to_name, tw.name_en as to_name_en
    FROM stock_transfers st
    JOIN warehouses fw ON fw.id = st.from_warehouse_id
    JOIN warehouses tw ON tw.id = st.to_warehouse_id
    WHERE st.id = ?
  `, [req.params.id]);
  if (!transfer) return res.status(404).json({ error: "not found" });
  transfer.items = all(`
    SELECT sti.*, p.name as product_name, p.name_en as product_name_en,
           u.name as unit_name, u.name_en as unit_name_en, u.abbreviation, u.abbreviation_en
    FROM stock_transfer_items sti
    JOIN products p ON p.id = sti.product_id
    LEFT JOIN units u ON sti.unit_id = u.id
    WHERE sti.transfer_id = ?
  `, [req.params.id]);
  res.json(transfer);
});

app.post("/api/stock-transfers", (req, res) => {
  const { from_warehouse_id, to_warehouse_id, date, notes, items } = req.body;
  if (!from_warehouse_id || !to_warehouse_id || !items || items.length === 0)
    return res.status(400).json({ error: "Missing required fields" });
  if (from_warehouse_id === to_warehouse_id)
    return res.status(400).json({ error: "Cannot transfer to same warehouse" });

  transaction(() => {
    run("INSERT INTO stock_transfers (from_warehouse_id, to_warehouse_id, date, notes, created_at) VALUES (?, ?, ?, ?, ?)",
      [from_warehouse_id, to_warehouse_id, date || new Date().toISOString().split("T")[0],
       notes || null, new Date().toISOString()]);
    const transferId = lastInsertId();

    for (const item of items) {
      const unitFactor = item.unit_conversion_factor || 1;
      const qty = Math.round((parseInt(item.quantity) || 0) * unitFactor);
      if (qty <= 0) continue;
      const pid = parseInt(item.product_id);

      const from = get("SELECT quantity FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
        [pid, from_warehouse_id]);
      if (!from || from.quantity < qty) {
        const p = get("SELECT name FROM products WHERE id = ?", [pid]);
        throw new Error(`Insufficient stock for ${p ? p.name : "product #" + pid}`);
      }

      run("UPDATE warehouse_stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?",
        [qty, pid, from_warehouse_id]);
      run("DELETE FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ? AND quantity <= 0",
        [pid, from_warehouse_id]);

      const to = get("SELECT id FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
        [pid, to_warehouse_id]);
      if (to) {
        run("UPDATE warehouse_stock SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?",
          [qty, pid, to_warehouse_id]);
      } else {
        run("INSERT INTO warehouse_stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)",
          [pid, to_warehouse_id, qty]);
      }

      run("INSERT INTO stock_transfer_items (transfer_id, product_id, quantity, unit_id, unit_conversion_factor) VALUES (?, ?, ?, ?, ?)",
        [transferId, pid, qty, item.unit_id || null, unitFactor]);
    }
  });
  res.json({ ok: true });
});

// Categories
app.get("/api/categories", (req, res) => {
  const cats = all(`SELECT c.*, ra.code as revenue_account_code, ra.name as revenue_account_name, ra.name_en as revenue_account_name_en,
    ca.code as cogs_account_code, ca.name as cogs_account_name, ca.name_en as cogs_account_name_en,
    ia.code as inventory_account_code, ia.name as inventory_account_name, ia.name_en as inventory_account_name_en
    FROM categories c
    LEFT JOIN accounts ra ON c.revenue_account_id = ra.id
    LEFT JOIN accounts ca ON c.cogs_account_id = ca.id
    LEFT JOIN accounts ia ON c.inventory_account_id = ia.id
    ORDER BY c.name`);
  const withCount = cats.map((c) => {
    const cnt = get("SELECT COUNT(*) as count FROM products WHERE category_id = ?", [c.id]);
    return { ...c, product_count: cnt.count };
  });
  res.json(withCount);
});

app.post("/api/categories", (req, res) => {
  const { name, name_en, color, revenue_account_id, cogs_account_id, inventory_account_id } = req.body;
  run("INSERT INTO categories (name, name_en, color, revenue_account_id, cogs_account_id, inventory_account_id) VALUES (?, ?, ?, ?, ?, ?)",
    [name, name_en || null, color || "#6366f1", revenue_account_id || null, cogs_account_id || null, inventory_account_id || null]);
  res.json({ id: lastInsertId() });
});

app.put("/api/categories/:id", (req, res) => {
  const { name, name_en, color, revenue_account_id, cogs_account_id, inventory_account_id } = req.body;
  run("UPDATE categories SET name=?, name_en=?, color=?, revenue_account_id=?, cogs_account_id=?, inventory_account_id=? WHERE id=?",
    [name, name_en || null, color || "#6366f1", revenue_account_id || null, cogs_account_id || null, inventory_account_id || null, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/categories/:id", (req, res) => {
  run("UPDATE products SET category_id = NULL WHERE category_id = ?", [req.params.id]);
  run("DELETE FROM categories WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Units of Measure
app.get("/api/units", (req, res) => {
  res.json(all("SELECT * FROM units ORDER BY name"));
});

app.post("/api/units", (req, res) => {
  const { name, name_en, abbreviation, abbreviation_en, category } = req.body;
  run("INSERT INTO units (name, name_en, abbreviation, abbreviation_en, category) VALUES (?, ?, ?, ?, ?)",
    [name, name_en || null, abbreviation || null, abbreviation_en || null, category || null]);
  res.json({ id: lastInsertId() });
});

app.get("/api/units/:id", (req, res) => {
  const unit = get("SELECT * FROM units WHERE id = ?", [req.params.id]);
  if (!unit) return res.status(404).json({ error: "not found" });
  res.json(unit);
});

app.put("/api/units/:id", (req, res) => {
  const { name, name_en, abbreviation, abbreviation_en, category } = req.body;
  run("UPDATE units SET name=?, name_en=?, abbreviation=?, abbreviation_en=?, category=? WHERE id=?",
    [name, name_en || null, abbreviation || null, abbreviation_en || null, category || null, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/units/:id", (req, res) => {
  run("DELETE FROM product_units WHERE unit_id = ?", [req.params.id]);
  run("DELETE FROM units WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

app.get("/api/products/:id/units", (req, res) => {
  res.json(all(`
    SELECT pu.*, u.name as unit_name, u.name_en as unit_name_en,
           u.abbreviation, u.abbreviation_en
    FROM product_units pu
    JOIN units u ON pu.unit_id = u.id
    WHERE pu.product_id = ?
    ORDER BY pu.is_base DESC, u.name
  `, [req.params.id]));
});

// Products
app.get("/api/products", (req, res) => {
  const query = `
    SELECT p.*, c.name as category_name, c.name_en as category_name_en, c.color as category_color,
           ra.name as revenue_account_name, ra.name_en as revenue_account_name_en,
           ca.name as cogs_account_name, ca.name_en as cogs_account_name_en,
           ia.name as inventory_account_name, ia.name_en as inventory_account_name_en
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN accounts ra ON p.revenue_account_id = ra.id
    LEFT JOIN accounts ca ON p.cogs_account_id = ca.id
    LEFT JOIN accounts ia ON p.inventory_account_id = ia.id
    ORDER BY p.name
  `;
  const products = all(query);
  const enriched = products.map((p) => {
    const units = all(`
      SELECT pu.*, u.name as unit_name, u.name_en as unit_name_en,
             u.abbreviation, u.abbreviation_en
      FROM product_units pu
      JOIN units u ON pu.unit_id = u.id
      WHERE pu.product_id = ?
      ORDER BY pu.is_base DESC, u.name
    `, [p.id]);
    return { ...p, product_units: units };
  });
  res.json(enriched);
});

app.get("/api/products/:id/stock", (req, res) => {
  const stock = all(`
    SELECT ws.*, w.name as warehouse_name, w.name_en as warehouse_name_en
    FROM warehouse_stock ws JOIN warehouses w ON ws.warehouse_id = w.id
    WHERE ws.product_id = ?
  `, [req.params.id]);
  res.json(stock);
});

app.get("/api/products/barcode/:barcode", (req, res) => {
  const product = get(`
    SELECT p.*, c.name as category_name, c.color as category_color
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.barcode = ?
  `, [req.params.barcode]);
  if (product) res.json(product);
  else res.status(404).json({ error: "not found" });
});

app.post("/api/products", (req, res) => {
  let { name, name_en, barcode, category_id, price, wholesale_price, quantity, tax_rate, revenue_account_id, cogs_account_id, inventory_account_id, product_units, is_service, image, min_stock, max_stock, reorder_point } = req.body;
  if (!revenue_account_id) {
    const s = get("SELECT value FROM settings WHERE key = ?", ["default_revenue_account"]);
    if (s) revenue_account_id = parseInt(s.value);
  }
  if (!cogs_account_id) {
    const s = get("SELECT value FROM settings WHERE key = ?", ["default_cogs_account"]);
    if (s) cogs_account_id = parseInt(s.value);
  }
  if (!inventory_account_id) {
    const s = get("SELECT value FROM settings WHERE key = ?", ["default_inventory_account"]);
    if (s) inventory_account_id = parseInt(s.value);
  }
  const pid = transaction(() => {
    run(
      "INSERT INTO products (name, name_en, barcode, category_id, price, wholesale_price, quantity, tax_rate, revenue_account_id, cogs_account_id, inventory_account_id, is_service, image, min_stock, max_stock, reorder_point) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [name, name_en || null, barcode || null, category_id || null, price || 0, wholesale_price || 0, quantity || 0, tax_rate || 0, revenue_account_id || null, cogs_account_id || null, inventory_account_id || null, is_service ? 1 : 0, image || null, parseFloat(min_stock) || 0, parseFloat(max_stock) || 0, parseFloat(reorder_point) || 0]
    );
    const id = lastInsertId();
    if (product_units && product_units.length > 0) {
      for (const pu of product_units) {
        run("INSERT INTO product_units (product_id, unit_id, conversion_factor, is_base, price, wholesale_price, barcode) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [id, parseInt(pu.unit_id), parseFloat(pu.conversion_factor) || 1, pu.is_base ? 1 : 0, parseFloat(pu.price) || 0, parseFloat(pu.wholesale_price) || 0, pu.barcode || null]);
      }
    } else {
      const defaultUnit = get("SELECT id FROM units WHERE name_en = ?", ["Piece"]);
      if (defaultUnit) {
        run("INSERT INTO product_units (product_id, unit_id, conversion_factor, is_base, price, wholesale_price, barcode) VALUES (?, ?, 1, 1, ?, ?, ?)",
          [id, defaultUnit.id, price || 0, wholesale_price || 0, barcode || null]);
      }
    }
    return id;
  });
  if (!is_service) {
    const defaultWh = get("SELECT id FROM warehouses ORDER BY id LIMIT 1");
    if (defaultWh && quantity > 0) {
      run("INSERT INTO warehouse_stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)",
        [pid, defaultWh.id, quantity || 0]);
    }
  }
  res.json({ id: pid });
});

app.put("/api/products/:id", (req, res) => {
  const { name, name_en, barcode, category_id, price, wholesale_price, quantity, tax_rate, revenue_account_id, cogs_account_id, inventory_account_id, product_units, is_service, image, min_stock, max_stock, reorder_point } = req.body;
  transaction(() => {
    run(
      "UPDATE products SET name=?, name_en=?, barcode=?, category_id=?, price=?, wholesale_price=?, quantity=?, tax_rate=?, revenue_account_id=?, cogs_account_id=?, inventory_account_id=?, is_service=?, image=?, min_stock=?, max_stock=?, reorder_point=? WHERE id=?",
      [name, name_en || null, barcode || null, category_id || null, price || 0, wholesale_price || 0, quantity || 0, tax_rate || 0, revenue_account_id || null, cogs_account_id || null, inventory_account_id || null, is_service ? 1 : 0, image || null, parseFloat(min_stock) || 0, parseFloat(max_stock) || 0, parseFloat(reorder_point) || 0, req.params.id]
    );
    if (product_units) {
      run("DELETE FROM product_units WHERE product_id = ?", [req.params.id]);
      for (const pu of product_units) {
        run("INSERT INTO product_units (product_id, unit_id, conversion_factor, is_base, price, wholesale_price, barcode) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [req.params.id, parseInt(pu.unit_id), parseFloat(pu.conversion_factor) || 1, pu.is_base ? 1 : 0, parseFloat(pu.price) || 0, parseFloat(pu.wholesale_price) || 0, pu.barcode || null]);
      }
    }
  });
  res.json({ ok: true });
});

app.delete("/api/products/:id", (req, res) => {
  run("DELETE FROM warehouse_stock WHERE product_id = ?", [req.params.id]);
  run("DELETE FROM products WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Customers
app.get("/api/customers", (req, res) => {
  res.json(all("SELECT c.*, a.name as receivable_account_name, a.name_en as receivable_account_name_en FROM customers c LEFT JOIN accounts a ON c.receivable_account_id = a.id ORDER BY c.name"));
});
app.post("/api/customers", (req, res) => {
  let { name, phone, receivable_account_id } = req.body;
  if (!receivable_account_id) {
    const s = get("SELECT value FROM settings WHERE key = ?", ["default_receivable_account"]);
    if (s) receivable_account_id = parseInt(s.value);
  }
  run("INSERT INTO customers (name, phone, receivable_account_id) VALUES (?, ?, ?)", [name, phone, receivable_account_id || null]);
  res.json({ id: lastInsertId() });
});
app.put("/api/customers/:id", (req, res) => {
  const { name, phone, receivable_account_id } = req.body;
  run("UPDATE customers SET name=?, phone=?, receivable_account_id=? WHERE id=?", [name, phone, receivable_account_id || null, req.params.id]);
  res.json({ ok: true });
});
app.delete("/api/customers/:id", (req, res) => {
  run("DELETE FROM customers WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Suppliers
app.get("/api/suppliers", (req, res) => {
  res.json(all("SELECT s.*, a.name as payable_account_name, a.name_en as payable_account_name_en FROM suppliers s LEFT JOIN accounts a ON s.payable_account_id = a.id ORDER BY s.name"));
});
app.post("/api/suppliers", (req, res) => {
  let { name, phone, payable_account_id } = req.body;
  if (!payable_account_id) {
    const s = get("SELECT value FROM settings WHERE key = ?", ["default_payable_account"]);
    if (s) payable_account_id = parseInt(s.value);
  }
  run("INSERT INTO suppliers (name, phone, payable_account_id) VALUES (?, ?, ?)", [name, phone, payable_account_id || null]);
  res.json({ id: lastInsertId() });
});
app.put("/api/suppliers/:id", (req, res) => {
  const { name, phone, payable_account_id } = req.body;
  run("UPDATE suppliers SET name=?, phone=?, payable_account_id=? WHERE id=?", [name, phone, payable_account_id || null, req.params.id]);
  res.json({ ok: true });
});
app.delete("/api/suppliers/:id", (req, res) => {
  run("DELETE FROM suppliers WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Employees
app.get("/api/employees", (req, res) => {
  res.json(all(`SELECT e.*, a.name as salary_account_name, a.name_en as salary_account_name_en, a.code as salary_account_code
    FROM employees e LEFT JOIN accounts a ON e.salary_account_id = a.id ORDER BY e.name`));
});

app.post("/api/employees", (req, res) => {
  const { name, name_en, phone, email, salary, role, address, national_id, salary_account_id } = req.body;
  run("INSERT INTO employees (name, name_en, phone, email, salary, role, address, national_id, salary_account_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [name, name_en || null, phone || null, email || null, salary || 0, role || null, address || null, national_id || null, salary_account_id || null]);
  res.json({ id: lastInsertId() });
});

app.put("/api/employees/:id", (req, res) => {
  const { name, name_en, phone, email, salary, role, address, national_id, salary_account_id, is_active } = req.body;
  run("UPDATE employees SET name=?, name_en=?, phone=?, email=?, salary=?, role=?, address=?, national_id=?, salary_account_id=?, is_active=? WHERE id=?",
    [name, name_en || null, phone || null, email || null, salary || 0, role || null, address || null, national_id || null, salary_account_id || null, is_active != null ? (is_active ? 1 : 0) : 1, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/employees/:id", (req, res) => {
  run("DELETE FROM employees WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Accounts (Chart of Accounts)
app.get("/api/accounts", (req, res) => {
  const leafOnly = req.query.leaf_only === "1";
  const sql = leafOnly
    ? `SELECT a.*, 1 as is_leaf FROM accounts a WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE parent_id = a.id) ORDER BY a.code`
    : `SELECT a.*, CASE WHEN EXISTS (SELECT 1 FROM accounts WHERE parent_id = a.id) THEN 0 ELSE 1 END as is_leaf FROM accounts a ORDER BY a.code`;
  res.json(all(sql));
});

app.post("/api/accounts", (req, res) => {
  const { code, name, name_en, type, parent_id, is_active, description } = req.body;
  run("INSERT INTO accounts (code, name, name_en, type, parent_id, is_active, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [code, name, name_en || null, type, parent_id || null, is_active != null ? (is_active ? 1 : 0) : 1, description || null]);
  res.json({ id: lastInsertId() });
});

app.put("/api/accounts/:id", (req, res) => {
  const { code, name, name_en, type, parent_id, is_active, description } = req.body;
  run("UPDATE accounts SET code=?, name=?, name_en=?, type=?, parent_id=?, is_active=?, description=? WHERE id=?",
    [code, name, name_en || null, type, parent_id || null, is_active != null ? (is_active ? 1 : 0) : 1, description || null, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/accounts/:id", (req, res) => {
  run("UPDATE accounts SET parent_id = NULL WHERE parent_id = ?", [req.params.id]);
  run("DELETE FROM accounts WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Payment Methods
app.get("/api/payment-methods", (req, res) => {
  res.json(all("SELECT pm.*, a.name as account_name, a.name_en as account_name_en, a.code as account_code FROM payment_methods pm LEFT JOIN accounts a ON pm.account_id = a.id ORDER BY pm.id"));
});

app.post("/api/payment-methods", (req, res) => {
  const { name, name_en, account_id } = req.body;
  run("INSERT INTO payment_methods (name, name_en, account_id) VALUES (?, ?, ?)", [name, name_en || null, account_id || null]);
  res.json({ id: lastInsertId() });
});

app.put("/api/payment-methods/:id", (req, res) => {
  const { name, name_en, account_id } = req.body;
  run("UPDATE payment_methods SET name=?, name_en=?, account_id=? WHERE id=?", [name, name_en || null, account_id || null, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/payment-methods/:id", (req, res) => {
  run("DELETE FROM payment_methods WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});



// POS Sessions
app.get("/api/pos/sessions/active", (req, res) => {
  const session = get("SELECT * FROM pos_sessions WHERE status = 'open' ORDER BY id DESC LIMIT 1");
  if (session) res.json(session);
  else res.json(null);
});

app.post("/api/pos/sessions", (req, res) => {
  const { user_name, opening_balance } = req.body;
  const name = user_name || req.user?.name || "admin";
  // Close any existing open session
  run("UPDATE pos_sessions SET status = 'cancelled', closed_at = ? WHERE status = 'open'", [new Date().toISOString()]);
  run("INSERT INTO pos_sessions (user_name, opened_at, opening_balance, status) VALUES (?, ?, ?, 'open')",
    [name, new Date().toISOString(), opening_balance || 0]);
  res.json({ id: lastInsertId() });
});

app.post("/api/pos/sessions/:id/close", (req, res) => {
  const { actual_closing, notes } = req.body;
  const session = get("SELECT * FROM pos_sessions WHERE id = ?", [req.params.id]);
  if (!session) return res.status(404).json({ error: "Session not found" });
  const expectedClosing = session.opening_balance + session.total_cash;
  const difference = (actual_closing || 0) - expectedClosing;
  run("UPDATE pos_sessions SET closed_at = ?, expected_closing = ?, actual_closing = ?, difference = ?, notes = ?, status = 'closed' WHERE id = ?",
    [new Date().toISOString(), expectedClosing, actual_closing || 0, difference, notes || null, req.params.id]);
  res.json({ ok: true });
});

app.get("/api/pos/sessions/:id", (req, res) => {
  const session = get("SELECT * FROM pos_sessions WHERE id = ?", [req.params.id]);
  if (!session) return res.status(404).json({ error: "not found" });
  const sales_ = all(`
    SELECT s.id, s.total, s.tax_amount, s.date, s.status,
           COALESCE(c.name, 'نقدي') as customer_name
    FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.session_id = ? ORDER BY s.id DESC
  `, [req.params.id]);
  const cashLog = all("SELECT * FROM pos_cash_log WHERE session_id = ? ORDER BY id", [req.params.id]);
  const payments = all(`
    SELECT sp.*, pm.name, pm.name_en FROM sale_payments sp
    JOIN payment_methods pm ON sp.payment_method_id = pm.id
    JOIN sales s ON sp.sale_id = s.id WHERE s.session_id = ?
  `, [req.params.id]);
  res.json({ ...session, sales: sales_, cashLog, payments });
});

app.get("/api/pos/sessions", (req, res) => {
  res.json(all("SELECT * FROM pos_sessions ORDER BY id DESC"));
});

app.post("/api/pos/cash-log", (req, res) => {
  const { session_id, type, amount, reason } = req.body;
  run("INSERT INTO pos_cash_log (session_id, type, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)",
    [session_id, type, amount || 0, reason || null, new Date().toISOString()]);
  if (type === "in") {
    run("UPDATE pos_sessions SET total_cash = total_cash + ? WHERE id = ?", [amount, session_id]);
  } else {
    run("UPDATE pos_sessions SET total_cash = total_cash - ? WHERE id = ?", [amount, session_id]);
  }
  res.json({ id: lastInsertId() });
});

// Hold / Resume sales
app.get("/api/pos/holds", (req, res) => {
  const sales_ = all(`
    SELECT s.*, COALESCE(c.name, 'نقدي') as customer_name
    FROM sales s LEFT JOIN customers c ON s.customer_id = c.id
    WHERE s.status = 'hold' ORDER BY s.id DESC
  `, []);
  const withItems = sales_.map((s) => {
    const items = all(`
      SELECT si.*, p.name as product_name, p.name_en as product_name_en
      FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?
    `, [s.id]);
    return { ...s, items };
  });
  res.json(withItems);
});

app.put("/api/sales/:id/hold", (req, res) => {
  const { note } = req.body;
  run("UPDATE sales SET status = 'hold', hold_note = ? WHERE id = ?", [note || null, req.params.id]);
  res.json({ ok: true });
});

app.put("/api/sales/:id/resume", (req, res) => {
  const sale = get("SELECT * FROM sales WHERE id = ?", [req.params.id]);
  if (!sale) return res.status(404).json({ error: "not found" });
  // Restore stock items that were deducted
  const items = all("SELECT * FROM sale_items WHERE sale_id = ?", [req.params.id]);
  for (const item of items) {
    run("UPDATE products SET quantity = quantity + ? WHERE id = ?", [item.quantity, item.product_id]);
    if (sale.warehouse_id) {
      const ws = get("SELECT id FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
        [item.product_id, sale.warehouse_id]);
      if (ws) {
        run("UPDATE warehouse_stock SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?",
          [item.quantity, item.product_id, sale.warehouse_id]);
      } else {
        run("INSERT INTO warehouse_stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)",
          [item.product_id, sale.warehouse_id, item.quantity]);
      }
    }
  }
  run("DELETE FROM sale_payments WHERE sale_id = ?", [req.params.id]);
  run("UPDATE sales SET status = 'draft', hold_note = NULL WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// POS Profiles
app.get("/api/pos-profiles", (req, res) => {
  res.json(all("SELECT * FROM pos_profiles ORDER BY is_default DESC, id ASC"));
});

app.get("/api/pos-profiles/default", (req, res) => {
  const profile = get("SELECT * FROM pos_profiles WHERE is_default = 1 LIMIT 1");
  res.json(profile || null);
});

app.post("/api/pos-profiles", (req, res) => {
  const { name, name_en, warehouse_id, payment_method_id, currency_id, customer_id, show_categories, show_search, is_default } = req.body;
  if (is_default) run("UPDATE pos_profiles SET is_default = 0");
  run("INSERT INTO pos_profiles (name, name_en, warehouse_id, payment_method_id, currency_id, customer_id, show_categories, show_search, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [name, name_en || null, warehouse_id || null, payment_method_id || null, currency_id || null, customer_id || null, show_categories !== undefined ? (show_categories ? 1 : 0) : 1, show_search !== undefined ? (show_search ? 1 : 0) : 1, is_default ? 1 : 0]);
  res.json({ id: lastInsertId() });
});

app.put("/api/pos-profiles/:id", (req, res) => {
  const { name, name_en, warehouse_id, payment_method_id, currency_id, customer_id, show_categories, show_search, is_default } = req.body;
  if (is_default) run("UPDATE pos_profiles SET is_default = 0");
  run("UPDATE pos_profiles SET name=?, name_en=?, warehouse_id=?, payment_method_id=?, currency_id=?, customer_id=?, show_categories=?, show_search=?, is_default=? WHERE id=?",
    [name, name_en || null, warehouse_id || null, payment_method_id || null, currency_id || null, customer_id || null, show_categories !== undefined ? (show_categories ? 1 : 0) : 1, show_search !== undefined ? (show_search ? 1 : 0) : 1, is_default ? 1 : 0, req.params.id]);
  res.json({ ok: true });
});

app.delete("/api/pos-profiles/:id", (req, res) => {
  run("DELETE FROM pos_profiles WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

function resolveAccount(productId, field, settingsKey) {
  const p = get(`SELECT p.${field} as prod_acc, c.${field} as cat_acc FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?`, [productId]);
  if (p && p.prod_acc) return p.prod_acc;
  if (p && p.cat_acc) return p.cat_acc;
  const s = get("SELECT value FROM settings WHERE key = ?", [settingsKey]);
  return s ? parseInt(s.value) : null;
}

// Sales
app.get("/api/sales", (req, res) => {
  const { from, to } = req.query;
  const whereClause = from && to ? " WHERE date(s.date) BETWEEN ? AND ?" : "";
  const params = from && to ? [from, to] : [];
  const sales = all(`
    SELECT s.*, COALESCE(c.name, 'نقدي') as customer_name,
           COALESCE(pm.name, '-') as payment_method_name,
           COALESCE(pm.name_en, '-') as payment_method_name_en,
           COALESCE(cur.code, '') as currency_code,
           COALESCE(cur.symbol, '') as currency_symbol,
           (SELECT COALESCE(SUM(si.quantity), 0) FROM sale_items si WHERE si.sale_id = s.id) as item_count,
           (SELECT COALESCE(SUM(sp.amount), 0) FROM sale_payments sp WHERE sp.sale_id = s.id) as paid_amount
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
    LEFT JOIN currencies cur ON s.currency_id = cur.id
    ${whereClause}
    ORDER BY s.id DESC
  `, params);
  res.json(sales);
});

app.put("/api/sales/:id", (req, res) => {
  const { customer_id, items, tax_rate, warehouse_id, payment_method_id, currency_id,
          discount_type, discount_value, status, hold_note, session_id, payments } = req.body;
  const existing = get("SELECT * FROM sales WHERE id = ?", [req.params.id]);
  if (!existing) return res.status(404).json({ error: "not found" });
  const subtotal = items ? items.reduce((s, i) => s + i.price * i.quantity, 0) : existing.subtotal;
  const taxAmount = items ? items.reduce((s, i) => s + i.price * i.quantity * (i.tax_rate || 0) / 100, 0) : existing.tax_amount;
  let discountAmount = existing.discount_amount || 0;
  if (discount_type === "percent" && discount_value) {
    discountAmount = subtotal * (parseFloat(discount_value) / 100);
  } else if (discount_type === "amount" && discount_value) {
    discountAmount = parseFloat(discount_value);
  }
  const total = subtotal + taxAmount - discountAmount;
  transaction(() => {
    run(`UPDATE sales SET customer_id=?, subtotal=?, tax_rate=?, tax_amount=?, discount_type=?, discount_value=?, discount_amount=?, total=?, warehouse_id=?, payment_method_id=?, currency_id=?, status=?, hold_note=?, session_id=? WHERE id=?`,
      [customer_id || null, subtotal, 0, taxAmount, discount_type || null, discount_value || 0, discountAmount, total, warehouse_id || null, payment_method_id || null, currency_id || null, status || existing.status, hold_note || null, session_id || null, req.params.id]);
  });
  res.json({ ok: true });
});

app.post("/api/sales", (req, res) => {
  const { customer_id, items, tax_rate, warehouse_id, payment_method_id, currency_id,
          discount_type, discount_value, status, hold_note, session_id, payments } = req.body;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxAmount = items.reduce((s, i) => s + i.price * i.quantity * (i.tax_rate || 0) / 100, 0);

  // Calculate discount
  let discountAmount = 0;
  if (discount_type === "percent" && discount_value) {
    discountAmount = subtotal * (parseFloat(discount_value) / 100);
  } else if (discount_type === "amount" && discount_value) {
    discountAmount = parseFloat(discount_value);
  }
  const total = subtotal + taxAmount - discountAmount;
  const date = new Date().toISOString();
  const currencyRate = currency_id ? (get("SELECT rate FROM currencies WHERE id = ?", [currency_id])?.rate || 1) : 1;
  const saleStatus = status || "completed";

  // Role check: cashier cannot override prices
  if (req.user.role === "cashier") {
    for (const item of items) {
      if (item.original_price != null && Math.abs(item.price - item.original_price) > 0.001) {
        return res.status(403).json({ error: "لا يمكن تغيير السعر. صلاحية المدير مطلوبة" });
      }
    }
  }

  const saleId = transaction(() => {
    run(`INSERT INTO sales (customer_id, subtotal, tax_rate, tax_amount, discount_type, discount_value, discount_amount, total, date, warehouse_id, payment_method_id, currency_id, currency_rate, status, hold_note, session_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id || null, subtotal, 0, taxAmount, discount_type || null, discount_value || 0, discountAmount, total, date, warehouse_id || null, payment_method_id || null, currency_id || null, currencyRate, saleStatus, hold_note || null, session_id || null]);
    const sid = lastInsertId();
    let totalCogsCost = 0;
    for (const item of items) {
      const product = get("SELECT wholesale_price, price, tax_rate FROM products WHERE id = ?", [item.product_id]);
      const costPrice = (product && product.wholesale_price > 0) ? product.wholesale_price : (product ? product.price : 0);
      const itemTax = item.tax_rate != null ? item.tax_rate : (product ? product.tax_rate : 0);
      const itemDiscountAmt = item.discount_amount || 0;
      const unitFactor = item.unit_conversion_factor || 1;
      const baseQty = Math.round(item.quantity * unitFactor);
      totalCogsCost += costPrice * baseQty;
      run("INSERT INTO sale_items (sale_id, product_id, quantity, price, original_price, cost_price, tax_rate, discount_type, discount_value, discount_amount, unit_id, unit_conversion_factor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [sid, item.product_id, baseQty, item.price, item.original_price || item.price, costPrice, itemTax, item.discount_type || null, item.discount_value || 0, itemDiscountAmt, item.unit_id || null, unitFactor]);
      if (saleStatus !== "hold") {
        run("UPDATE products SET quantity = quantity - ? WHERE id = ?", [baseQty, item.product_id]);
        if (warehouse_id) {
          const ws = get("SELECT id FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
            [item.product_id, warehouse_id]);
          if (ws) {
            run("UPDATE warehouse_stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?",
              [baseQty, item.product_id, warehouse_id]);
            const allowNeg = get("SELECT value FROM settings WHERE key = ?", ["allow_negative_stock"]);
            if (allowNeg && allowNeg.value !== "1") {
              run("DELETE FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ? AND quantity <= 0",
                [item.product_id, warehouse_id]);
            }
          }
        }
      }
    }
    // Insert split payments
    if (payments && payments.length > 0) {
      for (const pmt of payments) {
        run("INSERT INTO sale_payments (sale_id, payment_method_id, amount, date, currency_id) VALUES (?, ?, ?, ?, ?)",
          [sid, pmt.payment_method_id, pmt.amount, date, pmt.currency_id || currency_id || null]);
      }
    } else if (payment_method_id) {
      // Single payment fallback
      run("INSERT INTO sale_payments (sale_id, payment_method_id, amount, date, currency_id) VALUES (?, ?, ?, ?, ?)",
        [sid, payment_method_id, total, date, currency_id || null]);
    }
    // Update session totals if linked to an open session
    if (session_id && saleStatus === "completed") {
      const cashPm = all(`SELECT sp.*, pm.name_en FROM sale_payments sp JOIN payment_methods pm ON sp.payment_method_id = pm.id WHERE sp.sale_id = ?`, [sid]);
      let totalCash = 0, totalCard = 0, otherPmts = 0;
      for (const p of cashPm) {
        const pName = (p.name_en || "").toLowerCase();
        if (pName === "cash" || pName === "نقداً") totalCash += p.amount;
        else if (pName === "credit card" || pName === "بطاقة ائتمان") totalCard += p.amount;
        else otherPmts += p.amount;
      }
      run("UPDATE pos_sessions SET total_sales = total_sales + ?, total_tax = total_tax + ?, total_cash = total_cash + ?, total_card = total_card + ?, other_payments = other_payments + ? WHERE id = ?",
        [total, taxAmount, totalCash, totalCard, otherPmts, session_id]);
    }
    // Create journal entry for completed sales
    if (saleStatus !== "hold") {
      const taxSetting = get("SELECT value FROM settings WHERE key = ?", ["default_tax_payable_account"]);
      const taxAcc = taxSetting ? parseInt(taxSetting.value) : null;
      const saleItems = all("SELECT product_id, price, quantity, cost_price, (price * quantity) as line_total, (cost_price * quantity) as line_cost FROM sale_items WHERE sale_id = ?", [sid]);
      const revGroups = {}, cogsGroups = {}, invGroups = {};
      for (const si of saleItems) {
        const rAcc = resolveAccount(si.product_id, "revenue_account_id", "default_revenue_account");
        if (rAcc) revGroups[rAcc] = (revGroups[rAcc] || 0) + si.line_total;
        if (si.line_cost > 0) {
          const cAcc = resolveAccount(si.product_id, "cogs_account_id", "default_cogs_account");
          const iAcc = resolveAccount(si.product_id, "inventory_account_id", "default_inventory_account");
          if (cAcc) cogsGroups[cAcc] = (cogsGroups[cAcc] || 0) + si.line_cost;
          if (iAcc) invGroups[iAcc] = (invGroups[iAcc] || 0) + si.line_cost;
        }
      }
      if (Object.keys(revGroups).length > 0 || Object.keys(cogsGroups).length > 0 || taxAmount > 0) {
        const jdesc = `فاتورة مبيعات #${sid}`;
        run("INSERT INTO journal_entries (date, description, created_at) VALUES (?, ?, ?)", [date, jdesc, date]);
        const jid = lastInsertId();
        for (const [accId, amount] of Object.entries(revGroups)) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, parseInt(accId), amount]);
        if (taxAmount > 0 && taxAcc) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, parseInt(taxAcc), taxAmount]);
        if (payments && payments.length > 0) {
          for (const pmt of payments) {
            const pm = get("SELECT account_id FROM payment_methods WHERE id = ?", [pmt.payment_method_id]);
            if (pm && pm.account_id) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, pm.account_id, pmt.amount]);
          }
        } else if (payment_method_id) {
          const pm = get("SELECT account_id FROM payment_methods WHERE id = ?", [payment_method_id]);
          if (pm && pm.account_id) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, pm.account_id, total]);
        }
        for (const [accId, amount] of Object.entries(cogsGroups)) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, parseInt(accId), amount]);
        for (const [accId, amount] of Object.entries(invGroups)) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, parseInt(accId), amount]);
      }
    }
    return sid;
  });

  res.json({ id: saleId });
});

app.post("/api/sales/:id/payments", (req, res) => {
  const { payment_method_id, amount, date: pmtDate } = req.body;
  const sale = get("SELECT * FROM sales WHERE id = ?", [req.params.id]);
  if (!sale) return res.status(404).json({ error: "Sale not found" });
  run("INSERT INTO sale_payments (sale_id, payment_method_id, amount, date, currency_id) VALUES (?, ?, ?, ?, ?)",
    [req.params.id, payment_method_id, parseFloat(amount) || 0, pmtDate || new Date().toISOString().split("T")[0], sale.currency_id || null]);
  res.json({ id: lastInsertId() });
});

app.get("/api/sales/:id", (req, res) => {
  const sale = get(`
    SELECT s.*, COALESCE(c.name, 'نقدي') as customer_name,
           w.name as warehouse_name,
           COALESCE(pm.name, '') as payment_method_name,
           COALESCE(pm.name_en, '') as payment_method_name_en,
           COALESCE(cur.code, '') as currency_code,
           COALESCE(cur.symbol, '') as currency_symbol
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    LEFT JOIN warehouses w ON s.warehouse_id = w.id
    LEFT JOIN payment_methods pm ON s.payment_method_id = pm.id
    LEFT JOIN currencies cur ON s.currency_id = cur.id
    WHERE s.id = ?
  `, [req.params.id]);
  if (!sale) return res.status(404).json({ error: "not found" });
  const items = all(`
    SELECT si.*, p.name as product_name, p.name_en as product_name_en,
           (si.price - si.cost_price) * si.quantity as item_profit,
           (si.price * si.quantity * si.tax_rate / 100) as item_tax_amount,
           u.name as unit_name, u.name_en as unit_name_en, u.abbreviation, u.abbreviation_en
    FROM sale_items si JOIN products p ON si.product_id = p.id
    LEFT JOIN units u ON si.unit_id = u.id
    WHERE si.sale_id = ?
  `, [req.params.id]);
  const totalProfit = items.reduce((s, i) => s + (i.item_profit || 0), 0);
  const payments = all(`
    SELECT sp.*, pm.name as payment_method_name, pm.name_en as payment_method_name_en
    FROM sale_payments sp JOIN payment_methods pm ON sp.payment_method_id = pm.id
    WHERE sp.sale_id = ?
  `, [req.params.id]);
  res.json({ ...sale, items, totalProfit, payments });
});

// Purchases
app.get("/api/purchases", (req, res) => {
  const purchases = all(`
    SELECT p.*, COALESCE(s.name, '-') as supplier_name,
           w.name as warehouse_name,
           COALESCE(pm.name, '') as payment_method_name,
           COALESCE(pm.name_en, '') as payment_method_name_en,
           COALESCE(cur.code, '') as currency_code,
           COALESCE(cur.symbol, '') as currency_symbol,
           (SELECT COALESCE(SUM(pp.amount), 0) FROM purchase_payments pp WHERE pp.purchase_id = p.id) as paid_amount
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN warehouses w ON p.warehouse_id = w.id
    LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
    LEFT JOIN currencies cur ON p.currency_id = cur.id
    ORDER BY p.id DESC
  `);
  res.json(purchases);
});

app.post("/api/purchases", (req, res) => {
  const { supplier_id, items, warehouse_id, tax_rate, payment_method_id, currency_id } = req.body;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxAmount = items.reduce((s, i) => s + i.price * i.quantity * (i.tax_rate || 0) / 100, 0);
  const total = subtotal + taxAmount;
  const date = new Date().toISOString();
  const currencyRate = currency_id ? (get("SELECT rate FROM currencies WHERE id = ?", [currency_id])?.rate || 1) : 1;

  const taxPctSetting = get("SELECT value FROM settings WHERE key = ?", ["default_tax_rate"]);
  const defaultTaxPct = taxPctSetting ? parseFloat(taxPctSetting.value) : 0;
  const purchaseId = transaction(() => {
    run("INSERT INTO purchases (supplier_id, subtotal, tax_rate, tax_amount, total, date, warehouse_id, payment_method_id, currency_id, currency_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [supplier_id || null, subtotal, 0, taxAmount, total, date, warehouse_id || null, payment_method_id || null, currency_id || null, currencyRate]);
    const pid = lastInsertId();
    for (const item of items) {
      const itemTax = item.tax_rate != null ? item.tax_rate : defaultTaxPct;
      const unitFactor = item.unit_conversion_factor || 1;
      const baseQty = Math.round(item.quantity * unitFactor);
      run("INSERT INTO purchase_items (purchase_id, product_id, quantity, price, tax_rate, unit_id, unit_conversion_factor) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [pid, item.product_id, baseQty, item.price, itemTax, item.unit_id || null, unitFactor]);
      run("UPDATE products SET quantity = quantity + ?, price = ? WHERE id = ?",
        [baseQty, item.price, item.product_id]);
      if (warehouse_id) {
        const ws = get("SELECT id FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
          [item.product_id, warehouse_id]);
        if (ws) {
          run("UPDATE warehouse_stock SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?",
            [baseQty, item.product_id, warehouse_id]);
        } else {
          run("INSERT INTO warehouse_stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)",
            [item.product_id, warehouse_id, baseQty]);
        }
      }
    }
    // Record initial payment if payment method selected
    if (payment_method_id) {
      run("INSERT INTO purchase_payments (purchase_id, payment_method_id, amount, date, currency_id) VALUES (?, ?, ?, ?, ?)",
        [pid, payment_method_id, total, date, currency_id || null]);
    }
    // Create journal entry for purchases
    const payAccSetting = get("SELECT value FROM settings WHERE key = ?", ["default_payable_account"]);
    const payAcc = payAccSetting ? parseInt(payAccSetting.value) : null;
    const purItems = all("SELECT product_id, price, quantity, (price * quantity) as line_total FROM purchase_items WHERE purchase_id = ?", [pid]);
    const invGroups = {};
    for (const pi of purItems) {
      const iAcc = resolveAccount(pi.product_id, "inventory_account_id", "default_inventory_account");
      if (iAcc) invGroups[iAcc] = (invGroups[iAcc] || 0) + pi.line_total;
    }
    if (Object.keys(invGroups).length > 0 || payAcc || payment_method_id) {
      const jdesc = `فاتورة مشتريات #${pid}`;
      run("INSERT INTO journal_entries (date, description, created_at) VALUES (?, ?, ?)", [date, jdesc, date]);
      const jid = lastInsertId();
      for (const [accId, amount] of Object.entries(invGroups)) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, parseInt(accId), amount]);
      if (payment_method_id) {
        const pm = get("SELECT account_id FROM payment_methods WHERE id = ?", [payment_method_id]);
        if (pm && pm.account_id) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, pm.account_id, total]);
      } else if (payAcc) {
        run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, payAcc, total]);
      }
    }
    return pid;
  });

  res.json({ id: purchaseId });
});

app.get("/api/purchases/:id", (req, res) => {
  const purchase = get(`
    SELECT p.*, COALESCE(s.name, '-') as supplier_name,
           w.name as warehouse_name,
           COALESCE(pm.name, '') as payment_method_name,
           COALESCE(pm.name_en, '') as payment_method_name_en,
           COALESCE(cur.code, '') as currency_code,
           COALESCE(cur.symbol, '') as currency_symbol
    FROM purchases p
    LEFT JOIN suppliers s ON p.supplier_id = s.id
    LEFT JOIN warehouses w ON p.warehouse_id = w.id
    LEFT JOIN payment_methods pm ON p.payment_method_id = pm.id
    LEFT JOIN currencies cur ON p.currency_id = cur.id
    WHERE p.id = ?
  `, [req.params.id]);
  if (!purchase) return res.status(404).json({ error: "not found" });
  const items = all(`
    SELECT pi.*, p.name as product_name, p.name_en as product_name_en,
           u.name as unit_name, u.name_en as unit_name_en, u.abbreviation, u.abbreviation_en
    FROM purchase_items pi JOIN products p ON pi.product_id = p.id
    LEFT JOIN units u ON pi.unit_id = u.id
    WHERE pi.purchase_id = ?
  `, [req.params.id]);
  const payments = all(`
    SELECT pp.*, pm.name as payment_method_name, pm.name_en as payment_method_name_en
    FROM purchase_payments pp JOIN payment_methods pm ON pp.payment_method_id = pm.id
    WHERE pp.purchase_id = ?
  `, [req.params.id]);
  res.json({ ...purchase, items, payments });
});

app.post("/api/purchases/:id/payments", (req, res) => {
  const { payment_method_id, amount, date: pmtDate } = req.body;
  const purchase = get("SELECT * FROM purchases WHERE id = ?", [req.params.id]);
  if (!purchase) return res.status(404).json({ error: "Purchase not found" });
  run("INSERT INTO purchase_payments (purchase_id, payment_method_id, amount, date, currency_id) VALUES (?, ?, ?, ?, ?)",
    [req.params.id, payment_method_id, parseFloat(amount) || 0, pmtDate || new Date().toISOString().split("T")[0], purchase.currency_id || null]);
  res.json({ id: lastInsertId() });
});

// Sales Returns
app.get("/api/sales-returns", (req, res) => {
  const returns = all(`
    SELECT sr.*, COALESCE(c.name, 'نقدي') as customer_name,
           s.id as original_sale_num
    FROM sales_returns sr
    LEFT JOIN customers c ON sr.customer_id = c.id
    LEFT JOIN sales s ON sr.original_sale_id = s.id
    ORDER BY sr.id DESC
  `);
  res.json(returns);
});

app.post("/api/sales-returns", (req, res) => {
  const { original_sale_id, customer_id, items, tax_rate, warehouse_id, payment_method_id, currency_id } = req.body;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxAmount = items.reduce((s, i) => s + i.price * i.quantity * (i.tax_rate || 0) / 100, 0);
  const total = subtotal + taxAmount;
  const date = new Date().toISOString();
  const currencyRate = currency_id ? (get("SELECT rate FROM currencies WHERE id = ?", [currency_id])?.rate || 1) : 1;

  const returnId = transaction(() => {
    run("INSERT INTO sales_returns (original_sale_id, customer_id, subtotal, tax_rate, tax_amount, total, date, warehouse_id, payment_method_id, currency_id, currency_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [original_sale_id || null, customer_id || null, subtotal, 0, taxAmount, total, date, warehouse_id || null, payment_method_id || null, currency_id || null, currencyRate]);
    const rid = lastInsertId();
    let totalCogsCost = 0;
    for (const item of items) {
      const product = get("SELECT wholesale_price, price, tax_rate FROM products WHERE id = ?", [item.product_id]);
      const costPrice = (product && product.wholesale_price > 0) ? product.wholesale_price : (product ? product.price : 0);
      const itemTax = item.tax_rate != null ? item.tax_rate : (product ? product.tax_rate : 0);
      const unitFactor = item.unit_conversion_factor || 1;
      const baseQty = Math.round(item.quantity * unitFactor);
      totalCogsCost += costPrice * baseQty;
      run("INSERT INTO sales_return_items (sales_return_id, product_id, quantity, price, cost_price, tax_rate, unit_id, unit_conversion_factor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [rid, item.product_id, baseQty, item.price, costPrice, itemTax, item.unit_id || null, unitFactor]);
      run("UPDATE products SET quantity = quantity + ? WHERE id = ?", [baseQty, item.product_id]);
      if (warehouse_id) {
        const ws = get("SELECT id FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
          [item.product_id, warehouse_id]);
        if (ws) {
          run("UPDATE warehouse_stock SET quantity = quantity + ? WHERE product_id = ? AND warehouse_id = ?",
            [baseQty, item.product_id, warehouse_id]);
        } else {
          run("INSERT INTO warehouse_stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)",
            [item.product_id, warehouse_id, baseQty]);
        }
      }
    }
    // Create journal entry for sales return (reverses the sale)
    const taxAcc = get("SELECT value FROM settings WHERE key = ?", ["default_tax_payable_account"]);
    const taxAccId = taxAcc ? parseInt(taxAcc.value) : null;
    const retItems = all("SELECT product_id, price, quantity, cost_price, (price * quantity) as line_total, (cost_price * quantity) as line_cost FROM sales_return_items WHERE sales_return_id = ?", [rid]);
    const revGroups = {}, cogsGroups = {}, invGroups = {};
    for (const si of retItems) {
      const rAcc = resolveAccount(si.product_id, "revenue_account_id", "default_revenue_account");
      if (rAcc) revGroups[rAcc] = (revGroups[rAcc] || 0) + si.line_total;
      if (si.line_cost > 0) {
        const cAcc = resolveAccount(si.product_id, "cogs_account_id", "default_cogs_account");
        const iAcc = resolveAccount(si.product_id, "inventory_account_id", "default_inventory_account");
        if (cAcc) cogsGroups[cAcc] = (cogsGroups[cAcc] || 0) + si.line_cost;
        if (iAcc) invGroups[iAcc] = (invGroups[iAcc] || 0) + si.line_cost;
      }
    }
    if (Object.keys(revGroups).length > 0 || Object.keys(cogsGroups).length > 0 || taxAmount > 0) {
      const jdesc = `مرتجع مبيعات #${rid}`;
      run("INSERT INTO journal_entries (date, description, created_at) VALUES (?, ?, ?)", [date, jdesc, date]);
      const jid = lastInsertId();
      for (const [accId, amount] of Object.entries(revGroups)) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, parseInt(accId), amount]);
      if (taxAmount > 0 && taxAccId) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, taxAccId, taxAmount]);
      if (payment_method_id) {
        const pm = get("SELECT account_id FROM payment_methods WHERE id = ?", [payment_method_id]);
        if (pm && pm.account_id) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, pm.account_id, total]);
      }
      for (const [accId, amount] of Object.entries(invGroups)) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, parseInt(accId), amount]);
      for (const [accId, amount] of Object.entries(cogsGroups)) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, parseInt(accId), amount]);
    }
    return rid;
  });

  res.json({ id: returnId });
});

app.get("/api/sales-returns/:id", (req, res) => {
  const ret = get(`
    SELECT sr.*, COALESCE(c.name, 'نقدي') as customer_name,
           s.id as original_sale_num
    FROM sales_returns sr
    LEFT JOIN customers c ON sr.customer_id = c.id
    LEFT JOIN sales s ON sr.original_sale_id = s.id
    WHERE sr.id = ?
  `, [req.params.id]);
  const items = all(`
    SELECT sri.*, p.name as product_name, p.name_en as product_name_en,
           u.name as unit_name, u.name_en as unit_name_en, u.abbreviation, u.abbreviation_en
    FROM sales_return_items sri JOIN products p ON sri.product_id = p.id
    LEFT JOIN units u ON sri.unit_id = u.id
    WHERE sri.sales_return_id = ?
  `, [req.params.id]);
  res.json({ ...ret, items });
});

// Purchase Returns
app.get("/api/purchase-returns", (req, res) => {
  const returns = all(`
    SELECT pr.*, COALESCE(s.name, '-') as supplier_name,
           p.id as original_purchase_num
    FROM purchase_returns pr
    LEFT JOIN suppliers s ON pr.supplier_id = s.id
    LEFT JOIN purchases p ON pr.original_purchase_id = p.id
    ORDER BY pr.id DESC
  `);
  res.json(returns);
});

app.post("/api/purchase-returns", (req, res) => {
  const { original_purchase_id, supplier_id, items, warehouse_id, tax_rate, payment_method_id, currency_id } = req.body;
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const taxAmount = items.reduce((s, i) => s + i.price * i.quantity * (i.tax_rate || 0) / 100, 0);
  const total = subtotal + taxAmount;
  const date = new Date().toISOString();
  const currencyRate = currency_id ? (get("SELECT rate FROM currencies WHERE id = ?", [currency_id])?.rate || 1) : 1;

  const taxPctSetting = get("SELECT value FROM settings WHERE key = ?", ["default_tax_rate"]);
  const defaultTaxPct = taxPctSetting ? parseFloat(taxPctSetting.value) : 0;
  const returnId = transaction(() => {
    run("INSERT INTO purchase_returns (original_purchase_id, supplier_id, subtotal, tax_rate, tax_amount, total, date, warehouse_id, payment_method_id, currency_id, currency_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [original_purchase_id || null, supplier_id || null, subtotal, 0, taxAmount, total, date, warehouse_id || null, payment_method_id || null, currency_id || null, currencyRate]);
    const rid = lastInsertId();
    for (const item of items) {
      const itemTax = item.tax_rate != null ? item.tax_rate : defaultTaxPct;
      const unitFactor = item.unit_conversion_factor || 1;
      const baseQty = Math.round(item.quantity * unitFactor);
      run("INSERT INTO purchase_return_items (purchase_return_id, product_id, quantity, price, tax_rate, unit_id, unit_conversion_factor) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [rid, item.product_id, baseQty, item.price, itemTax, item.unit_id || null, unitFactor]);
      run("UPDATE products SET quantity = quantity - ? WHERE id = ?", [baseQty, item.product_id]);
      if (warehouse_id) {
        const ws = get("SELECT id FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
          [item.product_id, warehouse_id]);
        if (ws) {
          run("UPDATE warehouse_stock SET quantity = quantity - ? WHERE product_id = ? AND warehouse_id = ?",
            [baseQty, item.product_id, warehouse_id]);
          const allowNeg = get("SELECT value FROM settings WHERE key = ?", ["allow_negative_stock"]);
          if (allowNeg && allowNeg.value !== "1") {
            run("DELETE FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ? AND quantity <= 0",
              [item.product_id, warehouse_id]);
          }
        }
      }
    }
    // Create journal entry for purchase return (reverses the purchase)
    const payAccSetting2 = get("SELECT value FROM settings WHERE key = ?", ["default_payable_account"]);
    const payAcc2 = payAccSetting2 ? parseInt(payAccSetting2.value) : null;
    const prItems = all("SELECT product_id, price, quantity, (price * quantity) as line_total FROM purchase_return_items WHERE purchase_return_id = ?", [rid]);
    const invGroups = {};
    for (const pi of prItems) {
      const iAcc = resolveAccount(pi.product_id, "inventory_account_id", "default_inventory_account");
      if (iAcc) invGroups[iAcc] = (invGroups[iAcc] || 0) + pi.line_total;
    }
    if (Object.keys(invGroups).length > 0 || payAcc2 || payment_method_id) {
      const jdesc = `مرتجع مشتريات #${rid}`;
      run("INSERT INTO journal_entries (date, description, created_at) VALUES (?, ?, ?)", [date, jdesc, date]);
      const jid = lastInsertId();
      for (const [accId, amount] of Object.entries(invGroups)) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, parseInt(accId), amount]);
      if (payment_method_id) {
        const pm = get("SELECT account_id FROM payment_methods WHERE id = ?", [payment_method_id]);
        if (pm && pm.account_id) run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, pm.account_id, total]);
      } else if (payAcc2) {
        run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, payAcc2, total]);
      }
    }
    return rid;
  });

  res.json({ id: returnId });
});

app.get("/api/purchase-returns/:id", (req, res) => {
  const ret = get(`
    SELECT pr.*, COALESCE(s.name, '-') as supplier_name,
           p.id as original_purchase_num
    FROM purchase_returns pr
    LEFT JOIN suppliers s ON pr.supplier_id = s.id
    LEFT JOIN purchases p ON pr.original_purchase_id = p.id
    WHERE pr.id = ?
  `, [req.params.id]);
  const items = all(`
    SELECT pri.*, p.name as product_name, p.name_en as product_name_en,
           u.name as unit_name, u.name_en as unit_name_en, u.abbreviation, u.abbreviation_en
    FROM purchase_return_items pri JOIN products p ON pri.product_id = p.id
    LEFT JOIN units u ON pri.unit_id = u.id
    WHERE pri.purchase_return_id = ?
  `, [req.params.id]);
  res.json({ ...ret, items });
});

// Reports
app.get("/api/reports/inventory", (req, res) => {
  const items = all(`
    SELECT p.name, p.quantity, p.price as retail_price,
           COALESCE(NULLIF(p.wholesale_price, 0), p.price) as cost_price,
           (p.price * p.quantity) as retail_value,
           (COALESCE(NULLIF(p.wholesale_price, 0), p.price) * p.quantity) as cost_value,
           p.tax_rate
    FROM products p ORDER BY p.name
  `);
  const retailTotal = items.reduce((s, i) => s + i.retail_value, 0);
  const costTotal = items.reduce((s, i) => s + i.cost_value, 0);
  const profit = retailTotal - costTotal;
  const margin = retailTotal > 0 ? (profit / retailTotal * 100) : 0;
  res.json({ items, retailTotal, costTotal, profit, margin });
});

app.get("/api/reports/profit", (req, res) => {
  const summary = get(`
    SELECT COALESCE(SUM(si.price * si.quantity), 0) as total_sales,
           COALESCE(SUM(si.cost_price * si.quantity), 0) as total_cost,
           COUNT(DISTINCT si.sale_id) as invoice_count,
           COALESCE(SUM(si.price * si.quantity * si.tax_rate / 100), 0) as total_tax
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
  `);
  const totalProfit = summary.total_sales - summary.total_cost;
  const margin = summary.total_sales > 0 ? (totalProfit / summary.total_sales * 100) : 0;
  res.json({ ...summary, totalProfit, margin });
});

app.get("/api/reports/profit/products", (req, res) => {
  const items = all(`
    SELECT p.name, p.name_en,
           SUM(si.quantity) as sold_qty,
           SUM(si.price * si.quantity) as sales_value,
           SUM(si.cost_price * si.quantity) as cost_value
    FROM sale_items si JOIN products p ON si.product_id = p.id
    GROUP BY si.product_id
    ORDER BY sales_value DESC
  `);
  const withProfit = items.map((i) => ({
    ...i,
    profit: i.sales_value - i.cost_value,
    margin: i.sales_value > 0 ? ((i.sales_value - i.cost_value) / i.sales_value * 100) : 0,
  }));
  res.json(withProfit);
});

// Tax Report
app.get("/api/reports/tax", (req, res) => {
  const from = req.query.from || "2000-01-01";
  const to = req.query.to || "2099-12-31";

  const outputVAT = get(`
    SELECT COALESCE(SUM(s.tax_amount), 0) as tax_amount,
           COALESCE(SUM(s.total), 0) as total_with_tax,
           COALESCE(SUM(s.subtotal), 0) as subtotal,
           COUNT(s.id) as invoice_count
    FROM sales s WHERE date(s.date) BETWEEN ? AND ? AND s.tax_rate > 0
  `, [from, to]);

  const inputVAT = get(`
    SELECT COALESCE(SUM(p.tax_amount), 0) as tax_amount,
           COALESCE(SUM(p.total), 0) as total_with_tax,
           COALESCE(SUM(p.subtotal), 0) as subtotal,
           COUNT(p.id) as invoice_count
    FROM purchases p WHERE date(p.date) BETWEEN ? AND ? AND p.tax_rate > 0
  `, [from, to]);

  const netPayable = outputVAT.tax_amount - inputVAT.tax_amount;

  const monthlyBreakdown = all(`
    SELECT strftime('%Y-%m', s.date) as month,
           COALESCE(SUM(s.tax_amount), 0) as output_vat,
           COALESCE(SUM(s.subtotal), 0) as sales,
           COUNT(s.id) as invoice_count
    FROM sales s WHERE date(s.date) BETWEEN ? AND ? AND s.tax_rate > 0
    GROUP BY strftime('%Y-%m', s.date) ORDER BY month
  `, [from, to]);

  const monthlyPurchases = all(`
    SELECT strftime('%Y-%m', p.date) as month,
           COALESCE(SUM(p.tax_amount), 0) as input_vat,
           COALESCE(SUM(p.subtotal), 0) as purchases,
           COUNT(p.id) as invoice_count
    FROM purchases p WHERE date(p.date) BETWEEN ? AND ? AND p.tax_rate > 0
    GROUP BY strftime('%Y-%m', p.date) ORDER BY month
  `, [from, to]);

  res.json({ outputVAT, inputVAT, netPayable, monthlyBreakdown, monthlyPurchases });
});

// Journal Entries
app.get("/api/journal-entries", (req, res) => {
  const entries = all(`
    SELECT je.*,
           (SELECT COALESCE(SUM(jdi.debit), 0) FROM journal_entry_items jdi WHERE jdi.journal_entry_id = je.id) as total_debit,
           (SELECT COALESCE(SUM(jdi.credit), 0) FROM journal_entry_items jdi WHERE jdi.journal_entry_id = je.id) as total_credit,
           (SELECT COUNT(*) FROM journal_entry_items jdi WHERE jdi.journal_entry_id = je.id) as items_count
    FROM journal_entries je ORDER BY je.id DESC
  `);
  res.json(entries);
});

app.get("/api/journal-entries/:id", (req, res) => {
  const entry = get("SELECT * FROM journal_entries WHERE id = ?", [req.params.id]);
  if (!entry) return res.status(404).json({ error: "not found" });
  const items = all(`
    SELECT jei.*, a.code as account_code, a.name as account_name, a.name_en as account_name_en
    FROM journal_entry_items jei
    JOIN accounts a ON jei.account_id = a.id
    WHERE jei.journal_entry_id = ?
  `, [req.params.id]);
  res.json({ ...entry, items });
});

app.post("/api/journal-entries", (req, res) => {
  const { date, description, description_en, reference, items } = req.body;
  const created_at = new Date().toISOString();

  if (!items || items.length < 2) {
    return res.status(400).json({ error: "يجب إضافة قيدين على الأقل" });
  }

  const totalDebit = items.reduce((s, i) => s + (parseFloat(i.debit) || 0), 0);
  const totalCredit = items.reduce((s, i) => s + (parseFloat(i.credit) || 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return res.status(400).json({ error: "مجموع المدين لا يساوي مجموع الدائن" });
  }

  run("INSERT INTO journal_entries (date, description, description_en, reference, created_at) VALUES (?, ?, ?, ?, ?)",
    [date, description, description_en || null, reference || null, created_at]);
  const jid = lastInsertId();
  for (const item of items) {
    run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit, description) VALUES (?, ?, ?, ?, ?)",
      [jid, item.account_id, parseFloat(item.debit) || 0, parseFloat(item.credit) || 0, item.description || null]);
  }

  res.json({ id: jid });
});

app.delete("/api/journal-entries/:id", (req, res) => {
  const items = all("SELECT id FROM journal_entry_items WHERE journal_entry_id = ?", [req.params.id]);
  for (const item of items) {
    run("DELETE FROM journal_entry_items WHERE id = ?", [item.id]);
  }
  run("DELETE FROM journal_entries WHERE id = ?", [req.params.id]);
  res.json({ ok: true });
});

// Account Statements
app.get("/api/statements/customers/:id", (req, res) => {
  const { from, to } = req.query;
  const customerId = req.params.id;
  const customer = get("SELECT * FROM customers WHERE id = ?", [customerId]);
  if (!customer) return res.status(404).json({ error: "not found" });

  let dateFilter = "";
  const params = [customerId];
  if (from && to) { dateFilter = " AND date(date) BETWEEN ? AND ?"; params.push(from, to); }

  const sales = all(`
    SELECT date, 'sale' as type, id as ref, total as debit, 0 as credit, customer_id as party_id
    FROM sales WHERE customer_id = ?${dateFilter}
  `, params);
  const returns = all(`
    SELECT date, 'sales_return' as type, id as ref, 0 as debit, total as credit, customer_id as party_id
    FROM sales_returns WHERE customer_id = ?${dateFilter}
  `, params);

  let transactions = [...sales, ...returns]
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  transactions = transactions.map((t) => {
    balance += (t.debit || 0) - (t.credit || 0);
    return { ...t, balance };
  });

  res.json({ party: customer, transactions, balance });
});

app.get("/api/statements/suppliers/:id", (req, res) => {
  const { from, to } = req.query;
  const supplierId = req.params.id;
  const supplier = get("SELECT * FROM suppliers WHERE id = ?", [supplierId]);
  if (!supplier) return res.status(404).json({ error: "not found" });

  let dateFilter = "";
  const params = [supplierId];
  if (from && to) { dateFilter = " AND date(date) BETWEEN ? AND ?"; params.push(from, to); }

  const purchases = all(`
    SELECT date, 'purchase' as type, id as ref, 0 as debit, total as credit, supplier_id as party_id
    FROM purchases WHERE supplier_id = ?${dateFilter}
  `, params);
  const returns = all(`
    SELECT date, 'purchase_return' as type, id as ref, total as debit, 0 as credit, supplier_id as party_id
    FROM purchase_returns WHERE supplier_id = ?${dateFilter}
  `, params);

  let transactions = [...purchases, ...returns]
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 0;
  transactions = transactions.map((t) => {
    balance += (t.debit || 0) - (t.credit || 0);
    return { ...t, balance };
  });

  res.json({ party: supplier, transactions, balance });
});

// Account Statement (general ledger)
app.get("/api/statements/accounts/:id", (req, res) => {
  const { from, to } = req.query;
  const accountId = req.params.id;
  const account = get("SELECT * FROM accounts WHERE id = ?", [accountId]);
  if (!account) return res.status(404).json({ error: "not found" });

  let dateFilter = "";
  const params = [accountId];
  if (from && to) { dateFilter = " AND date(je.date) BETWEEN ? AND ?"; params.push(from, to); }

  const items = all(`
    SELECT je.date, je.description, je.description_en, je.reference,
           jei.debit, jei.credit, jei.description as line_description,
           jei.journal_entry_id as ref_id
    FROM journal_entry_items jei
    JOIN journal_entries je ON jei.journal_entry_id = je.id
    WHERE jei.account_id = ?${dateFilter}
    ORDER BY je.date, jei.id
  `, params);

  let balance = 0;
  const transactions = items.map((item) => {
    balance += (item.debit || 0) - (item.credit || 0);
    return { ...item, type: "journal", ref: item.ref_id, balance };
  });

  res.json({ party: account, transactions, balance });
});

// Employee Statement
app.get("/api/statements/employees/:id", (req, res) => {
  const { from, to } = req.query;
  const empId = req.params.id;
  const emp = get("SELECT * FROM employees WHERE id = ?", [empId]);
  if (!emp) return res.status(404).json({ error: "not found" });

  let transactions = [];
  let balance = 0;

  // If employee has a salary_account_id, include journal entries for that account
  if (emp.salary_account_id) {
    let dateFilter = "";
    const params = [emp.salary_account_id];
    if (from && to) { dateFilter = " AND date(je.date) BETWEEN ? AND ?"; params.push(from, to); }

    const items = all(`
      SELECT je.date, 'journal' as type, jei.journal_entry_id as ref,
             jei.debit, jei.credit, je.description, je.description_en
      FROM journal_entry_items jei
      JOIN journal_entries je ON jei.journal_entry_id = je.id
      WHERE jei.account_id = ?${dateFilter}
      ORDER BY je.date, jei.id
    `, params);

    transactions = items.map((item) => {
      balance += (item.debit || 0) - (item.credit || 0);
      return { ...item, balance };
    });
  }

  res.json({ party: emp, transactions, balance });
});

// Vouchers (Receipt / Payment)
app.get("/api/vouchers", (req, res) => {
  const { type, from, to } = req.query;
  let sql = `SELECT v.*, a.name as account_name, a.name_en as account_name_en
    FROM vouchers v JOIN accounts a ON v.account_id = a.id`;
  const params = [];
  const conds = [];
  if (type) { conds.push("v.type = ?"); params.push(type); }
  if (from) { conds.push("v.date >= ?"); params.push(from); }
  if (to) { conds.push("v.date <= ?"); params.push(to); }
  if (conds.length) sql += " WHERE " + conds.join(" AND ");
  sql += " ORDER BY v.id DESC";
  res.json(all(sql, params));
});

app.get("/api/vouchers/next-number/:type", (req, res) => {
  const prefix = req.params.type === "receipt" ? "RCP" : "PAY";
  const last = get("SELECT number FROM vouchers WHERE type = ? ORDER BY id DESC LIMIT 1", [req.params.type]);
  let num = 1;
  if (last) {
    const m = last.number.match(/(\d+)$/);
    if (m) num = parseInt(m[1]) + 1;
  }
  res.json({ number: `${prefix}-${String(num).padStart(4, "0")}` });
});

app.post("/api/vouchers", (req, res) => {
  const { type, number, date, account_id, amount, description, reference } = req.body;
  if (!type || !number || !date || !account_id || amount == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const created_at = new Date().toISOString();
  const created_by = req.user?.name || "admin";
  run("INSERT INTO vouchers (type, number, date, account_id, amount, description, reference, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [type, number, date, account_id, parseFloat(amount), description || null, reference || null, created_by, created_at]);
  const vid = lastInsertId();

  // Auto-create journal entry for the voucher
  const account = get("SELECT * FROM accounts WHERE id = ?", [account_id]);
  const cashAccount = get("SELECT id FROM accounts WHERE code = '1-1-1'");
  if (account && cashAccount) {
    const jdate = date;
    const jdesc = `${type === "receipt" ? "قبض" : "صرف"} #${number} - ${description || ""}`;
    run("INSERT INTO journal_entries (date, description, created_at) VALUES (?, ?, ?)", [jdate, jdesc, created_at]);
    const jid = lastInsertId();
    if (type === "receipt") {
      run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, cashAccount.id, parseFloat(amount)]);
      run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, account_id, parseFloat(amount)]);
    } else {
      run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, cashAccount.id, parseFloat(amount)]);
      run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, account_id, parseFloat(amount)]);
    }
  }

  res.json({ id: vid });
});

app.put("/api/vouchers/:id", (req, res) => {
  const { type, number, date, account_id, amount, description, reference, created_at } = req.body;
  const old = get("SELECT * FROM vouchers WHERE id=?", [req.params.id]);
  if (!old) return res.status(404).json({ error: "Voucher not found" });
  run("UPDATE vouchers SET type=?, number=?, date=?, account_id=?, amount=?, description=?, reference=? WHERE id=?",
    [type, number, date, account_id, parseFloat(amount), description || null, reference || null, req.params.id]);
  // Delete old journal entry and recreate
  const oldJe = get("SELECT id FROM journal_entries WHERE description LIKE ?", [`%#${old.number}%`]);
  if (oldJe) run("DELETE FROM journal_entries WHERE id=?", [oldJe.id]);
  const account = get("SELECT * FROM accounts WHERE id = ?", [account_id]);
  const cashAccount = get("SELECT id FROM accounts WHERE code = '1-1-1'");
  if (account && cashAccount) {
    const jdate = date;
    const jdesc = `${type === "receipt" ? "قبض" : "صرف"} #${number} - ${description || ""}`;
    const ca = created_at || new Date().toISOString();
    run("INSERT INTO journal_entries (date, description, created_at) VALUES (?, ?, ?)", [jdate, jdesc, ca]);
    const jid = lastInsertId();
    if (type === "receipt") {
      run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, cashAccount.id, parseFloat(amount)]);
      run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, account_id, parseFloat(amount)]);
    } else {
      run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, 0, ?)", [jid, cashAccount.id, parseFloat(amount)]);
      run("INSERT INTO journal_entry_items (journal_entry_id, account_id, debit, credit) VALUES (?, ?, ?, 0)", [jid, account_id, parseFloat(amount)]);
    }
  }
  res.json({ ok: true });
});

app.delete("/api/vouchers/:id", (req, res) => {
  const old = get("SELECT * FROM vouchers WHERE id=?", [req.params.id]);
  if (old) {
    const oldJe = get("SELECT id FROM journal_entries WHERE description LIKE ?", [`%#${old.number}%`]);
    if (oldJe) run("DELETE FROM journal_entries WHERE id=?", [oldJe.id]);
  }
  run("DELETE FROM vouchers WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// Stock Reconciliation
app.get("/api/stock-reconciliations", (req, res) => {
  const list = all(`
    SELECT sr.*, w.name as warehouse_name, w.name_en as warehouse_name_en
    FROM stock_reconciliations sr
    JOIN warehouses w ON w.id = sr.warehouse_id
    ORDER BY sr.date DESC, sr.id DESC
  `);
  res.json(list);
});

app.get("/api/stock-reconciliations/:id", (req, res) => {
  const rec = get(`
    SELECT sr.*, w.name as warehouse_name, w.name_en as warehouse_name_en
    FROM stock_reconciliations sr
    JOIN warehouses w ON w.id = sr.warehouse_id
    WHERE sr.id = ?
  `, [req.params.id]);
  if (!rec) return res.status(404).json({ error: "not found" });
  rec.items = all(`
    SELECT sri.*, p.name as product_name, p.name_en as product_name_en,
           u.name as unit_name, u.name_en as unit_name_en, u.abbreviation, u.abbreviation_en
    FROM stock_reconciliation_items sri
    JOIN products p ON p.id = sri.product_id
    LEFT JOIN units u ON sri.unit_id = u.id
    WHERE sri.reconciliation_id = ?
  `, [req.params.id]);
  res.json(rec);
});

app.post("/api/stock-reconciliations", (req, res) => {
  const { warehouse_id, date, notes, items } = req.body;
  if (!warehouse_id || !items || items.length === 0)
    return res.status(400).json({ error: "Missing required fields" });

  transaction(() => {
    run("INSERT INTO stock_reconciliations (warehouse_id, date, notes, created_at) VALUES (?, ?, ?, ?)",
      [warehouse_id, date || new Date().toISOString().split("T")[0], notes || null, new Date().toISOString()]);
    const recId = lastInsertId();

    for (const item of items) {
      const expected = parseFloat(item.expected_qty) || 0;
      const actual = parseFloat(item.actual_qty) || 0;
      const diff = actual - expected;
      const pid = parseInt(item.product_id);

      run("INSERT INTO stock_reconciliation_items (reconciliation_id, product_id, expected_qty, actual_qty, difference, unit_id, unit_conversion_factor) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [recId, pid, expected, actual, diff, item.unit_id || null, item.unit_conversion_factor || 1]);

      // Update warehouse stock
      const ws = get("SELECT id, quantity FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
        [pid, warehouse_id]);
      if (ws) {
        run("UPDATE warehouse_stock SET quantity = ? WHERE id = ?", [ws.id + diff, ws.id]);
      } else {
        run("INSERT INTO warehouse_stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)",
          [pid, warehouse_id, actual]);
      }
      // Update global product quantity
      run("UPDATE products SET quantity = quantity + ? WHERE id = ?", [diff, pid]);
    }
  });
  res.json({ ok: true });
});

app.delete("/api/stock-reconciliations/:id", (req, res) => {
  const rec = get("SELECT * FROM stock_reconciliations WHERE id = ?", [req.params.id]);
  if (!rec) return res.status(404).json({ error: "not found" });
  transaction(() => {
    const items = all("SELECT * FROM stock_reconciliation_items WHERE reconciliation_id = ?", [req.params.id]);
    for (const item of items) {
      // Reverse the adjustment
      const ws = get("SELECT id, quantity FROM warehouse_stock WHERE product_id = ? AND warehouse_id = ?",
        [item.product_id, rec.warehouse_id]);
      if (ws) {
        run("UPDATE warehouse_stock SET quantity = ? WHERE id = ?", [ws.quantity - item.difference, ws.id]);
      }
      run("UPDATE products SET quantity = quantity - ? WHERE id = ?", [item.difference, item.product_id]);
    }
    run("DELETE FROM stock_reconciliation_items WHERE reconciliation_id = ?", [req.params.id]);
    run("DELETE FROM stock_reconciliations WHERE id = ?", [req.params.id]);
  });
  res.json({ ok: true });
});

// Stock Ledger Report (computed via UNION of all stock movements)
app.get("/api/reports/stock-ledger", (req, res) => {
  const { product_id, warehouse_id, from, to } = req.query;
  const conditions = [];
  const params = [];
  if (product_id) { conditions.push("AND product_id = ?"); params.push(parseInt(product_id)); }
  if (warehouse_id) { conditions.push("AND warehouse_id = ?"); params.push(parseInt(warehouse_id)); }

  const dateFilter = [];
  if (from) { dateFilter.push("AND date >= ?"); params.push(from); }
  if (to) { dateFilter.push("AND date <= ?"); params.push(to); }

  const whFilter = conditions.join(" ");
  const dtFilter = dateFilter.join(" ");

  const ledger = all(`
    SELECT date, reference_type, reference_id, product_id, warehouse_id, in_qty, out_qty, description
    FROM (
      -- Purchase items (stock in)
      SELECT pi.date, 'purchase' as reference_type, pi.reference_id, pi.product_id,
             pi.warehouse_id, pi.quantity as in_qty, 0 as out_qty, pi.description
      FROM (
        SELECT p.date, p.id as reference_id, pit.product_id,
               p.warehouse_id, pit.quantity,
               'فاتورة مشتريات #' || p.id || ' - ' || COALESCE(pr.name, '') as description
        FROM purchase_items pit
        JOIN purchases p ON p.id = pit.purchase_id
        LEFT JOIN suppliers pr ON pr.id = p.supplier_id
      ) pi
      UNION ALL
      -- Purchase return items (stock out)
      SELECT pr.date, 'purchase_return' as reference_type, pr.reference_id, pr.product_id,
             pr.warehouse_id, 0 as in_qty, pr.quantity as out_qty, pr.description
      FROM (
        SELECT prt.date, prt.id as reference_id, prit.product_id,
               prt.warehouse_id, prit.quantity,
               'مرتجع مشتريات #' || prt.id || ' - ' || COALESCE(s.name, '') as description
        FROM purchase_return_items prit
        JOIN purchase_returns prt ON prt.id = prit.purchase_return_id
        LEFT JOIN suppliers s ON s.id = prt.supplier_id
      ) pr
      UNION ALL
      -- Sale items (stock out)
      SELECT s.date, 'sale' as reference_type, s.reference_id, s.product_id,
             s.warehouse_id, 0 as in_qty, s.quantity as out_qty, s.description
      FROM (
        SELECT sl.date, sl.id as reference_id, si.product_id,
               sl.warehouse_id, si.quantity,
               'فاتورة مبيعات #' || sl.id || ' - ' || COALESCE(c.name, '') as description
        FROM sale_items si
        JOIN sales sl ON sl.id = si.sale_id
        LEFT JOIN customers c ON c.id = sl.customer_id
        WHERE sl.status IS NULL OR sl.status != 'hold'
      ) s
      UNION ALL
      -- Sales return items (stock in)
      SELECT sr.date, 'sales_return' as reference_type, sr.reference_id, sr.product_id,
             sr.warehouse_id, sr.quantity as in_qty, 0 as out_qty, sr.description
      FROM (
        SELECT srt.date, srt.id as reference_id, srit.product_id,
               srt.warehouse_id, srit.quantity,
               'مرتجع مبيعات #' || srt.id || ' - ' || COALESCE(c.name, '') as description
        FROM sales_return_items srit
        JOIN sales_returns srt ON srt.id = srit.sales_return_id
        LEFT JOIN customers c ON c.id = srt.customer_id
      ) sr
      UNION ALL
      -- Stock transfer (out from source)
      SELECT st.date, 'transfer_out' as reference_type, st.reference_id, st.product_id,
             st.from_warehouse_id as warehouse_id, 0 as in_qty, st.quantity as out_qty, st.description
      FROM (
        SELECT sti.date, sti.id as reference_id, stit.product_id,
               stit.quantity, sti.from_warehouse_id, 'تحويل مخزني #' || sti.id || ' (من)' as description
        FROM stock_transfer_items stit
        JOIN stock_transfers sti ON sti.id = stit.transfer_id
      ) st
      UNION ALL
      SELECT st.date, 'transfer_in' as reference_type, st.reference_id, st.product_id,
             st.to_warehouse_id as warehouse_id, st.quantity as in_qty, 0 as out_qty, st.description
      FROM (
        SELECT sti.date, sti.id as reference_id, stit.product_id,
               stit.quantity, sti.to_warehouse_id, 'تحويل مخزني #' || sti.id || ' (إلى)' as description
        FROM stock_transfer_items stit
        JOIN stock_transfers sti ON sti.id = stit.transfer_id
      ) st
      UNION ALL
      -- Stock reconciliation adjustments
      SELECT rec.date, 'reconciliation' as reference_type, rec.reference_id, rec.product_id,
             rec.warehouse_id,
             CASE WHEN rec.difference > 0 THEN rec.difference ELSE 0 END as in_qty,
             CASE WHEN rec.difference < 0 THEN -rec.difference ELSE 0 END as out_qty,
             rec.description
      FROM (
        SELECT sr.date, sr.id as reference_id, sri.product_id,
               sr.warehouse_id, sri.difference,
               'جرد مخزني #' || sr.id as description
        FROM stock_reconciliation_items sri
        JOIN stock_reconciliations sr ON sr.id = sri.reconciliation_id
        WHERE sri.difference != 0
      ) rec
    ) movements
    WHERE 1=1 ${whFilter} ${dtFilter}
    ORDER BY date ASC, reference_id ASC
  `, params);
  res.json(ledger);
});

// Landed Cost Vouchers
app.get("/api/landed-costs", (req, res) => {
  const { purchase_id } = req.query;
  let sql = `SELECT lcv.*, p.id as purchase_num, COALESCE(s.name, '-') as supplier_name
    FROM landed_cost_vouchers lcv
    JOIN purchases p ON p.id = lcv.purchase_id
    LEFT JOIN suppliers s ON s.id = p.supplier_id`;
  const params = [];
  if (purchase_id) {
    sql += " WHERE lcv.purchase_id = ?";
    params.push(parseInt(purchase_id));
  }
  sql += " ORDER BY lcv.date DESC, lcv.id DESC";
  res.json(all(sql, params));
});

app.get("/api/landed-costs/:id", (req, res) => {
  const v = get(`
    SELECT lcv.*, p.id as purchase_num, COALESCE(s.name, '-') as supplier_name
    FROM landed_cost_vouchers lcv
    JOIN purchases p ON p.id = lcv.purchase_id
    LEFT JOIN suppliers s ON s.id = p.supplier_id
    WHERE lcv.id = ?
  `, [req.params.id]);
  if (!v) return res.status(404).json({ error: "not found" });
  v.items = all(`
    SELECT lci.*, a.name as account_name, a.name_en as account_name_en
    FROM landed_cost_items lci
    LEFT JOIN accounts a ON a.id = lci.account_id
    WHERE lci.voucher_id = ?
  `, [req.params.id]);
  res.json(v);
});

app.post("/api/landed-costs", (req, res) => {
  const { purchase_id, date, notes, items } = req.body;
  if (!purchase_id || !items || items.length === 0)
    return res.status(400).json({ error: "Missing required fields" });
  const totalCost = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  if (totalCost <= 0) return res.status(400).json({ error: "Total cost must be > 0" });

  transaction(() => {
    run("INSERT INTO landed_cost_vouchers (purchase_id, date, notes, created_by, created_at) VALUES (?, ?, ?, ?, ?)",
      [purchase_id, date || new Date().toISOString().split("T")[0], notes || null, req.user?.username || null, new Date().toISOString()]);
    const vId = lastInsertId();

    for (const item of items) {
      run("INSERT INTO landed_cost_items (voucher_id, description, amount, account_id) VALUES (?, ?, ?, ?)",
        [vId, item.description, parseFloat(item.amount) || 0, item.account_id || null]);
    }

    // Distribute landed cost across purchase items proportionally by value
    const purchaseItems = all("SELECT pi.*, p.wholesale_price FROM purchase_items pi JOIN products p ON p.id = pi.product_id WHERE pi.purchase_id = ?",
      [purchase_id]);
    const purchaseTotal = purchaseItems.reduce((s, pi) => s + pi.price * pi.quantity, 0);
    if (purchaseTotal > 0) {
      for (const pi of purchaseItems) {
        const itemValue = pi.price * pi.quantity;
        const allocCost = (itemValue / purchaseTotal) * totalCost;
        const unitCost = allocCost / pi.quantity;
        const oldWsPrice = pi.wholesale_price || 0;
        const newWsPrice = oldWsPrice + unitCost;
        run("UPDATE products SET wholesale_price = ? WHERE id = ?", [newWsPrice, pi.product_id]);
      }
    }
  });
  res.json({ ok: true });
});

app.delete("/api/landed-costs/:id", (req, res) => {
  const v = get("SELECT * FROM landed_cost_vouchers WHERE id = ?", [req.params.id]);
  if (!v) return res.status(404).json({ error: "not found" });
  transaction(() => {
    const items = all("SELECT * FROM landed_cost_items WHERE voucher_id = ?", [req.params.id]);
    const totalCost = items.reduce((s, i) => s + i.amount, 0);
    // Reverse cost distribution
    const purchaseItems = all("SELECT * FROM purchase_items WHERE purchase_id = ?", [v.purchase_id]);
    const purchaseTotal = purchaseItems.reduce((s, pi) => s + pi.price * pi.quantity, 0);
    if (purchaseTotal > 0) {
      for (const pi of purchaseItems) {
        const itemValue = pi.price * pi.quantity;
        const allocCost = (itemValue / purchaseTotal) * totalCost;
        const unitCost = allocCost / pi.quantity;
        run("UPDATE products SET wholesale_price = wholesale_price - ? WHERE id = ?", [unitCost, pi.product_id]);
      }
    }
    run("DELETE FROM landed_cost_items WHERE voucher_id = ?", [req.params.id]);
    run("DELETE FROM landed_cost_vouchers WHERE id = ?", [req.params.id]);
  });
  res.json({ ok: true });
});

// ===================== Financial Reports =====================

// Trial Balance — list all accounts with debit/credit totals from journal entries
app.get("/api/reports/trial-balance", (req, res) => {
  const { from, to } = req.query;
  const dateFilter = [];
  const params = [];
  if (from) { dateFilter.push("AND je.date >= ?"); params.push(from); }
  if (to) { dateFilter.push("AND je.date <= ?"); params.push(to); }

  const rows = all(`
    SELECT a.id, a.code, a.name, a.name_en, a.type,
           COALESCE(t.debit_total, 0) as debit_total,
           COALESCE(t.credit_total, 0) as credit_total
    FROM accounts a
    LEFT JOIN (
      SELECT jei.account_id,
             SUM(jei.debit) as debit_total,
             SUM(jei.credit) as credit_total
      FROM journal_entry_items jei
      JOIN journal_entries je ON jei.journal_entry_id = je.id
      WHERE 1=1 ${dateFilter.join(" ")}
      GROUP BY jei.account_id
    ) t ON t.account_id = a.id
    ORDER BY a.code
  `, params);

  const enriched = rows.map((r) => ({
    ...r,
    balance: r.debit_total - r.credit_total,
  }));

  const totals = {
    total_debit: enriched.reduce((s, r) => s + r.debit_total, 0),
    total_credit: enriched.reduce((s, r) => s + r.credit_total, 0),
    total_balance: enriched.reduce((s, r) => s + r.balance, 0),
  };

  res.json({ rows: enriched, totals });
});

// Balance Sheet — asset, liability, equity accounts with their net balances
app.get("/api/reports/balance-sheet", (req, res) => {
  const { from, to } = req.query;
  const dateFilter = [];
  const params = [];
  if (from) { dateFilter.push("AND je.date >= ?"); params.push(from); }
  if (to) { dateFilter.push("AND je.date <= ?"); params.push(to); }

  const rows = all(`
    SELECT a.id, a.code, a.name, a.name_en, a.type,
           COALESCE(t.debit_total, 0) as debit_total,
           COALESCE(t.credit_total, 0) as credit_total
    FROM accounts a
    LEFT JOIN (
      SELECT jei.account_id,
             SUM(jei.debit) as debit_total,
             SUM(jei.credit) as credit_total
      FROM journal_entry_items jei
      JOIN journal_entries je ON jei.journal_entry_id = je.id
      WHERE 1=1 ${dateFilter.join(" ")}
      GROUP BY jei.account_id
    ) t ON t.account_id = a.id
    WHERE a.type IN ('asset','liability','equity')
    ORDER BY a.code
  `, params);

  const enriched = rows.map((r) => ({
    ...r,
    balance: r.type === 'asset'
      ? (r.debit_total - r.credit_total)  // assets = debit normal
      : (r.credit_total - r.debit_total), // liabilities/equity = credit normal
  }));

  const assets = enriched.filter((r) => r.type === 'asset');
  const liabilities = enriched.filter((r) => r.type === 'liability');
  const equity = enriched.filter((r) => r.type === 'equity');

  const totals = {
    total_assets: assets.reduce((s, r) => s + r.balance, 0),
    total_liabilities: liabilities.reduce((s, r) => s + r.balance, 0),
    total_equity: equity.reduce((s, r) => s + r.balance, 0),
  };

  res.json({ assets, liabilities, equity, totals });
});

// Income Statement — income & expense accounts with net balances
app.get("/api/reports/income-statement", (req, res) => {
  const { from, to } = req.query;
  const dateFilter = [];
  const params = [];
  if (from) { dateFilter.push("AND je.date >= ?"); params.push(from); }
  if (to) { dateFilter.push("AND je.date <= ?"); params.push(to); }

  const rows = all(`
    SELECT a.id, a.code, a.name, a.name_en, a.type,
           COALESCE(t.debit_total, 0) as debit_total,
           COALESCE(t.credit_total, 0) as credit_total
    FROM accounts a
    LEFT JOIN (
      SELECT jei.account_id,
             SUM(jei.debit) as debit_total,
             SUM(jei.credit) as credit_total
      FROM journal_entry_items jei
      JOIN journal_entries je ON jei.journal_entry_id = je.id
      WHERE 1=1 ${dateFilter.join(" ")}
      GROUP BY jei.account_id
    ) t ON t.account_id = a.id
    WHERE a.type IN ('income','expense')
    ORDER BY a.code
  `, params);

  const enriched = rows.map((r) => ({
    ...r,
    balance: r.type === 'income'
      ? (r.credit_total - r.debit_total)  // income = credit normal
      : (r.debit_total - r.credit_total), // expense = debit normal
  }));

  const income = enriched.filter((r) => r.type === 'income');
  const expenses = enriched.filter((r) => r.type === 'expense');

  const totalIncome = income.reduce((s, r) => s + r.balance, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.balance, 0);
  const netIncome = totalIncome - totalExpenses;

  res.json({ income, expenses, totals: { total_income: totalIncome, total_expenses: totalExpenses, net_income: netIncome } });
});

// Bulk delete endpoints
app.post("/api/products/bulk-delete", (req, res) => {
  transaction(() => { for (const id of req.body.ids) { run("DELETE FROM warehouse_stock WHERE product_id=?", [id]); run("DELETE FROM sale_items WHERE product_id=?", [id]); run("DELETE FROM purchase_items WHERE product_id=?", [id]); run("DELETE FROM product_units WHERE product_id=?", [id]); run("DELETE FROM products WHERE id=?", [id]); } });
  res.json({ ok: true });
});
app.post("/api/customers/bulk-delete", (req, res) => {
  run("DELETE FROM customers WHERE id IN (" + req.body.ids.map(() => "?").join(",") + ")", req.body.ids);
  res.json({ ok: true });
});
app.post("/api/suppliers/bulk-delete", (req, res) => {
  run("DELETE FROM suppliers WHERE id IN (" + req.body.ids.map(() => "?").join(",") + ")", req.body.ids);
  res.json({ ok: true });
});
app.post("/api/employees/bulk-delete", (req, res) => {
  run("DELETE FROM employees WHERE id IN (" + req.body.ids.map(() => "?").join(",") + ")", req.body.ids);
  res.json({ ok: true });
});
app.post("/api/units/bulk-delete", (req, res) => {
  transaction(() => { for (const id of req.body.ids) { run("DELETE FROM product_units WHERE unit_id=?", [id]); run("DELETE FROM units WHERE id=?", [id]); } });
  res.json({ ok: true });
});
app.post("/api/categories/bulk-delete", (req, res) => {
  transaction(() => { for (const id of req.body.ids) { run("UPDATE products SET category_id=null WHERE category_id=?", [id]); run("DELETE FROM categories WHERE id=?", [id]); } });
  res.json({ ok: true });
});
app.post("/api/warehouses/bulk-delete", (req, res) => {
  transaction(() => { for (const id of req.body.ids) { run("DELETE FROM warehouse_stock WHERE warehouse_id=?", [id]); run("DELETE FROM stock_transfers WHERE from_warehouse_id=? OR to_warehouse_id=?", [id, id]); run("DELETE FROM stock_reconciliation_items WHERE stock_reconciliation_id IN (SELECT id FROM stock_reconciliations WHERE warehouse_id=?)", [id]); run("DELETE FROM stock_reconciliations WHERE warehouse_id=?", [id]); run("DELETE FROM purchases WHERE warehouse_id=?", [id]); run("DELETE FROM sales WHERE warehouse_id=?", [id]); run("DELETE FROM warehouses WHERE id=?", [id]); } });
  res.json({ ok: true });
});
app.post("/api/users/bulk-delete", (req, res) => {
  run("DELETE FROM users WHERE id IN (" + req.body.ids.map(() => "?").join(",") + ")", req.body.ids);
  res.json({ ok: true });
});
app.post("/api/vouchers/bulk-delete", (req, res) => {
  transaction(() => { for (const id of req.body.ids) { const v = get("SELECT * FROM vouchers WHERE id=?", [id]); if (v) { const je = get("SELECT id FROM journal_entries WHERE description LIKE ?", [`%#${v.number}%`]); if (je) run("DELETE FROM journal_entries WHERE id=?", [je.id]); } run("DELETE FROM vouchers WHERE id=?", [id]); } });
  res.json({ ok: true });
});
app.post("/api/journal-entries/bulk-delete", (req, res) => {
  run("DELETE FROM journal_entries WHERE id IN (" + req.body.ids.map(() => "?").join(",") + ")", req.body.ids);
  res.json({ ok: true });
});
app.post("/api/stock-reconciliations/bulk-delete", (req, res) => {
  transaction(() => { for (const id of req.body.ids) { const rec = get("SELECT * FROM stock_reconciliations WHERE id=?", [id]); if (rec) { const items = all("SELECT * FROM stock_reconciliation_items WHERE stock_reconciliation_id=?", [id]); for (const it of items) { const p = get("SELECT quantity FROM products WHERE id=?", [it.product_id]); if (p) { const diff = it.new_qty - it.old_qty; run("UPDATE products SET quantity = quantity - ? WHERE id=?", [diff, it.product_id]); const ws = get("SELECT id, quantity FROM warehouse_stock WHERE product_id=? AND warehouse_id=?", [it.product_id, rec.warehouse_id]); if (ws) { run("UPDATE warehouse_stock SET quantity = quantity - ? WHERE id=?", [diff, ws.id]); } } } run("DELETE FROM stock_reconciliation_items WHERE stock_reconciliation_id=?", [id]); run("DELETE FROM stock_reconciliations WHERE id=?", [id]); } } });
  res.json({ ok: true });
});
app.post("/api/landed-costs/bulk-delete", (req, res) => {
  transaction(() => { for (const id of req.body.ids) { run("DELETE FROM landed_cost_items WHERE landed_cost_id=?", [id]); run("DELETE FROM landed_cost_vouchers WHERE id=?", [id]); } });
  res.json({ ok: true });
});

// Serve built frontend
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return;
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 3001;
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(console.error);
