import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fn, fn0 } from "@/lib/format";
import { TrendingUp, DollarSign, ShoppingCart, Wallet, Building, Clock, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function getPeriodDates(period) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const today = `${yyyy}-${mm}-${dd}`;
  if (period === "today") return { from: today, to: today };
  if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    const ym = String(monday.getMonth() + 1).padStart(2, "0");
    const yd = String(monday.getDate()).padStart(2, "0");
    return { from: `${monday.getFullYear()}-${ym}-${yd}`, to: today };
  }
  if (period === "month") {
    return { from: `${yyyy}-${mm}-01`, to: today };
  }
  return {};
}

const periods = ["today", "week", "month", "all"];

export default function Dashboard() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [dailySales, setDailySales] = useState([]);
  const [dailyProfit, setDailyProfit] = useState([]);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    const dates = getPeriodDates(period);
    api.getStats(dates).then(setStats);
    api.getSales(dates).then(setSales);
    api.getProducts().then(setProducts);
    api.getDailySales(dates).then(setDailySales);
    api.getDailyProfit(dates).then(setDailyProfit);
  }, [period]);

const recentSales = sales.slice(-5).reverse();
const topProducts = stats?.topProducts || [];

const periodLabel = period === "all" ? "" : ` (${t(`dashboard.${period}`)})`;

  const cards = [
    {
      title: period === "all" ? t("dashboard.totalSales") : `${t("dashboard.periodSales")}${periodLabel}`,
      value: stats ? fn(stats.totalSales.value) : "...",
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      title: period === "all" ? t("dashboard.totalPurchases") : `${t("dashboard.periodPurchases")}${periodLabel}`,
      value: stats ? fn(stats.totalPurchases.value) : "...",
      icon: ShoppingCart,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      title: t("dashboard.cashInHand"),
      value: stats ? fn(stats.cashInHand?.value || 0) : "...",
      icon: Wallet,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: t("dashboard.cashInBank"),
      value: stats ? fn(stats.cashInBank?.value || 0) : "...",
      icon: Building,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">{t("dashboard.title")}</h1>
          <p className="page-subtitle">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg" dir={locale === "ar" ? "rtl" : "ltr"}>
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "all" ? t("common.all") : t(`dashboard.${p}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="stat-card relative overflow-hidden">
            <div className="flex items-start justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
              <div className={`p-2 rounded-lg ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold tracking-tight">{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Sales Trend Chart */}
        <div className="card-modern">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              {t("dashboard.salesTrend")}
            </h3>
          </div>
          <div className="p-5" dir="ltr">
            {dailySales.length === 0 ? (
              <div className="text-center py-10">
                <TrendingUp className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">{t("common.noData")}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySales} margin={{ top: 10, right: 10, left: 70, bottom: 20 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis orientation="left" tick={{ fontSize: 11 }} tickFormatter={(v) => fn(v)} width={65} />
                  <Tooltip formatter={(value) => fn(value)} />
                  <Line type="monotone" dataKey="total" stroke="#4F46E5" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Profit Trend Chart */}
        <div className="card-modern">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              {t("dashboard.profitTrend")}
            </h3>
          </div>
          <div className="p-5" dir="ltr">
            {dailyProfit.length === 0 ? (
              <div className="text-center py-10">
                <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">{t("common.noData")}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyProfit} margin={{ top: 10, right: 10, left: 70, bottom: 20 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis orientation="left" tick={{ fontSize: 11 }} tickFormatter={(v) => fn(v)} width={65} />
                  <Tooltip formatter={(value) => fn(value)} />
                  <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="card-modern overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t("dashboard.recentSales")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("sales.customer")}</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-end">{t("common.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-12">{t("common.noData")}</TableCell></TableRow>
                ) : recentSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">#{s.id}</TableCell>
                    <TableCell className="font-medium">{s.customer_name}</TableCell>
                    <TableCell className="text-end font-mono font-medium">{fn(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Top Products */}
        <div className="card-modern overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              {t("dashboard.topProducts")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("common.name")}</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-end">{t("common.quantity")}</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-end">{t("common.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-12">{t("common.noData")}</TableCell></TableRow>
                ) : topProducts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name)}</TableCell>
                    <TableCell className="text-end font-mono">{fn0(p.total_qty)}</TableCell>
                    <TableCell className="text-end font-mono">{fn(p.total_revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>
    </div>
  );
}
