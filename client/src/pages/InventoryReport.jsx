import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useSort } from "@/lib/useSort";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign, TrendingUp, ShoppingCart, ArrowUpDown } from "lucide-react";
import { fn, fn0 } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";

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

function StatCard({ title, value, subtitle, icon: Icon, color }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={"h-4 w-4 " + color} />
      </CardHeader>
      <CardContent>
        <div className={"text-2xl font-bold " + color}>{value}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>}
      </CardContent>
    </Card>
  );
}

export default function InventoryReport() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState({ items: [], retailTotal: 0, costTotal: 0, profit: 0, margin: 0 });
  const { sorted, toggle, getIndicator } = useSort(inventory.items, "name");

  useEffect(() => {
    api.getStats().then(setStats);
    api.getInventoryReport().then(setInventory);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("reports.inventory")}</h2>
          <p className="text-muted-foreground">{t("reports.subtitle")}</p>
        </div>
        <ExportButtons data={sorted} columns={[
          { key: "name", label: t("common.name") },
          { key: "quantity", label: t("common.quantity"), format: "int" },
          { key: "retail_price", label: t("common.price"), format: "number" },
          { key: "cost_price", label: "سعر التكلفة", format: "number" },
          { key: "retail_value", label: "قيمة البيع", format: "number" },
          { key: "cost_value", label: "قيمة التكلفة", format: "number" },
          { key: "profit", label: "الربح المتوقع", format: "number" },
        ]} filename="inventory-report" title={t("reports.inventory")} />
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title={t("dashboard.totalSales")} value={fn(stats.totalSales.value)} icon={DollarSign} color="text-green-600" />
          <StatCard title={t("dashboard.todaySales")} value={fn(stats.todaySales.value)} icon={TrendingUp} color="text-blue-600" />
          <StatCard title={t("dashboard.totalPurchases")} value={fn(stats.totalPurchases.value)} icon={ShoppingCart} color="text-orange-600" />
          <StatCard title={t("dashboard.productCount")} value={fn0(stats.productCount.value)} icon={Package} color="text-purple-600" />
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">{t("reports.inventory")}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <Th sortKey="name" toggle={toggle} indicator={getIndicator}>{t("common.name")}</Th>
                <Th sortKey="quantity" toggle={toggle} indicator={getIndicator}>{t("common.quantity")}</Th>
                <Th sortKey="retail_price" toggle={toggle} indicator={getIndicator}>سعر البيع</Th>
                <Th sortKey="cost_price" toggle={toggle} indicator={getIndicator}>سعر التكلفة</Th>
                <Th sortKey="retail_value" toggle={toggle} indicator={getIndicator}>قيمة البيع</Th>
                <Th sortKey="cost_value" toggle={toggle} indicator={getIndicator}>قيمة التكلفة</Th>
                <Th sortKey="" toggle={toggle} indicator={getIndicator}>الربح المتوقع</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">{t("common.noData")}</TableCell></TableRow>
              ) : sorted.map((item, i) => {
                const itemProfit = item.retail_value - item.cost_value;
                const itemMargin = item.retail_value > 0 ? (itemProfit / item.retail_value * 100) : 0;
                return (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant={item.quantity === 0 ? "destructive" : item.quantity < 10 ? "outline" : "success"}>
                        {fn0(item.quantity)}
                      </Badge>
                    </TableCell>
                    <TableCell>{fn(item.retail_price)}</TableCell>
                    <TableCell className="text-muted-foreground">{fn(item.cost_price)}</TableCell>
                    <TableCell>{fn(item.retail_value)}</TableCell>
                    <TableCell className="text-muted-foreground">{fn(item.cost_value)}</TableCell>
                    <TableCell>
                      <span className={itemProfit >= 0 ? "text-green-600" : "text-red-600"}>
                        {fn(itemProfit)}
                      </span>
                      <span className="text-xs text-muted-foreground mr-1">
                        ({itemMargin.toFixed(1)}%)
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {inventory.items.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">إجمالي قيمة البيع</div>
                <div className="text-lg font-bold text-green-600">{fn(inventory.retailTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">إجمالي التكلفة</div>
                <div className="text-lg font-bold text-red-600">{fn(inventory.costTotal)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">الربح المتوقع</div>
                <div className="text-lg font-bold text-primary">{fn(inventory.profit)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">هامش الربح</div>
                <div className="text-lg font-bold">{inventory.margin.toFixed(1)}%</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
