import { NavLink, useNavigate } from "react-router-dom";
import { useI18n } from "@/i18n/index.jsx";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Package, FolderTree, Users, Truck, Ruler,
  ShoppingCart, ClipboardList, BarChart3, LogOut, ShoppingBag, Globe,
  Warehouse, Settings, BookOpen, NotebookText, Undo2, Wallet, Receipt,
  ChevronRight, ChevronDown, ChevronLeft, Shield, Handshake, UserCheck, TrendingUp, ArrowRightLeft, ClipboardCheck, Ship,
} from "lucide-react";
import { useState } from "react";

const navSections = [
  {
    labelAr: "الرئيسية", labelEn: "Main", icon: LayoutDashboard,
    items: [
      { to: "/", labelAr: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    labelAr: "نقطة البيع", labelEn: "POS", icon: ShoppingBag,
    items: [
      { to: "/pos", labelAr: "نقطة البيع", labelEn: "POS", icon: ShoppingBag },
      { to: "/pos/sessions", labelAr: "جلسات البيع", labelEn: "POS Sessions", icon: Wallet },
    ],
  },
  {
    labelAr: "المخزون", labelEn: "Inventory", icon: Package,
    items: [
      { to: "/products", labelAr: "المنتجات", labelEn: "Products", icon: Package },
      { to: "/categories", labelAr: "التصنيفات", labelEn: "Categories", icon: FolderTree },
      { to: "/units", labelAr: "وحدات القياس", labelEn: "Units", icon: Ruler },
      { to: "/warehouses", labelAr: "المخازن", labelEn: "Warehouses", icon: Warehouse },
      { to: "/stock-transfers", labelAr: "التحويل المخزني", labelEn: "Stock Transfers", icon: ArrowRightLeft },
      { to: "/stock-reconciliation", labelAr: "جرد المخزون", labelEn: "Stock Reconciliation", icon: ClipboardCheck },
    ],
  },
  {
    labelAr: "الأطراف", labelEn: "Parties", icon: Handshake,
    items: [
      { to: "/customers", labelAr: "العملاء", labelEn: "Customers", icon: Users },
      { to: "/suppliers", labelAr: "الموردين", labelEn: "Suppliers", icon: Truck },
      { to: "/employees", labelAr: "الموظفين", labelEn: "Employees", icon: Users },
    ],
  },
  {
    labelAr: "المعاملات", labelEn: "Transactions", icon: ShoppingCart,
    items: [
      { to: "/sales", labelAr: "المبيعات", labelEn: "Sales", icon: ShoppingCart },
      { to: "/sales-returns", labelAr: "مرتجعات المبيعات", labelEn: "Sales Returns", icon: Undo2 },
      { to: "/purchases", labelAr: "المشتريات", labelEn: "Purchases", icon: ClipboardList },
      { to: "/purchase-returns", labelAr: "مرتجعات المشتريات", labelEn: "Purchase Returns", icon: Undo2 },
      { to: "/landed-costs", labelAr: "تكاليف إضافية", labelEn: "Landed Cost", icon: Ship },
    ],
  },
  {
    labelAr: "المحاسبة", labelEn: "Accounting", icon: BookOpen,
    items: [
      { to: "/accounts", labelAr: "شجرة الحسابات", labelEn: "Chart of Accounts", icon: BookOpen },
      { to: "/journal-entries", labelAr: "قيود اليومية", labelEn: "Journal Entries", icon: NotebookText },
      { to: "/vouchers", labelAr: "سندات القبض والصرف", labelEn: "Vouchers", icon: Receipt },
    ],
  },
{
  labelAr: "التقارير", labelEn: "Reports", icon: BarChart3,
  items: [
    { to: "/reports/inventory", labelAr: "تقرير المخزون", labelEn: "Inventory Report", icon: Package },
    { to: "/reports/stock-ledger", labelAr: "كشف حركة المخزون", labelEn: "Stock Ledger", icon: ClipboardCheck },
    { to: "/reports/profit", labelAr: "تقرير الأرباح", labelEn: "Profit Report", icon: TrendingUp },
    { to: "/reports/tax", labelAr: "الإقرار الضريبي", labelEn: "Tax Report", icon: Receipt },
    { to: "/statements", labelAr: "كشوفات الحساب", labelEn: "Statements", icon: NotebookText },
    { to: "/reports/trial-balance", labelAr: "ميزان المراجعة", labelEn: "Trial Balance", icon: BookOpen },
    { to: "/reports/balance-sheet", labelAr: "قائمة المركز المالي", labelEn: "Balance Sheet", icon: BarChart3 },
    { to: "/reports/income-statement", labelAr: "قائمة الدخل", labelEn: "Income Statement", icon: TrendingUp },
    { to: "/reports/cash-flow", labelAr: "قائمة التدفقات النقدية", labelEn: "Cash Flow Statement", icon: Wallet },
  ],
},
  {
    labelAr: "النظام", labelEn: "System", icon: Shield,
    items: [
      { to: "/users", labelAr: "المستخدمين", labelEn: "Users", icon: Shield },
    ],
  },
];

export default function Layout({ children }) {
  const { t, locale, changeLocale } = useI18n();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [sections, setSections] = useState(() => []);
  const toggleSection = (i) => setSections((prev) => prev.includes(i) ? prev.filter((j) => j !== i) : [...prev, i]);

  return (
    <div className="app-layout">
      <aside className="app-sidebar" style={{ width: collapsed ? 60 : undefined }}>
        <div className={cn("flex items-center h-14 px-4 border-b border-sidebar-border", collapsed && "justify-center px-0")}>
          <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {collapsed ? "S" : "S"}
            </div>
            {!collapsed && <span className="font-bold text-sm tracking-tight">SalesApp</span>}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn("p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors", collapsed ? "mt-3" : "mr-auto")}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className={cn("flex-1 overflow-y-auto scrollbar-thin py-3", collapsed && "px-0")}>
          {navSections.map((section, i) => {
            const open = sections.includes(i);
            return (
            <div key={section.labelAr}>
              {collapsed ? (
                <button onClick={() => toggleSection(i)} className="nav-item justify-center mx-1 px-0" title={locale === "ar" ? section.labelAr : section.labelEn}>
                  <section.icon className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={() => toggleSection(i)} className="nav-section flex items-center" style={{ gap: "15px" }}>
                  <section.icon className="h-4 w-4" />
                  <span className="flex-1 text-start">{locale === "ar" ? section.labelAr : section.labelEn}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
                </button>
              )}
              {open && section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) => cn("nav-item", collapsed && "justify-center mx-1 px-0", isActive && "active")}
                  title={!collapsed ? undefined : (locale === "ar" ? item.labelAr : item.labelEn)}
                >
                  <item.icon />
                  {!collapsed && (locale === "ar" ? item.labelAr : item.labelEn)}
                </NavLink>
              ))}
            </div>
            );
          })}
        </nav>

        <div className={cn("border-t border-sidebar-border p-2 space-y-1", collapsed && "flex flex-col items-center")}>
          {user && !collapsed && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
              {user.name} <span className="opacity-60">({user.role})</span>
            </div>
          )}
          <button
            onClick={() => changeLocale(locale === "ar" ? "en" : "ar")}
            className={cn("nav-item w-full", collapsed && "justify-center")}
            title={collapsed ? "English/العربية" : undefined}
          >
            <Globe className="h-4 w-4" />
            {!collapsed && (locale === "ar" ? "English" : "العربية")}
          </button>
          <NavLink
            to="/settings"
            className={({ isActive }) => cn("nav-item", collapsed && "justify-center", isActive && "active")}
            title={!collapsed ? undefined : t("settings.title")}
          >
            <Settings className="h-4 w-4" />
            {!collapsed && t("settings.title")}
          </NavLink>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className={cn("nav-item w-full", collapsed && "justify-center")}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Logout"}
          </button>
        </div>
      </aside>

      <div className="app-main">
        <main className="app-content scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}