const BASE = "/api";

function toQuery(params) {
  if (!params) return "";
  const q = Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return q ? "?" + q : "";
}

let authToken = localStorage.getItem("auth_token");

function setToken(token) {
  authToken = token;
  if (token) localStorage.setItem("auth_token", token);
  else localStorage.removeItem("auth_token");
}

async function request(url, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
  const res = await fetch(`${BASE}${url}`, { headers, ...options });
  if (res.status === 401) {
    setToken(null);
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  return res.json();
}

export const api = {
  get: (url) => request(url),
  getRaw: (url) => {
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    return fetch(`${BASE}${url}`, { headers });
  },

  login: async (username, password) => {
    const res = await fetch(`${BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error("Invalid credentials");
    const data = await res.json();
    setToken(data.token);
    return data;
  },
  logout: () => { setToken(null); },
  getMe: () => request("/me"),

  getUsers: () => request("/users"),
  addUser: (data) => request("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),
  post: (url, data) => request(url, { method: "POST", body: JSON.stringify(data) }),
  put: (url, data) => request(url, { method: "PUT", body: JSON.stringify(data) }),
  delete: (url) => request(url, { method: "DELETE" }),

  getStats: (params) => request("/stats" + toQuery(params)),
  getDailySales: (params) => request("/stats/daily-sales" + toQuery(params)),
  getDailyProfit: (params) => request("/stats/daily-profit" + toQuery(params)),
  getSettings: () => request("/settings"),
  updateSettings: (data) => request("/settings", { method: "PUT", body: JSON.stringify(data) }),

  getCurrencies: () => request("/currencies"),
  addCurrency: (data) => request("/currencies", { method: "POST", body: JSON.stringify(data) }),
  updateCurrency: (id, data) => request(`/currencies/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCurrency: (id) => request(`/currencies/${id}`, { method: "DELETE" }),

  getWarehouses: () => request("/warehouses"),
  addWarehouse: (data) => request("/warehouses", { method: "POST", body: JSON.stringify(data) }),
  updateWarehouse: (id, data) => request(`/warehouses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteWarehouse: (id) => request(`/warehouses/${id}`, { method: "DELETE" }),
  transferStock: (data) => request("/warehouses/transfer", { method: "POST", body: JSON.stringify(data) }),
  getWarehouseStock: (id) => request(`/warehouses/${id}/stock`),
  getProductStock: (id) => request(`/products/${id}/stock`),
  getStockTransfers: () => request("/stock-transfers"),
  getStockTransfer: (id) => request(`/stock-transfers/${id}`),
  createStockTransfer: (data) => request("/stock-transfers", { method: "POST", body: JSON.stringify(data) }),

  getCategories: () => request("/categories"),
  addCategory: (data) => request("/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE" }),

  getProducts: () => request("/products"),
  getProductByBarcode: (barcode) => request(`/products/barcode/${barcode}`),
  addProduct: (data) => request("/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),

  getEmployees: () => request("/employees"),
  addEmployee: (data) => request("/employees", { method: "POST", body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/employees/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteEmployee: (id) => request(`/employees/${id}`, { method: "DELETE" }),

  getCustomers: () => request("/customers"),
  addCustomer: (data) => request("/customers", { method: "POST", body: JSON.stringify(data) }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: "DELETE" }),

  getSuppliers: () => request("/suppliers"),
  addSupplier: (data) => request("/suppliers", { method: "POST", body: JSON.stringify(data) }),
  updateSupplier: (id, data) => request(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: "DELETE" }),

  getSales: (params) => request("/sales" + toQuery(params)),
  addSale: (data) => request("/sales", { method: "POST", body: JSON.stringify(data) }),
  updateSale: (id, data) => request(`/sales/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  getSale: (id) => request(`/sales/${id}`),

  getPurchases: () => request("/purchases"),
  addPurchase: (data) => request("/purchases", { method: "POST", body: JSON.stringify(data) }),
  getPurchase: (id) => request(`/purchases/${id}`),

  getInventoryReport: () => request("/reports/inventory"),

  getPaymentMethods: () => request("/payment-methods"),
  addPaymentMethod: (data) => request("/payment-methods", { method: "POST", body: JSON.stringify(data) }),
  updatePaymentMethod: (id, data) => request(`/payment-methods/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePaymentMethod: (id) => request(`/payment-methods/${id}`, { method: "DELETE" }),

  getAccounts: (leafOnly) => request(leafOnly ? "/accounts?leaf_only=1" : "/accounts"),
  addAccount: (data) => request("/accounts", { method: "POST", body: JSON.stringify(data) }),
  updateAccount: (id, data) => request(`/accounts/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteAccount: (id) => request(`/accounts/${id}`, { method: "DELETE" }),

  getSalesReturns: () => request("/sales-returns"),
  addSalesReturn: (data) => request("/sales-returns", { method: "POST", body: JSON.stringify(data) }),
  getSalesReturn: (id) => request(`/sales-returns/${id}`),

  getPurchaseReturns: () => request("/purchase-returns"),
  addPurchaseReturn: (data) => request("/purchase-returns", { method: "POST", body: JSON.stringify(data) }),
  getPurchaseReturn: (id) => request(`/purchase-returns/${id}`),

  getCustomerStatement: (id, params) => request(`/statements/customers/${id}${params ? `?${new URLSearchParams(params)}` : ""}`),
  getSupplierStatement: (id, params) => request(`/statements/suppliers/${id}${params ? `?${new URLSearchParams(params)}` : ""}`),
  getAccountStatement: (id, params) => request(`/statements/accounts/${id}${params ? `?${new URLSearchParams(params)}` : ""}`),
  getEmployeeStatement: (id, params) => request(`/statements/employees/${id}${params ? `?${new URLSearchParams(params)}` : ""}`),

  getJournalEntries: () => request("/journal-entries"),
  getJournalEntry: (id) => request(`/journal-entries/${id}`),
  addJournalEntry: (data) => request("/journal-entries", { method: "POST", body: JSON.stringify(data) }),
  deleteJournalEntry: (id) => request(`/journal-entries/${id}`, { method: "DELETE" }),

  // POS Sessions
  getActiveSession: () => request("/pos/sessions/active"),
  openSession: (data) => request("/pos/sessions", { method: "POST", body: JSON.stringify(data) }),
  closeSession: (id, data) => request(`/pos/sessions/${id}/close`, { method: "POST", body: JSON.stringify(data) }),
  getSession: (id) => request(`/pos/sessions/${id}`),
  getSessions: () => request("/pos/sessions"),
  addCashLog: (data) => request("/pos/cash-log", { method: "POST", body: JSON.stringify(data) }),
  addSalePayment: (id, data) => request(`/sales/${id}/payments`, { method: "POST", body: JSON.stringify(data) }),
  addPurchasePayment: (id, data) => request(`/purchases/${id}/payments`, { method: "POST", body: JSON.stringify(data) }),

  getHeldInvoices: () => request("/pos/holds"),
  holdSale: (id, note) => request(`/sales/${id}/hold`, { method: "PUT", body: JSON.stringify({ note }) }),
  resumeSale: (id) => request(`/sales/${id}/resume`, { method: "PUT" }),

  // Stock Reconciliation
  getStockReconciliations: () => request("/stock-reconciliations"),
  getStockReconciliation: (id) => request(`/stock-reconciliations/${id}`),
  createStockReconciliation: (data) => request("/stock-reconciliations", { method: "POST", body: JSON.stringify(data) }),
  deleteStockReconciliation: (id) => request(`/stock-reconciliations/${id}`, { method: "DELETE" }),

  // Stock Ledger Report
  getStockLedger: (params) => request(`/reports/stock-ledger${params ? `?${new URLSearchParams(params)}` : ""}`),

  // Units of Measure
  getUnits: () => request("/units"),
  getUnit: (id) => request(`/units/${id}`),
  addUnit: (data) => request("/units", { method: "POST", body: JSON.stringify(data) }),
  updateUnit: (id, data) => request(`/units/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteUnit: (id) => request(`/units/${id}`, { method: "DELETE" }),
  getProductUnits: (id) => request(`/products/${id}/units`),

  // Vouchers
  getVouchers: (params) => request(`/vouchers${params ? `?${new URLSearchParams(params)}` : ""}`),
  getVoucherNextNumber: (type) => request(`/vouchers/next-number/${type}`),
  createVoucher: (data) => request("/vouchers", { method: "POST", body: JSON.stringify(data) }),
  updateVoucher: (id, data) => request(`/vouchers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteVoucher: (id) => request(`/vouchers/${id}`, { method: "DELETE" }),

  // Financial Reports
  getTrialBalance: (params) => request(`/reports/trial-balance${params ? `?${new URLSearchParams(params)}` : ""}`),
  getBalanceSheet: (params) => request(`/reports/balance-sheet${params ? `?${new URLSearchParams(params)}` : ""}`),
  getIncomeStatement: (params) => request(`/reports/income-statement${params ? `?${new URLSearchParams(params)}` : ""}`),

  // Landed Cost Vouchers
  getLandedCosts: (params) => request(`/landed-costs${params ? `?${new URLSearchParams(params)}` : ""}`),
  getLandedCost: (id) => request(`/landed-costs/${id}`),
  createLandedCost: (data) => request("/landed-costs", { method: "POST", body: JSON.stringify(data) }),
  deleteLandedCost: (id) => request(`/landed-costs/${id}`, { method: "DELETE" }),

  // POS Profiles
  getPosProfiles: () => request("/pos-profiles"),
  getDefaultPosProfile: () => request("/pos-profiles/default"),
  addPosProfile: (data) => request("/pos-profiles", { method: "POST", body: JSON.stringify(data) }),
  updatePosProfile: (id, data) => request(`/pos-profiles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePosProfile: (id) => request(`/pos-profiles/${id}`, { method: "DELETE" }),

  // Bulk delete
  bulkDelete: (resource, ids) => request(`/${resource}/bulk-delete`, { method: "POST", body: JSON.stringify({ ids }) }),
};
