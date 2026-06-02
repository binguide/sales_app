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
import { PackageOpen, Plus, Trash2, Eye, ListChecks, Ship } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { fn } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function LandedCosts() {
  const { t, locale } = useI18n();
  const [purchases, setPurchases] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [tab, setTab] = useState("history");
  const [form, setForm] = useState({ purchase_id: "", date: new Date().toISOString().split("T")[0], notes: "" });
  const [items, setItems] = useState([{ description: "", amount: "", account_id: "" }]);
  const [viewItem, setViewItem] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount } = useBulkSelect(vouchers);

  useEffect(() => { load(); }, []);

  function load() {
    api.getPurchases().then(setPurchases);
    api.getLandedCosts().then(setVouchers);
    api.getAccounts(true).then(setAccounts);
  }

  function addLine() {
    setItems([...items, { description: "", amount: "", account_id: "" }]);
  }

  function updateLine(idx, field, value) {
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  function removeLine(idx) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function doSave() {
    if (!form.purchase_id) return toast(t("common.required"));
    const validItems = items.filter((i) => i.description && parseFloat(i.amount) > 0);
    if (validItems.length === 0) return toast(t("common.required"));
    if (!confirm(t("common.confirm"))) return;
    api.createLandedCost({
      purchase_id: parseInt(form.purchase_id),
      date: form.date,
      notes: form.notes || null,
      items: validItems.map((i) => ({ description: i.description, amount: parseFloat(i.amount), account_id: i.account_id ? parseInt(i.account_id) : null })),
    }).then(() => {
      toast(t("common.saved"), { type: "success" });
      setTab("history");
      setItems([{ description: "", amount: "", account_id: "" }]);
      setForm({ purchase_id: "", date: new Date().toISOString().split("T")[0], notes: "" });
      load();
    });
  }

  function openView(v) {
    api.getLandedCost(v.id).then(setViewItem);
  }

  function bulkRemove() {
    api.bulkDelete("landed-costs", [...selectedIds]).then(() => {
      load(); clearSelection(); setConfirmOpen(false); toast("deleted", { type: "success" });
    });
  }

  const totalAmount = items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
  const purchaseOpts = purchases.filter((p) => {
    const paid = p.paid_amount || 0;
    return p.total > paid;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("landedCosts.title")}</h2>
          <p className="text-muted-foreground">{t("landedCosts.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {tab === "history" && selectedCount > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4 ml-1" />{t("common.delete")} ({selectedCount})</Button>
          )}
          <ExportButtons data={vouchers} columns={[
            { key: "id", label: "#", format: "int" },
            { key: "date", label: t("common.date") },
            { key: "purchase_num", label: t("purchases.invoice") },
            { key: "supplier_name", label: t("landedCosts.supplier") },
            { key: "notes", label: t("common.notes") },
          ]} filename="landed-costs" title={t("landedCosts.title")} />
          <Button onClick={() => { setTab("new"); }}>
            <Plus className="h-4 w-4 ml-2" />{t("landedCosts.new")}
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <button onClick={() => setTab("history")}
          className={"flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all " +
            (tab === "history" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
          <ListChecks className="h-4 w-4" />{t("landedCosts.list")}
        </button>
        <button onClick={() => setTab("new")}
          className={"flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all " +
            (tab === "new" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}>
          <Ship className="h-4 w-4" />{t("landedCosts.new")}
        </button>
      </div>

      {tab === "new" && (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">{t("landedCosts.details")}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">{t("purchases.title")}</label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.purchase_id}
                    onChange={(e) => setForm({ ...form, purchase_id: e.target.value })}
                  >
                    <option value="">-</option>
                    {purchases.map((p) => (
                      <option key={p.id} value={p.id}>{t("purchases.invoice")} #{p.id} - {p.supplier_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium">{t("common.date")}</label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">{t("common.notes")}</label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="..." />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{t("landedCosts.costItems")}</span>
                <Button size="sm" variant="outline" onClick={addLine}>
                  <Plus className="h-4 w-4 ml-1" />{t("landedCosts.addCost")}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>{t("landedCosts.description")}</TableHead>
                    <TableHead>{t("landedCosts.account")}</TableHead>
                    <TableHead className="text-end">{t("common.amount")}</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <Input value={item.description}
                          onChange={(e) => updateLine(i, "description", e.target.value)}
                          placeholder={t("landedCosts.descriptionPlaceholder")} />
                      </TableCell>
                      <TableCell>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={item.account_id}
                          onChange={(e) => updateLine(i, "account_id", e.target.value)}
                        >
                          <option value="">-</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>{locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="text-end" min="0" step="0.01"
                          value={item.amount}
                          onChange={(e) => updateLine(i, "amount", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        {items.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => removeLine(i)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t("common.total")}: <span className="font-bold text-foreground">{fn(totalAmount)}</span>
            </div>
            <Button size="lg" onClick={doSave} disabled={totalAmount <= 0}>
              <Ship className="h-5 w-5 ml-2" />{t("common.save")}
            </Button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">{t("landedCosts.list")}</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" className="h-4 w-4" checked={isAllSelected} onChange={handleSelectAll} />
                  </TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>{t("common.date")}</TableHead>
                  <TableHead>{t("purchases.title")}</TableHead>
                  <TableHead>{t("landedCosts.supplier")}</TableHead>
                  <TableHead>{t("common.notes")}</TableHead>
                  <TableHead className="text-start">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
                ) : vouchers.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(v.id)} onChange={() => handleSelect(v.id)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{v.id}</TableCell>
                    <TableCell>{new Date(v.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</TableCell>
                    <TableCell>{t("purchases.invoice")} #{v.purchase_num}</TableCell>
                    <TableCell>{v.supplier_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{v.notes || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openView(v)}>
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
              <Ship className="h-5 w-5" />{t("landedCosts.view")} #{viewItem.id}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">{t("purchases.invoice")}:</span> #{viewItem.purchase_num}</div>
              <div><span className="text-muted-foreground">{t("common.date")}:</span> {new Date(viewItem.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</div>
              <div><span className="text-muted-foreground">{t("landedCosts.supplier")}:</span> {viewItem.supplier_name}</div>
              {viewItem.notes && <div><span className="text-muted-foreground">{t("common.notes")}:</span> {viewItem.notes}</div>}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">#</TableHead>
                  <TableHead>{t("landedCosts.description")}</TableHead>
                  <TableHead>{t("landedCosts.account")}</TableHead>
                  <TableHead className="text-end">{t("common.amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewItem.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>{locale === "ar" ? (item.account_name || item.account_name_en) : (item.account_name_en || item.account_name)}</TableCell>
                    <TableCell className="text-end font-medium">{fn(item.amount)}</TableCell>
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
        message={`Delete ${selectedCount} selected landed cost vouchers?`}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
