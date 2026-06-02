import initSqlJs from "sql.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createHash, randomBytes } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "store.db");

let db = null;

export async function initDb() {
  const SQL = await initSqlJs();
  try {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } catch {
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      color TEXT DEFAULT '#6366f1',
      revenue_account_id INTEGER REFERENCES accounts(id),
      cogs_account_id INTEGER REFERENCES accounts(id),
      inventory_account_id INTEGER REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      barcode TEXT,
      category_id INTEGER,
      price REAL NOT NULL DEFAULT 0,
      wholesale_price REAL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      revenue_account_id INTEGER REFERENCES accounts(id),
      cogs_account_id INTEGER REFERENCES accounts(id),
      inventory_account_id INTEGER REFERENCES accounts(id),
      is_service INTEGER DEFAULT 0,
      image TEXT,
      min_stock REAL DEFAULT 0,
      max_stock REAL DEFAULT 0,
      reorder_point REAL DEFAULT 0,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      receivable_account_id INTEGER REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      payable_account_id INTEGER REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS warehouses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      location TEXT
    );
    CREATE TABLE IF NOT EXISTS warehouse_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      warehouse_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      UNIQUE(product_id, warehouse_id)
    );
    CREATE TABLE IF NOT EXISTS currencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      name_en TEXT,
      symbol TEXT NOT NULL DEFAULT 'ر.س',
      rate REAL NOT NULL DEFAULT 1,
      is_main INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      name_en TEXT,
      type TEXT NOT NULL CHECK(type IN ('asset','liability','equity','income','expense')),
      parent_id INTEGER,
      is_active INTEGER DEFAULT 1,
      description TEXT,
      FOREIGN KEY (parent_id) REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      icon TEXT DEFAULT 'credit-card',
      account_id INTEGER REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      date TEXT NOT NULL,
      warehouse_id INTEGER,
      payment_method_id INTEGER,
      currency_id INTEGER,
      currency_rate REAL DEFAULT 1,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
      FOREIGN KEY (currency_id) REFERENCES currencies(id)
    );
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      cost_price REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      FOREIGN KEY (sale_id) REFERENCES sales(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      date TEXT NOT NULL,
      warehouse_id INTEGER,
      payment_method_id INTEGER,
      currency_id INTEGER,
      currency_rate REAL DEFAULT 1,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
      FOREIGN KEY (currency_id) REFERENCES currencies(id)
    );
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      tax_rate REAL DEFAULT 0,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS sales_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_sale_id INTEGER,
      customer_id INTEGER,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      date TEXT NOT NULL,
      warehouse_id INTEGER,
      payment_method_id INTEGER,
      currency_id INTEGER,
      currency_rate REAL DEFAULT 1,
      FOREIGN KEY (original_sale_id) REFERENCES sales(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
      FOREIGN KEY (currency_id) REFERENCES currencies(id)
    );
    CREATE TABLE IF NOT EXISTS sales_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sales_return_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS purchase_returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_purchase_id INTEGER,
      supplier_id INTEGER,
      subtotal REAL NOT NULL DEFAULT 0,
      tax_rate REAL DEFAULT 0,
      tax_amount REAL DEFAULT 0,
      total REAL NOT NULL,
      date TEXT NOT NULL,
      warehouse_id INTEGER,
      payment_method_id INTEGER,
      currency_id INTEGER,
      currency_rate REAL DEFAULT 1,
      FOREIGN KEY (original_purchase_id) REFERENCES purchases(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
      FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
      FOREIGN KEY (currency_id) REFERENCES currencies(id)
    );
    CREATE TABLE IF NOT EXISTS purchase_return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_return_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      tax_rate REAL DEFAULT 0,
      FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      phone TEXT,
      email TEXT,
      salary REAL DEFAULT 0,
      role TEXT,
      address TEXT,
      national_id TEXT,
      salary_account_id INTEGER REFERENCES accounts(id),
      is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      description_en TEXT,
      reference TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS journal_entry_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journal_entry_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      debit REAL DEFAULT 0,
      credit REAL DEFAULT 0,
      description TEXT,
      FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      name_en TEXT,
      role TEXT NOT NULL DEFAULT 'cashier',
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK(type IN ('receipt','payment')),
      number TEXT NOT NULL,
      date TEXT NOT NULL,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      amount REAL NOT NULL,
      description TEXT,
      reference TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pos_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL DEFAULT 'admin',
      opened_at TEXT NOT NULL,
      closed_at TEXT,
      opening_balance REAL DEFAULT 0,
      expected_closing REAL,
      actual_closing REAL,
      difference REAL,
      total_sales REAL DEFAULT 0,
      total_tax REAL DEFAULT 0,
      total_cash REAL DEFAULT 0,
      total_card REAL DEFAULT 0,
      other_payments REAL DEFAULT 0,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'open'
    );
    CREATE TABLE IF NOT EXISTS pos_cash_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES pos_sessions(id),
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pos_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      warehouse_id INTEGER REFERENCES warehouses(id),
      payment_method_id INTEGER REFERENCES payment_methods(id),
      currency_id INTEGER REFERENCES currencies(id),
      customer_id INTEGER REFERENCES customers(id),
      show_categories INTEGER DEFAULT 1,
      show_search INTEGER DEFAULT 1,
      is_default INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS purchase_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id),
      payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id),
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      currency_id INTEGER REFERENCES currencies(id)
    );
    CREATE TABLE IF NOT EXISTS stock_transfers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      to_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_transfer_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transfer_id INTEGER NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sale_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id),
      payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id),
      amount REAL NOT NULL,
      currency_id INTEGER REFERENCES currencies(id)
    );
    CREATE TABLE IF NOT EXISTS stock_reconciliations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS stock_reconciliation_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reconciliation_id INTEGER NOT NULL REFERENCES stock_reconciliations(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      expected_qty REAL NOT NULL DEFAULT 0,
      actual_qty REAL NOT NULL DEFAULT 0,
      difference REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS landed_cost_vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER NOT NULL REFERENCES purchases(id),
      date TEXT NOT NULL,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS landed_cost_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER NOT NULL REFERENCES landed_cost_vouchers(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      account_id INTEGER REFERENCES accounts(id)
    );
    CREATE TABLE IF NOT EXISTS units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      abbreviation TEXT,
      abbreviation_en TEXT,
      category TEXT
    );
    CREATE TABLE IF NOT EXISTS product_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      unit_id INTEGER NOT NULL REFERENCES units(id),
      conversion_factor REAL NOT NULL DEFAULT 1,
      is_base INTEGER NOT NULL DEFAULT 0,
      price REAL DEFAULT 0,
      wholesale_price REAL DEFAULT 0,
      barcode TEXT
    );
  `);
  migrate();
  seedDefaults();
  saveDb();
  return db;
}

function migrate() {
  const cols = db.exec("PRAGMA table_info(products)");
  const colNames = cols.length > 0 ? cols[0].values.map((r) => r[1]) : [];
  if (!colNames.includes("name_en")) db.run("ALTER TABLE products ADD COLUMN name_en TEXT");
  if (!colNames.includes("barcode")) db.run("ALTER TABLE products ADD COLUMN barcode TEXT");
  if (!colNames.includes("category_id")) db.run("ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES categories(id)");
  if (!colNames.includes("wholesale_price")) db.run("ALTER TABLE products ADD COLUMN wholesale_price REAL DEFAULT 0");
  if (!colNames.includes("tax_rate")) db.run("ALTER TABLE products ADD COLUMN tax_rate REAL DEFAULT 0");

  const catCols = db.exec("PRAGMA table_info(categories)");
  const catColNames = catCols.length > 0 ? catCols[0].values.map((r) => r[1]) : [];
  if (!catColNames.includes("name_en")) db.run("ALTER TABLE categories ADD COLUMN name_en TEXT");
  if (!catColNames.includes("color")) db.run("ALTER TABLE categories ADD COLUMN color TEXT DEFAULT '#6366f1'");
  if (!catColNames.includes("revenue_account_id")) db.run("ALTER TABLE categories ADD COLUMN revenue_account_id INTEGER REFERENCES accounts(id)");
  if (!catColNames.includes("cogs_account_id")) db.run("ALTER TABLE categories ADD COLUMN cogs_account_id INTEGER REFERENCES accounts(id)");
  if (!catColNames.includes("inventory_account_id")) db.run("ALTER TABLE categories ADD COLUMN inventory_account_id INTEGER REFERENCES accounts(id)");

  const siCols = db.exec("PRAGMA table_info(sale_items)");
  const siColNames = siCols.length > 0 ? siCols[0].values.map((r) => r[1]) : [];
  if (!siColNames.includes("cost_price")) db.run("ALTER TABLE sale_items ADD COLUMN cost_price REAL DEFAULT 0");
  if (!siColNames.includes("tax_rate")) db.run("ALTER TABLE sale_items ADD COLUMN tax_rate REAL DEFAULT 0");

  const sCols = db.exec("PRAGMA table_info(sales)");
  const sColNames = sCols.length > 0 ? sCols[0].values.map((r) => r[1]) : [];
  if (!sColNames.includes("subtotal")) db.run("ALTER TABLE sales ADD COLUMN subtotal REAL DEFAULT 0");
  if (!sColNames.includes("tax_rate")) db.run("ALTER TABLE sales ADD COLUMN tax_rate REAL DEFAULT 0");
  if (!sColNames.includes("tax_amount")) db.run("ALTER TABLE sales ADD COLUMN tax_amount REAL DEFAULT 0");
  if (!sColNames.includes("warehouse_id")) db.run("ALTER TABLE sales ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id)");

  const pCols = db.exec("PRAGMA table_info(purchases)");
  const pColNames = pCols.length > 0 ? pCols[0].values.map((r) => r[1]) : [];
  if (!pColNames.includes("warehouse_id")) db.run("ALTER TABLE purchases ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id)");
  if (!pColNames.includes("subtotal")) db.run("ALTER TABLE purchases ADD COLUMN subtotal REAL DEFAULT 0");
  if (!pColNames.includes("tax_rate")) db.run("ALTER TABLE purchases ADD COLUMN tax_rate REAL DEFAULT 0");
  if (!pColNames.includes("tax_amount")) db.run("ALTER TABLE purchases ADD COLUMN tax_amount REAL DEFAULT 0");

  const piCols = db.exec("PRAGMA table_info(purchase_items)");
  const piColNames = piCols.length > 0 ? piCols[0].values.map((r) => r[1]) : [];
  if (!piColNames.includes("tax_rate")) db.run("ALTER TABLE purchase_items ADD COLUMN tax_rate REAL DEFAULT 0");

  // Accounts table (for existing DBs)
  db.run(`CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_en TEXT,
    type TEXT NOT NULL CHECK(type IN ('asset','liability','equity','income','expense')),
    parent_id INTEGER,
    is_active INTEGER DEFAULT 1,
    description TEXT,
    FOREIGN KEY (parent_id) REFERENCES accounts(id)
  )`);

  // Account ID on payment methods
  const pmCols2 = db.exec("PRAGMA table_info(payment_methods)");
  const pmColNames2 = pmCols2.length > 0 ? pmCols2[0].values.map((r) => r[1]) : [];
  if (!pmColNames2.includes("account_id")) db.run("ALTER TABLE payment_methods ADD COLUMN account_id INTEGER REFERENCES accounts(id)");

  // Account IDs on products
  const prodCols = db.exec("PRAGMA table_info(products)");
  const prodColNames = prodCols.length > 0 ? prodCols[0].values.map((r) => r[1]) : [];
  if (!prodColNames.includes("revenue_account_id")) db.run("ALTER TABLE products ADD COLUMN revenue_account_id INTEGER REFERENCES accounts(id)");
  if (!prodColNames.includes("cogs_account_id")) db.run("ALTER TABLE products ADD COLUMN cogs_account_id INTEGER REFERENCES accounts(id)");
  if (!prodColNames.includes("inventory_account_id")) db.run("ALTER TABLE products ADD COLUMN inventory_account_id INTEGER REFERENCES accounts(id)");

  // Account ID on customers
  const custCols = db.exec("PRAGMA table_info(customers)");
  const custColNames = custCols.length > 0 ? custCols[0].values.map((r) => r[1]) : [];
  if (!custColNames.includes("receivable_account_id")) db.run("ALTER TABLE customers ADD COLUMN receivable_account_id INTEGER REFERENCES accounts(id)");

  // Account ID on suppliers
  const suppCols = db.exec("PRAGMA table_info(suppliers)");
  const suppColNames = suppCols.length > 0 ? suppCols[0].values.map((r) => r[1]) : [];
  if (!suppColNames.includes("payable_account_id")) db.run("ALTER TABLE suppliers ADD COLUMN payable_account_id INTEGER REFERENCES accounts(id)");

  // Payment methods table (for existing DBs)
  db.run(`CREATE TABLE IF NOT EXISTS payment_methods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    icon TEXT DEFAULT 'credit-card'
  )`);

  // Payment methods + currency on sales
  const salesCols = db.exec("PRAGMA table_info(sales)");
  const salesColNames = salesCols.length > 0 ? salesCols[0].values.map((r) => r[1]) : [];
  if (!salesColNames.includes("payment_method_id")) db.run("ALTER TABLE sales ADD COLUMN payment_method_id INTEGER REFERENCES payment_methods(id)");
  if (!salesColNames.includes("currency_id")) db.run("ALTER TABLE sales ADD COLUMN currency_id INTEGER REFERENCES currencies(id)");
  if (!salesColNames.includes("currency_rate")) db.run("ALTER TABLE sales ADD COLUMN currency_rate REAL DEFAULT 1");

  // Payment methods + currency on purchases
  const purCols = db.exec("PRAGMA table_info(purchases)");
  const purColNames = purCols.length > 0 ? purCols[0].values.map((r) => r[1]) : [];
  if (!purColNames.includes("payment_method_id")) db.run("ALTER TABLE purchases ADD COLUMN payment_method_id INTEGER REFERENCES payment_methods(id)");
  if (!purColNames.includes("currency_id")) db.run("ALTER TABLE purchases ADD COLUMN currency_id INTEGER REFERENCES currencies(id)");
  if (!purColNames.includes("currency_rate")) db.run("ALTER TABLE purchases ADD COLUMN currency_rate REAL DEFAULT 1");

  // Journal entries tables (for existing DBs)
  db.run(`CREATE TABLE IF NOT EXISTS journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    description_en TEXT,
    reference TEXT,
    created_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS journal_entry_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_entry_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    description TEXT,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  )`);

  // Sales Returns & Purchase Returns tables (for existing DBs)
  db.run(`CREATE TABLE IF NOT EXISTS sales_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_sale_id INTEGER,
    customer_id INTEGER,
    subtotal REAL NOT NULL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total REAL NOT NULL,
    date TEXT NOT NULL,
    warehouse_id INTEGER,
    payment_method_id INTEGER,
    currency_id INTEGER,
    currency_rate REAL DEFAULT 1,
    FOREIGN KEY (original_sale_id) REFERENCES sales(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    FOREIGN KEY (currency_id) REFERENCES currencies(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS sales_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sales_return_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    cost_price REAL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    FOREIGN KEY (sales_return_id) REFERENCES sales_returns(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS purchase_returns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    original_purchase_id INTEGER,
    supplier_id INTEGER,
    subtotal REAL NOT NULL DEFAULT 0,
    tax_rate REAL DEFAULT 0,
    tax_amount REAL DEFAULT 0,
    total REAL NOT NULL,
    date TEXT NOT NULL,
    warehouse_id INTEGER,
    payment_method_id INTEGER,
    currency_id INTEGER,
    currency_rate REAL DEFAULT 1,
    FOREIGN KEY (original_purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    FOREIGN KEY (currency_id) REFERENCES currencies(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS purchase_return_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_return_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    tax_rate REAL DEFAULT 0,
    FOREIGN KEY (purchase_return_id) REFERENCES purchase_returns(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  )`);
  // Employees table (for existing DBs)
  db.run(`CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    phone TEXT,
    email TEXT,
    salary REAL DEFAULT 0,
    role TEXT,
    address TEXT,
    national_id TEXT,
    salary_account_id INTEGER REFERENCES accounts(id),
    is_active INTEGER DEFAULT 1
  )`);
  // POS session columns on sales
  const salesCols2 = db.exec("PRAGMA table_info(sales)");
  const salesColNames2 = salesCols2.length > 0 ? salesCols2[0].values.map((r) => r[1]) : [];
  if (!salesColNames2.includes("status")) db.run("ALTER TABLE sales ADD COLUMN status TEXT DEFAULT 'completed'");
  if (!salesColNames2.includes("discount_type")) db.run("ALTER TABLE sales ADD COLUMN discount_type TEXT");
  if (!salesColNames2.includes("discount_value")) db.run("ALTER TABLE sales ADD COLUMN discount_value REAL DEFAULT 0");
  if (!salesColNames2.includes("discount_amount")) db.run("ALTER TABLE sales ADD COLUMN discount_amount REAL DEFAULT 0");
  if (!salesColNames2.includes("hold_note")) db.run("ALTER TABLE sales ADD COLUMN hold_note TEXT");
  if (!salesColNames2.includes("session_id")) db.run("ALTER TABLE sales ADD COLUMN session_id INTEGER REFERENCES pos_sessions(id)");

  // Discount columns on sale_items
  const siCols2 = db.exec("PRAGMA table_info(sale_items)");
  const siColNames2 = siCols2.length > 0 ? siCols2[0].values.map((r) => r[1]) : [];
  if (!siColNames2.includes("discount_type")) db.run("ALTER TABLE sale_items ADD COLUMN discount_type TEXT");
  if (!siColNames2.includes("discount_value")) db.run("ALTER TABLE sale_items ADD COLUMN discount_value REAL DEFAULT 0");
  if (!siColNames2.includes("discount_amount")) db.run("ALTER TABLE sale_items ADD COLUMN discount_amount REAL DEFAULT 0");
  if (!siColNames2.includes("original_price")) db.run("ALTER TABLE sale_items ADD COLUMN original_price REAL");

  // Users table for existing DBs
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    name_en TEXT,
    role TEXT NOT NULL DEFAULT 'cashier',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  )`);
  // Seed default admin user if no users exist
  const userCount = get("SELECT COUNT(*) as cnt FROM users");
  if (userCount && userCount.cnt === 0) {
    const salt = randomBytes(16).toString("hex");
    const hash = createHash("sha256").update(salt + "admin").digest("hex");
    run("INSERT INTO users (username, password_hash, name, role, is_active, created_at) VALUES (?, ?, ?, 'admin', 1, ?)",
      ["admin", salt + ":" + hash, "Administrator", new Date().toISOString()]);
  }

  // POS session tables for existing DBs
  db.run(`CREATE TABLE IF NOT EXISTS pos_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL DEFAULT 'admin',
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    opening_balance REAL DEFAULT 0,
    expected_closing REAL,
    actual_closing REAL,
    difference REAL,
    total_sales REAL DEFAULT 0,
    total_tax REAL DEFAULT 0,
    total_cash REAL DEFAULT 0,
    total_card REAL DEFAULT 0,
    other_payments REAL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open'
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS pos_cash_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES pos_sessions(id),
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS pos_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    name_en TEXT,
    warehouse_id INTEGER REFERENCES warehouses(id),
    payment_method_id INTEGER REFERENCES payment_methods(id),
    currency_id INTEGER REFERENCES currencies(id),
    customer_id INTEGER REFERENCES customers(id),
    show_categories INTEGER DEFAULT 1,
    show_search INTEGER DEFAULT 1,
    is_default INTEGER DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS sale_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id),
    payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id),
    amount REAL NOT NULL,
    date TEXT,
    currency_id INTEGER REFERENCES currencies(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS purchase_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id),
    payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id),
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    currency_id INTEGER REFERENCES currencies(id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS stock_transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    to_warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS stock_transfer_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transfer_id INTEGER NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stock_reconciliations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS stock_reconciliation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reconciliation_id INTEGER NOT NULL REFERENCES stock_reconciliations(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    expected_qty REAL NOT NULL DEFAULT 0,
    actual_qty REAL NOT NULL DEFAULT 0,
    difference REAL NOT NULL DEFAULT 0
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS landed_cost_vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id INTEGER NOT NULL REFERENCES purchases(id),
    date TEXT NOT NULL,
    notes TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS landed_cost_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_id INTEGER NOT NULL REFERENCES landed_cost_vouchers(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    account_id INTEGER REFERENCES accounts(id)
  )`);

  // Add date column to sale_payments for existing DBs
  const spCols = db.exec("PRAGMA table_info(sale_payments)");
  const spColNames = spCols.length > 0 ? spCols[0].values.map((r) => r[1]) : [];
  if (!spColNames.includes("date")) db.run("ALTER TABLE sale_payments ADD COLUMN date TEXT");

  // salary_account_id migration for existing employees table
  const empCols = db.exec("PRAGMA table_info(employees)");
  const empColNames = empCols.length > 0 ? empCols[0].values.map((r) => r[1]) : [];
  if (!empColNames.includes("salary_account_id")) db.run("ALTER TABLE employees ADD COLUMN salary_account_id INTEGER REFERENCES accounts(id)");

  // Product new columns for existing DBs
  const pNewCols = db.exec("PRAGMA table_info(products)");
  const pNewColNames = pNewCols.length > 0 ? pNewCols[0].values.map((r) => r[1]) : [];
  if (!pNewColNames.includes("is_service")) db.run("ALTER TABLE products ADD COLUMN is_service INTEGER DEFAULT 0");
  if (!pNewColNames.includes("image")) db.run("ALTER TABLE products ADD COLUMN image TEXT");
  if (!pNewColNames.includes("min_stock")) db.run("ALTER TABLE products ADD COLUMN min_stock REAL DEFAULT 0");
  if (!pNewColNames.includes("max_stock")) db.run("ALTER TABLE products ADD COLUMN max_stock REAL DEFAULT 0");
  if (!pNewColNames.includes("reorder_point")) db.run("ALTER TABLE products ADD COLUMN reorder_point REAL DEFAULT 0");

  // Unit columns for transaction tables
  const unitColTables = [
    ["sale_items", "unit_id INTEGER"],
    ["sale_items", "unit_conversion_factor REAL DEFAULT 1"],
    ["purchase_items", "unit_id INTEGER"],
    ["purchase_items", "unit_conversion_factor REAL DEFAULT 1"],
    ["sales_return_items", "unit_id INTEGER"],
    ["sales_return_items", "unit_conversion_factor REAL DEFAULT 1"],
    ["purchase_return_items", "unit_id INTEGER"],
    ["purchase_return_items", "unit_conversion_factor REAL DEFAULT 1"],
    ["stock_transfer_items", "unit_id INTEGER"],
    ["stock_transfer_items", "unit_conversion_factor REAL DEFAULT 1"],
    ["stock_reconciliation_items", "unit_id INTEGER"],
    ["stock_reconciliation_items", "unit_conversion_factor REAL DEFAULT 1"],
  ];
  for (const [table, colDef] of unitColTables) {
    const cols = db.exec(`PRAGMA table_info(${table})`);
    const names = cols.length > 0 ? cols[0].values.map((r) => r[1]) : [];
    const colName = colDef.split(" ")[0];
    if (!names.includes(colName)) db.run(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
  }
}

function seedDefaults() {
  const existing = get("SELECT COUNT(*) as cnt FROM currencies");
  if (existing && existing.cnt === 0) {
    run("INSERT INTO currencies (code, name, name_en, symbol, rate, is_main) VALUES (?, ?, ?, ?, ?, ?)",
      ["SAR", "ريال سعودي", "Saudi Riyal", "ر.س", 1, 1]);
    run("INSERT INTO currencies (code, name, name_en, symbol, rate, is_main) VALUES (?, ?, ?, ?, ?, ?)",
      ["USD", "دولار أمريكي", "US Dollar", "$", 0.27, 0]);
    run("INSERT INTO currencies (code, name, name_en, symbol, rate, is_main) VALUES (?, ?, ?, ?, ?, ?)",
      ["EUR", "يورو", "Euro", "€", 0.25, 0]);
  }
  const wh = get("SELECT COUNT(*) as cnt FROM warehouses");
  if (wh && wh.cnt === 0) {
    run("INSERT INTO warehouses (name, name_en, location) VALUES (?, ?, ?)",
      ["المخزن الرئيسي", "Main Warehouse", "الموقع الافتراضي"]);
    const whId = lastInsertId();
    const products = all("SELECT id, quantity FROM products WHERE quantity > 0");
    for (const p of products) {
      run("INSERT INTO warehouse_stock (product_id, warehouse_id, quantity) VALUES (?, ?, ?)",
        [p.id, whId, p.quantity]);
    }
  }
  const taxSetting = get("SELECT value FROM settings WHERE key = ?", ["default_tax_rate"]);
  if (!taxSetting) {
    run("INSERT INTO settings (key, value) VALUES (?, ?)", ["default_tax_rate", "15"]);
  }
  const mainCurr = get("SELECT value FROM settings WHERE key = ?", ["main_currency"]);
  if (!mainCurr) {
    run("INSERT INTO settings (key, value) VALUES (?, ?)", ["main_currency", "SAR"]);
  }
  const negStock = get("SELECT value FROM settings WHERE key = ?", ["allow_negative_stock"]);
  if (!negStock) {
    run("INSERT INTO settings (key, value) VALUES (?, ?)", ["allow_negative_stock", "0"]);
  }

  // Seed default payment methods (must be before accounts linking)
  const pmCount = get("SELECT COUNT(*) as cnt FROM payment_methods");
  if (pmCount && pmCount.cnt === 0) {
    run("INSERT INTO payment_methods (name, name_en) VALUES (?, ?)", ["نقداً", "Cash"]);
    run("INSERT INTO payment_methods (name, name_en) VALUES (?, ?)", ["بطاقة ائتمان", "Credit Card"]);
    run("INSERT INTO payment_methods (name, name_en) VALUES (?, ?)", ["تحويل بنكي", "Bank Transfer"]);
    run("INSERT INTO payment_methods (name, name_en) VALUES (?, ?)", ["شيك", "Cheque"]);
    run("INSERT INTO payment_methods (name, name_en) VALUES (?, ?)", ["آجل", "Credit"]);
  }

  // Seed default chart of accounts
  const accCount = get("SELECT COUNT(*) as cnt FROM accounts");
  if (accCount && accCount.cnt === 0) {
    function ins(code, name, name_en, type, parentId) {
      run("INSERT INTO accounts (code, name, name_en, type, parent_id) VALUES (?, ?, ?, ?, ?)", [code, name, name_en, type, parentId || null]);
      return lastInsertId();
    }
    // === 1 - ASSETS ===
    const a1 = ins("1", "الأصول", "Assets", "asset");
    const a11 = ins("1-1", "أصول متداولة", "Current Assets", "asset", a1);
    const cashId = ins("1-1-1", "صندوق", "Cash on Hand", "asset", a11);
    const bankId = ins("1-1-2", "بنك", "Bank", "asset", a11);
    const receivablesId = ins("1-1-3", "حسابات مدينة", "Accounts Receivable", "asset", a11);
    const inventoryId = ins("1-1-4", "مخزون", "Inventory", "asset", a11);
    ins("1-1-5", "مصروفات مدفوعة مقدماً", "Prepaid Expenses", "asset", a11);
    const a12 = ins("1-2", "أصول ثابتة", "Fixed Assets", "asset", a1);
    ins("1-2-1", "معدات", "Equipment", "asset", a12);
    ins("1-2-2", "أثاث", "Furniture", "asset", a12);
    ins("1-2-3", "سيارات", "Vehicles", "asset", a12);
    ins("1-2-4", "عقارات", "Real Estate", "asset", a12);
    ins("1-2-5", "مجمع الإهلاك", "Accumulated Depreciation", "asset", a12);
    // === 2 - LIABILITIES ===
    const l2 = ins("2", "الخصوم", "Liabilities", "liability");
    const l21 = ins("2-1", "خصوم متداولة", "Current Liabilities", "liability", l2);
    const payablesId = ins("2-1-1", "حسابات دائنة", "Accounts Payable", "liability", l21);
    ins("2-1-2", "مصروفات مستحقة", "Accrued Expenses", "liability", l21);
    const taxPayableId = ins("2-1-3", "ضريبة مستحقة", "Tax Payable", "liability", l21);
    ins("2-1-4", "إيرادات مبيعات مؤجلة", "Deferred Revenue", "liability", l21);
    const l22 = ins("2-2", "خصوم طويلة الأجل", "Long-term Liabilities", "liability", l2);
    ins("2-2-1", "قروض بنكية", "Bank Loans", "liability", l22);
    // === 3 - EQUITY ===
    const e3 = ins("3", "حقوق الملكية", "Equity", "equity");
    ins("3-1", "رأس المال", "Capital", "equity", e3);
    ins("3-2", "أرباح مبقاة", "Retained Earnings", "equity", e3);
    ins("3-3", "أرباح السنة الحالية", "Current Year Profit", "equity", e3);
    // === 4 - INCOME ===
    const i4 = ins("4", "الإيرادات", "Income", "income");
    const revenueId = ins("4-1", "إيرادات المبيعات", "Sales Revenue", "income", i4);
    ins("4-2", "إيرادات أخرى", "Other Income", "income", i4);
    ins("4-3", "خصم مكتسب", "Discount Received", "income", i4);
    // === 5 - EXPENSES ===
    const x5 = ins("5", "المصروفات", "Expenses", "expense");
    const cogsId = ins("5-1", "تكلفة المبيعات", "Cost of Goods Sold", "expense", x5);
    const x52 = ins("5-2", "مصروفات تشغيلية", "Operating Expenses", "expense", x5);
    ins("5-2-1", "إيجار", "Rent", "expense", x52);
    ins("5-2-2", "رواتب", "Salaries", "expense", x52);
    ins("5-2-3", "كهرباء", "Electricity", "expense", x52);
    ins("5-2-4", "مياه", "Water", "expense", x52);
    ins("5-2-5", "هاتف", "Telephone", "expense", x52);
    ins("5-2-6", "إنترنت", "Internet", "expense", x52);
    ins("5-2-7", "صيانة", "Maintenance", "expense", x52);
    ins("5-2-8", "نقل", "Transportation", "expense", x52);
    ins("5-2-9", "دعاية وإعلان", "Advertising", "expense", x52);
    ins("5-2-10", "قرطاسية", "Stationery", "expense", x52);
    ins("5-2-11", "إهلاك", "Depreciation", "expense", x52);
    const x53 = ins("5-3", "مصروفات مالية", "Financial Expenses", "expense", x5);
    ins("5-3-1", "رسوم بنكية", "Bank Charges", "expense", x53);
    ins("5-3-2", "فوائد", "Interest", "expense", x53);

    // Link default accounts to payment methods
    run("UPDATE payment_methods SET account_id = ? WHERE name_en = ?", [cashId, "Cash"]);
    run("UPDATE payment_methods SET account_id = ? WHERE name_en = ?", [bankId, "Bank Transfer"]);
    run("UPDATE payment_methods SET account_id = ? WHERE name_en = ?", [bankId, "Credit Card"]);
    run("UPDATE payment_methods SET account_id = ? WHERE name_en = ?", [bankId, "Cheque"]);
    run("UPDATE payment_methods SET account_id = ? WHERE name_en = ?", [receivablesId, "Credit"]);

    // Set default accounts in settings
    run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["default_revenue_account", String(revenueId)]);
    run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["default_cogs_account", String(cogsId)]);
    run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["default_inventory_account", String(inventoryId)]);
    run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["default_receivable_account", String(receivablesId)]);
    run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["default_payable_account", String(payablesId)]);
    run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ["default_tax_payable_account", String(taxPayableId)]);
  } else if (accCount && accCount.cnt > 0 && accCount.cnt < 37) {
    // Migration: add missing accounts for existing DBs
    const extCodes = all("SELECT code FROM accounts").map(r => r.code);
    const exist = new Set(extCodes);
    // Handle tax payable code change: old 2-1-2 → new 2-1-3
    if (exist.has("2-1-2")) {
      const oldTax = get("SELECT id, name, name_en FROM accounts WHERE code = ?", ["2-1-2"]);
      if (oldTax && (oldTax.name_en === "Tax Payable" || oldTax.name_en === "ضريبة مستحقة")) {
        // Move tax payable from 2-1-2 to 2-1-3
        run("UPDATE accounts SET code = '2-1-3', name = 'ضريبة مستحقة', name_en = 'Tax Payable' WHERE id = ?", [oldTax.id]);
        exist.delete("2-1-2");
        exist.add("2-1-3");
      }
    }
    const parentOf = {};
    const needed = [
      ["1-1-5", "مصروفات مدفوعة مقدماً", "Prepaid Expenses", "asset", "1-1"],
      ["1-2", "أصول ثابتة", "Fixed Assets", "asset", "1"],
      ["1-2-1", "معدات", "Equipment", "asset", "1-2"],
      ["1-2-2", "أثاث", "Furniture", "asset", "1-2"],
      ["1-2-3", "سيارات", "Vehicles", "asset", "1-2"],
      ["1-2-4", "عقارات", "Real Estate", "asset", "1-2"],
      ["1-2-5", "مجمع الإهلاك", "Accumulated Depreciation", "asset", "1-2"],
      ["2-1-2", "مصروفات مستحقة", "Accrued Expenses", "liability", "2-1"],
      ["2-1-4", "إيرادات مبيعات مؤجلة", "Deferred Revenue", "liability", "2-1"],
      ["2-2", "خصوم طويلة الأجل", "Long-term Liabilities", "liability", "2"],
      ["2-2-1", "قروض بنكية", "Bank Loans", "liability", "2-2"],
      ["3-3", "أرباح السنة الحالية", "Current Year Profit", "equity", "3"],
      ["4-2", "إيرادات أخرى", "Other Income", "income", "4"],
      ["4-3", "خصم مكتسب", "Discount Received", "income", "4"],
      ["5-2", "مصروفات تشغيلية", "Operating Expenses", "expense", "5"],
      ["5-2-1", "إيجار", "Rent", "expense", "5-2"],
      ["5-2-2", "رواتب", "Salaries", "expense", "5-2"],
      ["5-2-3", "كهرباء", "Electricity", "expense", "5-2"],
      ["5-2-4", "مياه", "Water", "expense", "5-2"],
      ["5-2-5", "هاتف", "Telephone", "expense", "5-2"],
      ["5-2-6", "إنترنت", "Internet", "expense", "5-2"],
      ["5-2-7", "صيانة", "Maintenance", "expense", "5-2"],
      ["5-2-8", "نقل", "Transportation", "expense", "5-2"],
      ["5-2-9", "دعاية وإعلان", "Advertising", "expense", "5-2"],
      ["5-2-10", "قرطاسية", "Stationery", "expense", "5-2"],
      ["5-2-11", "إهلاك", "Depreciation", "expense", "5-2"],
      ["5-3", "مصروفات مالية", "Financial Expenses", "expense", "5"],
      ["5-3-1", "رسوم بنكية", "Bank Charges", "expense", "5-3"],
      ["5-3-2", "فوائد", "Interest", "expense", "5-3"],
    ];
    for (const c of extCodes) {
      const row = get("SELECT id FROM accounts WHERE code = ?", [c]);
      if (row) parentOf[c] = row.id;
    }
    for (const [code, name, name_en, type, parentCode] of needed) {
      if (exist.has(code)) continue;
      const parentId = parentOf[parentCode] || null;
      run("INSERT INTO accounts (code, name, name_en, type, parent_id) VALUES (?, ?, ?, ?, ?)",
        [code, name, name_en, type, parentId]);
      parentOf[code] = lastInsertId();
    }
    // Set default account settings if missing
    for (const key of ["default_revenue_account","default_cogs_account","default_inventory_account","default_receivable_account","default_payable_account","default_tax_payable_account"]) {
      if (!get("SELECT value FROM settings WHERE key = ?", [key])) {
        const code = {
          default_revenue_account: "4-1",
          default_cogs_account: "5-1",
          default_inventory_account: "1-1-4",
          default_receivable_account: "1-1-3",
          default_payable_account: "2-1-1",
          default_tax_payable_account: "2-1-3",
        }[key];
        const acc = get("SELECT id FROM accounts WHERE code = ?", [code]);
        if (acc) run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, String(acc.id)]);
      }
    }
  }

  // Seed default units
  const unitCount = get("SELECT COUNT(*) as cnt FROM units");
  if (unitCount && unitCount.cnt === 0) {
    const defaultUnits = [
      ["قطعة", "Piece", "قطعة", "Pcs", "count"],
      ["كرتون", "Box", "كرتون", "Box", "count"],
      ["كرتونة", "Carton", "كرتونة", "Ctn", "count"],
      ["كيلو", "Kg", "كجم", "Kg", "weight"],
      ["جرام", "Gram", "جم", "g", "weight"],
      ["لتر", "Liter", "لتر", "L", "volume"],
      ["ملي", "Milliliter", "مل", "mL", "volume"],
      ["متر", "Meter", "م", "m", "length"],
      ["طن", "Ton", "طن", "T", "weight"],
    ];
    for (const [name, nameEn, abbr, abbrEn, cat] of defaultUnits) {
      run("INSERT INTO units (name, name_en, abbreviation, abbreviation_en, category) VALUES (?, ?, ?, ?, ?)",
        [name, nameEn, abbr, abbrEn, cat]);
    }
  }

  // Seed default POS profile
  const profileCount = get("SELECT COUNT(*) as cnt FROM pos_profiles");
  if (profileCount && profileCount.cnt === 0) {
    const wh = get("SELECT id FROM warehouses ORDER BY id LIMIT 1");
    const pm = get("SELECT id FROM payment_methods ORDER BY id LIMIT 1");
    const curr = get("SELECT id FROM currencies WHERE is_main = 1");
    run("INSERT INTO pos_profiles (name, name_en, warehouse_id, payment_method_id, currency_id, show_categories, show_search, is_default) VALUES (?, ?, ?, ?, ?, 1, 1, 1)",
      ["الملف الافتراضي", "Default Profile", wh ? wh.id : null, pm ? pm.id : null, curr ? curr.id : null]);
  }

  // Migrate existing products without product_units: add default "Piece" unit
  const pieceUnit = get("SELECT id FROM units WHERE name_en = ?", ["Piece"]);
  if (pieceUnit) {
    const productsWithoutUnits = all(`
      SELECT p.id, p.price, p.wholesale_price, p.barcode FROM products p
      WHERE NOT EXISTS (SELECT 1 FROM product_units WHERE product_id = p.id)
    `);
    for (const p of productsWithoutUnits) {
      run("INSERT INTO product_units (product_id, unit_id, conversion_factor, is_base, price, wholesale_price, barcode) VALUES (?, ?, 1, 1, ?, ?, ?)",
        [p.id, pieceUnit.id, p.price || 0, p.wholesale_price || 0, p.barcode || null]);
    }
  }
}

export function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

export function all(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function get(sql, params = []) {
  const rows = all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

let _lastId = null;
let _inTransaction = false;

export function run(sql, params = []) {
  db.run(sql, params);
  const r = db.exec("SELECT last_insert_rowid() as id");
  _lastId = (r.length > 0 && r[0].values.length > 0) ? r[0].values[0][0] : null;
  if (!_inTransaction) saveDb();
}

export function transaction(fn) {
  _inTransaction = true;
  db.run("BEGIN");
  try {
    const result = fn();
    db.run("COMMIT");
    _inTransaction = false;
    const r = db.exec("SELECT last_insert_rowid() as id");
    _lastId = (r.length > 0 && r[0].values.length > 0) ? r[0].values[0][0] : null;
    saveDb();
    return result;
  } catch (e) {
    _inTransaction = false;
    try { db.run("ROLLBACK"); } catch (e2) { /* ignore rollback failure */ }
    saveDb();
    throw e;
  }
}

export function lastInsertId() {
  return _lastId;
}
