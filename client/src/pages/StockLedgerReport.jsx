import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Download } from "lucide-react";
import { fn0 } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";

const TYPE_LABELS = {
  purchase: { ar: "مشتريات", en: "Purchase" },
  purchase_return: { ar: "مرتجع مشتريات", en: "Purchase Return" },
  sale: { ar: "مبيعات", en: "Sale" },
  sales_return: { ar: "مرتجع مبيعات", en: "Sales Return" },
  transfer_out: { ar: "تحويل خارج", en: "Transfer Out" },
  transfer_in: { ar: "تحويل داخل", en: "Transfer In" },
  reconciliation: { ar: "جرد", en: "Reconciliation" },
};

export default function StockLedgerReport() {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [filters, setFilters] = useState({ product_id: "", warehouse_id: "", from: "", to: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getProducts().then(setProducts);
    api.getWarehouses().then(setWarehouses);
  }, []);

  function search() {
    const params = {};
    if (filters.product_id) params.product_id = filters.product_id;
    if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    setLoading(true);
    api.getStockLedger(params).then((data) => {
      let balance = 0;
      const withBalance = data.map((row) => {
        balance = balance + row.in_qty - row.out_qty;
        return { ...row, balance };
      });
      setLedger(withBalance);
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  const productName = (p) => locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name);
  const typeLabel = (type) => locale === "ar" ? (TYPE_LABELS[type]?.ar || type) : (TYPE_LABELS[type]?.en || type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("stockLedger.title")}</h2>
          <p className="text-muted-foreground">{t("stockLedger.subtitle")}</p>
        </div>
        <ExportButtons data={ledger} columns={[
          { key: "date", label: t("common.date") },
          { key: "type", label: t("stockLedger.type") },
          { key: "reference", label: t("stockLedger.reference") },
          { key: "in_qty", label: t("stockLedger.in"), format: "int" },
          { key: "out_qty", label: t("stockLedger.out"), format: "int" },
          { key: "balance", label: t("stockLedger.balance"), format: "int" },
        ]} filename="stock-ledger" title={t("stockLedger.title")} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">{t("stockLedger.filters")}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">{t("common.name")}</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.product_id}
                onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
              >
                <option value="">{t("common.all")}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{productName(p)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("warehouses.title")}</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filters.warehouse_id}
                onChange={(e) => setFilters({ ...filters, warehouse_id: e.target.value })}
              >
                <option value="">{t("common.all")}</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>{locale === "ar" ? (w.name || w.name_en) : (w.name_en || w.name)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("common.date")} {t("common.from")}</label>
              <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-sm font-medium">{t("common.date")} {t("common.to")}</label>
                <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
              </div>
              <Button onClick={search} disabled={loading} className="mb-0.5">
                <Search className="h-4 w-4 ml-1" />{t("common.search")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t("stockLedger.movements")}</CardTitle>
          {ledger.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {t("stockLedger.totalMovements")}: {ledger.length}
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.date")}</TableHead>
                <TableHead>{t("stockLedger.type")}</TableHead>
                <TableHead>{t("stockLedger.reference")}</TableHead>
                <TableHead className="text-end">{t("stockLedger.in")}</TableHead>
                <TableHead className="text-end">{t("stockLedger.out")}</TableHead>
                <TableHead className="text-end">{t("stockLedger.balance")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {loading ? t("common.loading") : t("common.noData")}
                  </TableCell>
                </TableRow>
              ) : ledger.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {new Date(row.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {typeLabel(row.reference_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{row.description}</TableCell>
                  <TableCell className="text-end text-green-600 font-medium">
                    {row.in_qty > 0 ? fn0(row.in_qty) : "-"}
                  </TableCell>
                  <TableCell className="text-end text-red-600 font-medium">
                    {row.out_qty > 0 ? fn0(row.out_qty) : "-"}
                  </TableCell>
                  <TableCell className="text-end font-bold">{fn0(row.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
