import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Categories from "@/pages/Categories";
import Customers from "@/pages/Customers";
import Suppliers from "@/pages/Suppliers";
import Employees from "@/pages/Employees";
import Sales from "@/pages/Sales";
import Purchases from "@/pages/Purchases";
import SalesReturns from "@/pages/SalesReturns";
import PurchaseReturns from "@/pages/PurchaseReturns";
import Pos from "@/pages/Pos";
import POSSessions from "@/pages/POSSessions";
import POSSessionDetail from "@/pages/POSSessionDetail";
import InventoryReport from "@/pages/InventoryReport";
import ProfitReport from "@/pages/ProfitReport";
import TaxReport from "@/pages/TaxReport";
import Statements from "@/pages/Statements";
import Warehouses from "@/pages/Warehouses";
import Settings from "@/pages/Settings";
import Accounts from "@/pages/Accounts";
import JournalEntries from "@/pages/JournalEntries";
import Users from "@/pages/Users";
import Vouchers from "@/pages/Vouchers";
import StockTransfer from "@/pages/StockTransfer";
import StockReconciliation from "@/pages/StockReconciliation";
import StockLedgerReport from "@/pages/StockLedgerReport";
import LandedCosts from "@/pages/LandedCosts";
import Units from "@/pages/Units";
import TrialBalance from "@/pages/TrialBalance";
import BalanceSheet from "@/pages/BalanceSheet";
import IncomeStatement from "@/pages/IncomeStatement";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/pos" element={<ProtectedRoute><Pos /></ProtectedRoute>} />
      <Route path="/pos/sessions" element={<ProtectedRoute><Layout><POSSessions /></Layout></ProtectedRoute>} />
      <Route path="/pos/sessions/:id" element={<ProtectedRoute><Layout><POSSessionDetail /></Layout></ProtectedRoute>} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/products" element={<Products />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/units" element={<Units />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/sales-returns" element={<SalesReturns />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/purchase-returns" element={<PurchaseReturns />} />
              <Route path="/warehouses" element={<Warehouses />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/accounts" element={<Accounts />} />
              <Route path="/journal-entries" element={<JournalEntries />} />
              <Route path="/reports/inventory" element={<InventoryReport />} />
<Route path="/reports/profit" element={<ProfitReport />} />
<Route path="/reports/tax" element={<TaxReport />} />
              <Route path="/statements" element={<Statements />} />
              <Route path="/users" element={<Users />} />
              <Route path="/vouchers" element={<Vouchers />} />
              <Route path="/stock-transfers" element={<StockTransfer />} />
              <Route path="/stock-reconciliation" element={<StockReconciliation />} />
              <Route path="/reports/stock-ledger" element={<StockLedgerReport />} />
              <Route path="/landed-costs" element={<LandedCosts />} />
              <Route path="/reports/trial-balance" element={<TrialBalance />} />
              <Route path="/reports/balance-sheet" element={<BalanceSheet />} />
              <Route path="/reports/income-statement" element={<IncomeStatement />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <Toaster />
    </AuthProvider>
  );
}
