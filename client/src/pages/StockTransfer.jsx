import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRightLeft, Plus, Trash2, Eye, ListChecks, ArrowRight, Undo2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { fn0 } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";

export default function StockTransfer() {
  const { t, locale } = useI18n();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [tab, setTab] = useState("history");
  const [form, setForm] = useState({
    from_warehouse_id: "",
    to_warehouse_id: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [items, setItems] = useState([]);
  const [selProduct, setSelProduct] = useState("");
  const [selQty, setSelQty] = useState("1");
  const [adding, setAdding] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => { load(); }, []);

  function load() {
    api.getWarehouses().then(setWarehouses);
    api.getProducts().then(setProducts);
    api.getStockTransfers().then(setTransfers);
  }

  function addItem() {
    if (!selProduct) return;
    const pid = parseInt(selProduct);
    const qty = parseInt(selQty) || 1;
    if (qty <= 0) return;
    const existing = items.find((i) => i.product_id === pid);
    if (existing) {
      setItems(items.map((i) => i.product_id === pid ? { ...i, quantity: i.quantity + qty } : i));
    } else {
      const p = products.find((pr) => pr.id === pid);
      setItems([...items, { product_id: pid, product_name: locale === "ar" ? (p?.name || p?.name_en) : (p?.name_en || p?.name), quantity: qty }]);
    }
    setSelProduct("");
    setSelQty("1");
  }

  function removeItem(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function doTransfer() {
    if (!form.from_warehouse_id || !form.to_warehouse_id) return toast("اختر المخازن");
    if (form.from_warehouse_id === form.to_warehouse_id) return toast("المخازن متطابقة");
    if (items.length === 0) return toast("أضف أصنافاً للتحويل");
    if (!confirm(t("stockTransfers.confirm"))) return;
    api.createStockTransfer({
      from_warehouse_id: parseInt(form.from_warehouse_id),
      to_warehouse_id: parseInt(form.to_warehouse_id),
      date: form.date,
      notes: form.notes || null,
      items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    }).then(() => {
      toast(t("stockTransfers.success"), { type: "success" });
      setItems([]);
      setForm({ ...form, notes: "" });
      load();
      setTab("history");
    }).catch((e) => {
      toast(e.message || "فشل التحويل", { type: "error" });
    });
  }

  function openView(tr) {
    api.getStockTransfer(tr.id).then(setViewItem);
  }

  const filteredProducts = products.filter(
    (p) => !items.some((i) => i.product_id === p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("stockTransfers.title")}</h2>
          <p className="text-muted-foreground">{t("stockTransfers.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons data={transfers} columns={[
            { key: "id", label: "#", format: "int" },
            { key: "date", label: t("stockTransfers.transferDate") },
            { key: "from_name", label: t("stockTransfers.fromWarehouse") },
            { key: "to_name", label: t("stockTransfers.toWarehouse") },
            { key: "notes", label: t("stockTransfers.notes") },
          ]} filename="stock-transfers" title={t("stockTransfers.title")} />
          <Button onClick={() => { setTab("new"); setItems([]); }}>
            <Plus className="h-4 w-4 ml-2" />{t("stockTransfers.newTransfer")}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setTab("history")}
          className={"flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all " +
            (tab === "history" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
          <ListChecks className="h-4 w-4" />{t("stockTransfers.history")}
        </button>
        <button onClick={() => setTab("new")}
          className={"flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all " +
            (tab === "new" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
          <ArrowRightLeft className="h-4 w-4" />{t("stockTransfers.newTransfer")}
        </button>
      </div>

      {tab === "new" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("stockTransfers.newTransfer")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="text-sm font-medium">{t("stockTransfers.from")}</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.from_warehouse_id}
                    onChange={(e) => setForm({ ...form, from_warehouse_id: e.target.value })}
                  >
                    <option value="">-</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{locale === "ar" ? (w.name || w.name_en) : (w.name_en || w.name)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end justify-center pb-2">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("stockTransfers.to")}</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.to_warehouse_id}
                    onChange={(e) => setForm({ ...form, to_warehouse_id: e.target.value })}
                  >
                    <option value="">-</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{locale === "ar" ? (w.name || w.name_en) : (w.name_en || w.name)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("stockTransfers.date")}</label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">{t("stockTransfers.notes")}</label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{t("stockTransfers.items")} ({items.length})</span>
                <div className="flex items-center gap-2">
                  <select className="flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm w-56"
                    value={selProduct} onChange={(e) => setSelProduct(e.target.value)}
                  >
                    <option value="">{t("stockTransfers.product")}...</option>
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>{locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name)}</option>
                    ))}
                  </select>
                  <Input type="number" className="w-20 h-9" min="1" value={selQty}
                    onChange={(e) => setSelQty(e.target.value)} />
                  <Button size="sm" onClick={addItem} disabled={!selProduct}>
                    <Plus className="h-4 w-4 ml-1" />{t("stockTransfers.addItem")}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>{t("stockTransfers.product")}</TableHead>
                    <TableHead className="text-start w-24">{t("stockTransfers.quantity")}</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t("stockTransfers.noItems")}</TableCell></TableRow>
                  ) : items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{item.product_name}</TableCell>
                      <TableCell>
                        <Input type="number" className="w-20 h-8" min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const qty = parseInt(e.target.value) || 1;
                            setItems(items.map((it, j) => j === i ? { ...it, quantity: qty } : it));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeItem(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" onClick={doTransfer} disabled={items.length === 0}>
              <ArrowRightLeft className="h-5 w-5 ml-2" />{t("stockTransfers.execute")}
            </Button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("stockTransfers.history")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t("stockTransfers.transferDate")}</TableHead>
                  <TableHead>{t("stockTransfers.fromWarehouse")}</TableHead>
                  <TableHead>{t("stockTransfers.toWarehouse")}</TableHead>
                  <TableHead>{t("stockTransfers.notes")}</TableHead>
                  <TableHead className="text-start">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
                ) : transfers.map((tr) => (
                  <TableRow key={tr.id}>
                    <TableCell className="font-mono text-xs">{tr.id}</TableCell>
                    <TableCell>{new Date(tr.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</TableCell>
                    <TableCell>{locale === "ar" ? (tr.from_name || tr.from_name_en) : (tr.from_name_en || tr.from_name)}</TableCell>
                    <TableCell>{locale === "ar" ? (tr.to_name || tr.to_name_en) : (tr.to_name_en || tr.to_name)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{tr.notes || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openView(tr)}>
                        <Eye className="h-4 w-4 ml-1" />{t("stockTransfers.view")}
                      </Button>
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
              <ArrowRightLeft className="h-5 w-5" />{t("stockTransfers.view")} #{viewItem.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">{t("stockTransfers.from")}:</span> {locale === "ar" ? (viewItem.from_name || viewItem.from_name_en) : (viewItem.from_name_en || viewItem.from_name)}</div>
              <div><span className="text-muted-foreground">{t("stockTransfers.to")}:</span> {locale === "ar" ? (viewItem.to_name || viewItem.to_name_en) : (viewItem.to_name_en || viewItem.to_name)}</div>
              <div><span className="text-muted-foreground">{t("stockTransfers.date")}:</span> {new Date(viewItem.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</div>
              {viewItem.notes && <div><span className="text-muted-foreground">{t("stockTransfers.notes")}:</span> {viewItem.notes}</div>}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>{t("stockTransfers.product")}</TableHead>
                  <TableHead className="text-start">{t("stockTransfers.quantity")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewItem.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{locale === "ar" ? (item.product_name || item.product_name_en) : (item.product_name_en || item.product_name)}</TableCell>
                    <TableCell><Badge variant="outline">{fn0(item.quantity)}</Badge></TableCell>
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
    </div>
  );
}
