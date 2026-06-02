import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useBulkSelect } from "@/lib/useBulkSelect";
import { useSort } from "@/lib/useSort";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ArrowUpDown, ArrowRight, Users, Check } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import ExportButtons from "@/components/ExportButtons";
import ConfirmDialog from "@/components/ConfirmDialog";

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

export default function Customers() {
  const { t, locale } = useI18n();
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [mode, setMode] = useState("list");
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", receivable_account_id: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { sorted, toggle, getIndicator } = useSort(customers, "id");
  const { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount } = useBulkSelect(customers);

  useEffect(() => { api.getCustomers().then(setCustomers); api.getAccounts(true).then(setAccounts); }, []);

  function startAdd() {
    setEditItem(null);
    setForm({ name: "", phone: "", receivable_account_id: "" });
    setMode("form");
  }

  function startEdit(c) {
    setEditItem(c);
    setForm({ name: c.name, phone: c.phone || "", receivable_account_id: c.receivable_account_id ? String(c.receivable_account_id) : "" });
    setMode("form");
  }

  function save() {
    if (!form.name) return toast(t("common.nameRequired"), { type: "error" });
    const data = { name: form.name, phone: form.phone, receivable_account_id: form.receivable_account_id ? parseInt(form.receivable_account_id) : null };
    const action = editItem ? api.updateCustomer(editItem.id, data) : api.addCustomer(data);
    action.then(() => {
      toast(editItem ? t("common.edit") : t("common.add"), { type: "success" });
      setMode("list");
      api.getCustomers().then(setCustomers);
    });
  }

  function remove(id, name) {
    if (confirm(`delete "${name}"?`)) {
      api.deleteCustomer(id).then(() => { api.getCustomers().then(setCustomers); toast("ok", { type: "success" }); });
    }
  }

  function bulkRemove() {
    api.bulkDelete("customers", [...selectedIds]).then(() => {
      api.getCustomers().then(setCustomers); clearSelection(); setConfirmOpen(false); toast("deleted", { type: "success" });
    });
  }

  if (mode === "form") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMode("list")}><ArrowRight className="h-5 w-5" /></Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{editItem ? t("customers.edit") : t("customers.add")}</h2>
              <p className="text-muted-foreground">{t("customers.subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMode("list")}>{t("common.cancel")}</Button>
            <Button onClick={save}><Check className="h-4 w-4 ml-1" />{editItem ? t("common.save") : t("common.add")}</Button>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>{t("common.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>{t("common.phone")}</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div>
                <Label>حساب المدين</Label>
                <Combobox value={form.receivable_account_id} onChange={(e) => setForm({ ...form, receivable_account_id: e.target.value })} placeholder="اختر...">
                  <option value="">اختر...</option>
                  {accounts.filter((a) => a.type === "asset").map((a) => (
                    <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                  ))}
                </Combobox>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("customers.title")}</h2>
          <p className="text-muted-foreground">{t("customers.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4 ml-1" />{t("common.delete")} ({selectedCount})</Button>
          )}
          <ExportButtons data={sorted} columns={[
            { key: "id", label: "#", format: "int" },
            { key: "name", label: t("common.name") },
            { key: "phone", label: t("common.phone") },
          ]} filename="customers" title={t("customers.title")} />
          <Button onClick={startAdd}><Plus className="h-4 w-4 ml-2" />{t("customers.add")}</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input type="checkbox" className="h-4 w-4" checked={isAllSelected} onChange={handleSelectAll} />
              </TableHead>
              <Th sortKey="id" toggle={toggle} indicator={getIndicator}>{t("common.id")}</Th>
              <Th sortKey="name" toggle={toggle} indicator={getIndicator}>{t("common.name")}</Th>
              <Th sortKey="phone" toggle={toggle} indicator={getIndicator}>{t("common.phone")}</Th>
              <TableHead className="text-start">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
            ) : sorted.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(c.id)} onChange={() => handleSelect(c.id)} />
                </TableCell>
                <TableCell>{c.id}</TableCell>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell dir="ltr">{c.phone || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c.id, c.name)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        message={`Delete ${selectedCount} selected customers?`}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
