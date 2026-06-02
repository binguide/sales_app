import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useSort } from "@/lib/useSort";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpDown, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { fn, fn0 } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6"];

function Th({ children, sortKey: sk, toggle, indicator }) {
  return (
    <TableHead>
      <button onClick={() => toggle(sk)} className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">
        {children}
        <ArrowUpDown className={"h-3 w-3 " + (indicator(sk) ? "text-primary" : "opacity-30")} />
      </button>
    </TableHead>
  );
}

export default function ProfitReport() {
  const { t, locale } = useI18n();
  const isRTL = locale === "ar";
  const [profitSummary, setProfitSummary] = useState(null);
  const [profitProducts, setProfitProducts] = useState([]);
  const { sorted, toggle, getIndicator } = useSort(profitProducts, "profit");

  useEffect(() => {
    api.get("/reports/profit").then(setProfitSummary);
    api.get("/reports/profit/products").then(setProfitProducts);
  }, []);

const profitChartData = sorted.slice(0, 8).map((p) => ({
  name: locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name),
  profit: p.profit,
  margin: p.margin,
}));

// Reverse data order for Arabic (RTL) charts
const reversedProfitChartData = isRTL ? [...profitChartData].reverse() : profitChartData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">تقرير الأرباح</h2>
          <p className="text-muted-foreground">{t("reports.subtitle")}</p>
        </div>
        <ExportButtons data={sorted} columns={[
          { key: "name", label: t("common.name") },
          { key: "sold_qty", label: "الكمية المباعة", format: "int" },
          { key: "profit", label: "الربح", format: "number" },
          { key: "margin", label: "% الربح", format: "number" },
        ]} filename="profit-report" title="تقرير الأرباح" />
      </div>

      {profitSummary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-green-700">إجمالي المبيعات</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{fn(profitSummary.total_sales)}</div></CardContent>
          </Card>
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">إجمالي التكلفة</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{fn(profitSummary.total_cost)}</div></CardContent>
          </Card>
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">صافي الربح</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{fn(profitSummary.totalProfit)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                هامش الربح: {profitSummary.margin.toFixed(1)}% | عدد الفواتير: {fn0(profitSummary.invoice_count)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">الربح حسب المنتج</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <Th sortKey="name" toggle={toggle} indicator={getIndicator}>{t("common.name")}</Th>
                  <Th sortKey="sold_qty" toggle={toggle} indicator={getIndicator}>الكمية المباعة</Th>
                  <Th sortKey="profit" toggle={toggle} indicator={getIndicator}>الربح</Th>
                  <Th sortKey="margin" toggle={toggle} indicator={getIndicator}>% الربح</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">لا توجد مبيعات</TableCell></TableRow>
                ) : sorted.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name)}</TableCell>
                    <TableCell>{fn0(p.sold_qty)}</TableCell>
                    <TableCell className="font-medium text-green-600">{fn(p.profit)}</TableCell>
                    <TableCell>
                      <Badge variant={p.margin >= 30 ? "default" : p.margin > 0 ? "outline" : "destructive"}>
                        {p.margin.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">الرسم البياني للربح</CardTitle></CardHeader>
          <CardContent>
<div className="text-center py-10">
   <p className="text-muted-foreground">Chart removed</p>
</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
