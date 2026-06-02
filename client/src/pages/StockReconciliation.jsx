import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useBulkSelect } from "@/lib/useBulkSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardCheck, Plus, Trash2, Eye, ListChecks, ArrowDownUp } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { fn0 } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function StockReconciliation() {
  const { t, locale } = useI18n();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [tab, setTab] = useState("history");
  const [warehouseId, setWarehouseId] = useState("");
  const [recDate, setRecDate] = useState(new Date().toISOString().split("T")[0]);
  const [recNotes, setRecNotes] = useState("");
  const [items, setItems] = useState([]);
  const [viewItem, setViewItem] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount } = useBulkSelect(reconciliations);

  useEffect(() => { load(); }, []);

  function load() {
    api.getWarehouses().then(setWarehouses);
    api.getProducts().then(setProducts);
    api.getStockReconciliations().then(setReconciliations);
  }

  function loadStock() {
    if (!warehouseId) return;
    api.getWarehouseStock(warehouseId).then((stock) => {
      setItems(stock.map((s) => ({
        product_id: s.product_id,
        product_name: locale === "ar" ? (s.product_name || s.product_name_en) : (s.product_name_en || s.product_name),
        expected_qty: s.quantity,
        actual_qty: s.quantity,
      })));
    });
  }

  function updateActual(productId, val) {
    setItems(items.map((i) => i.product_id === productId ? { ...i, actual_qty: parseFloat(val) || 0 } : i));
  }

  function doSave() {
    if (!warehouseId) return toast(t("common.required"));
    if (!confirm(t("common.confirm"))) return;
    api.createStockReconciliation({
      warehouse_id: parseInt(warehouseId),
      date: recDate,
      notes: recNotes || null,
      items: items.map((i) => ({ product_id: i.product_id, expected_qty: i.expected_qty, actual_qty: i.actual_qty })),
    }).then(() => {
      toast(t("common.saved"), { type: "success" });
      setTab("history");
      load();
    });
  }

  function openView(r) {
    api.getStockReconciliation(r.id).then(setViewItem);
  }

  function bulkRemove() {
    api.bulkDelete("stock-reconciliations", [...selectedIds]).then(() => {
      load(); clearSelection(); setConfirmOpen(false); toast("deleted", { type: "success" });
    });
  }

  const diffCount = items.filter((i) => i.expected_qty !== i.actual_qty).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("stockReconciliation.title")}</h2>
          <p className="text-muted-foreground">{t("stockReconciliation.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {tab === "history" && selectedCount > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4 ml-1" />{t("common.delete")} ({selectedCount})</Button>
          )}
          <ExportButtons data={reconciliations} columns={[
            { key: "id", label: "#", format: "int" },
            { key: "date", label: t("common.date") },
            { key: "warehouse_name", label: t("warehouses.title") },
            { key: "notes", label: t("common.notes") },
          ]} filename="stock-reconciliation" title={t("stockReconciliation.title")} />
          <Button onClick={() => { setTab("new"); setWarehouseId(""); setItems([]); setRecNotes(""); }}>
            <Plus className="h-4 w-4 ml-2" />{t("stockReconciliation.new")}</Button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setTab("history")}
          className={"flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all " +
            (tab === "history" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
          <ListChecks className="h-4 w-4" />{t("stockReconciliation.history")}
        </button>
        <button onClick={() => setTab("new")}
          className={"flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all " +
            (tab === "new" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
          <ClipboardCheck className="h-4 w-4" />{t("stockReconciliation.new")}
        </button>
      </div>

      {tab === "new" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("stockReconciliation.details")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("warehouses.title")}</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={warehouseId} onChange={(e) => { setWarehouseId(e.target.value); setItems([]); }}
                  >
                    <option value="">-</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{locale === "ar" ? (w.name || w.name_en) : (w.name_en || w.name)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("common.date")}</label>
                  <Input type="date" value={recDate} onChange={(e) => setRecDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("common.notes")}</label>
                  <Input value={recNotes} onChange={(e) => setRecNotes(e.target.value)} placeholder="..." />
                </div>
              </div>
              {warehouseId && (
                <Button size="sm" className="mt-3" onClick={loadStock} variant="outline">
                  <ArrowDownUp className="h-4 w-4 ml-1" />{t("stockReconciliation.loadStock")}
                </Button>
              )}
            </CardContent>
          </Card>

          {items.length > 0 && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>{t("common.products")} ({items.length})</span>
                    <Badge variant={diffCount > 0 ? "destructive" : "outline"}>
                      {diffCount > 0 ? t("stockReconciliation.differences", { n: diffCount }) : t("stockReconciliation.noDifferences")}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>{t("common.name")}</TableHead>
                        <TableHead className="text-end">{t("stockReconciliation.expected")}</TableHead>
                        <TableHead className="text-end">{t("stockReconciliation.actual")}</TableHead>
                        <TableHead className="text-end">{t("stockReconciliation.difference")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, i) => {
                        const diff = item.actual_qty - item.expected_qty;
                        return (
                          <TableRow key={item.product_id}>
                            <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell className="text-end">{fn0(item.expected_qty)}</TableCell>
                            <TableCell className="text-end">
                              <Input type="number" className="w-24 h-8 text-end" min="0"
                                value={item.actual_qty}
                                onChange={(e) => updateActual(item.product_id, e.target.value)} />
                            </TableCell>
                            <TableCell className="text-end">
                              <span className={diff === 0 ? "" : diff > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                {diff === 0 ? "-" : (diff > 0 ? "+" : "") + fn0(diff)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button size="lg" onClick={doSave}>
                  <ClipboardCheck className="h-5 w-5 ml-2" />{t("common.save")}
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("stockReconciliation.history")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" className="h-4 w-4" checked={isAllSelected} onChange={handleSelectAll} />
                  </TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("warehouses.title")}</TableHead>
                  <TableHead>{t("common.notes")}</TableHead>
                  <TableHead className="text-start">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliations.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
                ) : reconciliations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(r.id)} onChange={() => handleSelect(r.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    <TableCell>{new Date(r.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</TableCell>
                    <TableCell>{locale === "ar" ? (r.warehouse_name || r.warehouse_name_en) : (r.warehouse_name_en || r.warehouse_name)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{r.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openView(r)}>
                          <Eye className="h-4 w-4 ml-1" />{t("common.view")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {viewItem && (
        <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />{t("stockReconciliation.view")} #{viewItem.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">{t("warehouses.title")}:</span> {locale === "ar" ? (viewItem.warehouse_name || viewItem.warehouse_name_en) : (viewItem.warehouse_name_en || viewItem.warehouse_name)}</div>
              <div><span className="text-muted-foreground">{t("common.date")}:</span> {new Date(viewItem.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</div>
              {viewItem.notes && <div className="col-span-2"><span className="text-muted-foreground">{t("common.notes")}:</span> {viewItem.notes}</div>}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead className="text-end">{t("stockReconciliation.expected")}</TableHead>
                  <TableHead className="text-end">{t("stockReconciliation.actual")}</TableHead>
                  <TableHead className="text-end">{t("stockReconciliation.difference")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewItem.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{locale === "ar" ? (item.product_name || item.product_name_en) : (item.product_name_en || item.product_name)}</TableCell>
                    <TableCell className="text-end">{fn0(item.expected_qty)}</TableCell>
                    <TableCell className="text-end">{fn0(item.actual_qty)}</TableCell>
                    <TableCell className="text-end">
                      <span className={item.difference === 0 ? "" : item.difference > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {item.difference === 0 ? "-" : (item.difference > 0 ? "+" : "") + fn0(item.difference)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setViewItem(null)}>{t("common.close")}</Button>
            </div>
          </div>
        </Dialog>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        message={`Delete ${selectedCount} selected reconciliations?`}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
