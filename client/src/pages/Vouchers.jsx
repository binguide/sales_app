import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useBulkSelect } from "@/lib/useBulkSelect";
import { useSort } from "@/lib/useSort";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Receipt, ArrowUpFromLine, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { fn } from "@/lib/format";
import { toast } from "@/components/ui/sonner";
import ExportButtons from "@/components/ExportButtons";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Vouchers() {
  const { t, locale } = useI18n();
  const [vouchers, setVouchers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ type: "receipt", number: "", date: new Date().toISOString().slice(0,10), account_id: "", amount: "", description: "", reference: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount } = useBulkSelect(vouchers);

  useEffect(() => { load(); }, [typeFilter]);
  useEffect(() => { api.getAccounts(true).then(setAccounts); }, []);

  function load() {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    api.getVouchers(params).then(setVouchers);
  }

  const { sorted, toggle, getIndicator } = useSort(vouchers, "id");

  async function openAdd(type) {
    const res = await api.getVoucherNextNumber(type);
    setEditItem(null);
    setForm({ type, number: res.number, date: new Date().toISOString().slice(0,10), account_id: "", amount: "", description: "", reference: "" });
    setDialogOpen(true);
  }

  function openEdit(v) {
    setEditItem(v);
    setForm({
      type: v.type, number: v.number, date: v.date,
      account_id: String(v.account_id), amount: String(v.amount),
      description: v.description || "", reference: v.reference || "",
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.account_id || !form.amount) {
      toast(t("common.fieldRequired"), { type: "error" });
      return;
    }
    try {
      if (editItem) {
        await api.updateVoucher(editItem.id, form);
      } else {
        await api.createVoucher(form);
      }
      setDialogOpen(false);
      load();
      toast(t("vouchers.saved"), { type: "success" });
    } catch { toast(t("common.error"), { type: "error" }); }
  }

  function remove(v) {
    if (!confirm(`${t("common.delete")} "${v.number}"?`)) return;
    api.deleteVoucher(v.id).then(() => { load(); toast(t("common.delete"), { type: "success" }); });
  }

  function bulkRemove() {
    api.bulkDelete("vouchers", [...selectedIds]).then(() => {
      load(); clearSelection(); setConfirmOpen(false); toast("deleted", { type: "success" });
    });
  }

  const accName = (v) => locale === "ar" ? (v.name || v.name_en) : (v.name_en || v.name);

  function Th({ children, sortKey: sk }) {
    return (
      <TableHead>
        <button onClick={() => toggle(sk)} className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">
          {children}
          <ArrowUpDown className={"h-3 w-3 " + (getIndicator(sk) ? "text-primary" : "opacity-30")} />
        </button>
      </TableHead>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("vouchers.title")}</h2>
          <p className="text-muted-foreground">{t("vouchers.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4 ml-1" />{t("common.delete")} ({selectedCount})</Button>
          )}
          <ExportButtons data={sorted} columns={[
            { key: "id", label: "#", format: "int" },
            { key: "type", label: t("vouchers.type") },
            { key: "number", label: t("vouchers.number") },
            { key: "date", label: t("vouchers.date") },
            { key: "account_name", label: t("vouchers.account") },
            { key: "amount", label: t("vouchers.amount"), format: "number" },
            { key: "description", label: t("vouchers.description") },
            { key: "reference", label: t("vouchers.reference") },
            { key: "created_by", label: t("vouchers.createdBy") },
          ]} filename="vouchers" title={t("vouchers.title")} />
          <Button onClick={() => openAdd("receipt")}>
            <Receipt className="h-4 w-4 ml-2" />{t("vouchers.addReceipt")}
          </Button>
          <Button onClick={() => openAdd("payment")} variant="secondary">
            <ArrowUpFromLine className="h-4 w-4 ml-2" />{t("vouchers.addPayment")}
          </Button>
        </div>
      </div>

      <div className="flex gap-3">
        <select className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">{t("common.all")}</option>
          <option value="receipt">{t("vouchers.receipt")}</option>
          <option value="payment">{t("vouchers.payment")}</option>
        </select>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input type="checkbox" className="h-4 w-4" checked={isAllSelected} onChange={handleSelectAll} />
              </TableHead>
              <Th sortKey="id">#</Th>
              <Th sortKey="type">{t("vouchers.type")}</Th>
              <Th sortKey="number">{t("vouchers.number")}</Th>
              <Th sortKey="date">{t("vouchers.date")}</Th>
              <Th sortKey="account_name">{t("vouchers.account")}</Th>
              <TableHead className="text-end"><button onClick={() => toggle("amount")} className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">{t("vouchers.amount")}<ArrowUpDown className={"h-3 w-3 " + (getIndicator("amount") ? "text-primary" : "opacity-30")} /></button></TableHead>
              <Th sortKey="description">{t("vouchers.description")}</Th>
              <Th sortKey="reference">{t("vouchers.reference")}</Th>
              <Th sortKey="created_by">{t("vouchers.createdBy")}</Th>
              <TableHead className="text-start">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
            ) : sorted.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(v.id)} onChange={() => handleSelect(v.id)} />
                </TableCell>
                <TableCell>{v.id}</TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${v.type === "receipt" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {t(`vouchers.${v.type}`)}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-sm">{v.number}</TableCell>
                <TableCell>{v.date}</TableCell>
                <TableCell>{accName(v)}</TableCell>
                <TableCell className="text-end font-mono">{fn(v.amount)}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{v.description || "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.reference || "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{v.created_by}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>
            {editItem
              ? (editItem.type === "receipt" ? t("vouchers.receipt") : t("vouchers.payment"))
              : (form.type === "receipt" ? t("vouchers.addReceipt") : t("vouchers.addPayment"))}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("vouchers.number")}</Label>
              <Input value={form.number} readOnly className="bg-muted" />
            </div>
            <div>
              <Label>{t("vouchers.date")}</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>{t("vouchers.account")}</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })}>
              <option value="">--</option>
              {accounts.filter(a => a.is_active).map((a) => (
                <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t("vouchers.amount")}</Label>
              <Input type="number" step="0.001" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>{t("vouchers.reference")}</Label>
              <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>{t("vouchers.description")}</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={save}>{editItem ? t("common.save") : t("common.add")}</Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        message={`Delete ${selectedCount} selected vouchers?`}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
