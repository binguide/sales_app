import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useBulkSelect } from "@/lib/useBulkSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, LayoutGrid, Table as TableIcon } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import ExportButtons from "@/components/ExportButtons";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Categories() {
  const { t, locale } = useI18n();
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", name_en: "", color: "#6366f1", revenue_account_id: "", cogs_account_id: "", inventory_account_id: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState("cards");
  const { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount } = useBulkSelect(categories);

  useEffect(() => { load(); api.getAccounts(true).then(setAccounts); }, []);

  function load() { api.getCategories().then(setCategories); }

  function openAdd() { setEditItem(null); setForm({ name: "", name_en: "", color: "#6366f1", revenue_account_id: "", cogs_account_id: "", inventory_account_id: "" }); setDialogOpen(true); }
  function openEdit(c) { setEditItem(c); setForm({ name: c.name, name_en: c.name_en || "", color: c.color || "#6366f1", revenue_account_id: c.revenue_account_id ? String(c.revenue_account_id) : "", cogs_account_id: c.cogs_account_id ? String(c.cogs_account_id) : "", inventory_account_id: c.inventory_account_id ? String(c.inventory_account_id) : "" }); setDialogOpen(true); }

  function save() {
    if (!form.name) return toast(t("common.nameRequired"), { type: "error" });
    const data = { name: form.name, name_en: form.name_en, color: form.color, revenue_account_id: form.revenue_account_id ? parseInt(form.revenue_account_id) : null, cogs_account_id: form.cogs_account_id ? parseInt(form.cogs_account_id) : null, inventory_account_id: form.inventory_account_id ? parseInt(form.inventory_account_id) : null };
    const action = editItem ? api.updateCategory(editItem.id, data) : api.addCategory(data);
    action.then(() => { load(); setDialogOpen(false); toast("ok", { type: "success" }); });
  }

  function remove(id, name) {
    if (confirm(`delete "${name}"?`)) {
      api.deleteCategory(id).then(() => { load(); toast("deleted", { type: "success" }); });
    }
  }

  function bulkRemove() {
    api.bulkDelete("categories", [...selectedIds]).then(() => {
      load(); clearSelection(); setConfirmOpen(false); toast("deleted", { type: "success" });
    });
  }

  const gc = (c) => locale === "ar" ? (c.name || c.name_en) : (c.name_en || c.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("categories.title")}</h2>
          <p className="text-muted-foreground">{t("categories.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4 ml-1" />{t("common.delete")} ({selectedCount})</Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")} title={viewMode === "table" ? "Card view" : "Table view"}>
            {viewMode === "table" ? <LayoutGrid className="h-4 w-4" /> : <TableIcon className="h-4 w-4" />}
          </Button>
          <ExportButtons data={categories} columns={[
            { key: "name", label: t("common.name") },
            { key: "name_en", label: "English Name" },
          ]} filename="categories" title={t("categories.title")} />
          <Button onClick={openAdd}><Plus className="h-4 w-4 ml-2" />{t("categories.add")}</Button>
        </div>
      </div>

      {viewMode === "table" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" className="h-4 w-4" checked={isAllSelected} onChange={handleSelectAll} />
                  </TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead>{t("categories.nameEn")}</TableHead>
                  <TableHead>حساب الإيراد</TableHead>
                  <TableHead>حساب التكلفة</TableHead>
                  <TableHead>حساب المخزون</TableHead>
                  <TableHead className="w-24">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">{t("common.noData")}</TableCell></TableRow>
                ) : categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(c.id)} onChange={() => handleSelect(c.id)} />
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color || '#6366f1' }} />
                        {gc(c)}
                      </span>
                    </TableCell>
                    <TableCell>{c.name_en || c.name || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.revenue_account_code ? `${c.revenue_account_code} - ${locale === "ar" ? (c.revenue_account_name || c.revenue_account_name_en) : (c.revenue_account_name_en || c.revenue_account_name)}` : "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.cogs_account_code ? `${c.cogs_account_code} - ${locale === "ar" ? (c.cogs_account_name || c.cogs_account_name_en) : (c.cogs_account_name_en || c.cogs_account_name)}` : "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.inventory_account_code ? `${c.inventory_account_code} - ${locale === "ar" ? (c.inventory_account_name || c.inventory_account_name_en) : (c.inventory_account_name_en || c.inventory_account_name)}` : "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(c.id, gc(c))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-8">{t("common.noData")}</div>
          ) : categories.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="h-1.5" style={{ backgroundColor: c.color || '#6366f1' }} />
              <CardContent className="p-4">
                <div className="flex justify-end mb-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(c.id, gc(c))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                <p className="font-semibold truncate">{gc(c)}</p>
                {c.name_en && <p className="text-sm text-muted-foreground truncate">{c.name_en}</p>}
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {c.revenue_account_code && <p>إيراد: {c.revenue_account_code}</p>}
                  {c.cogs_account_code && <p>تكلفة: {c.cogs_account_code}</p>}
                  {c.inventory_account_code && <p>مخزون: {c.inventory_account_code}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editItem ? t("categories.edit") : t("categories.add")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>{t("common.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>{t("categories.nameEn")}</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
          <div>
            <Label>Color</Label>
            <div className="flex items-center gap-3 mt-1">
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-9 rounded cursor-pointer border" />
              <span className="text-sm font-mono">{form.color}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>حساب الإيراد</Label>
              <Combobox value={form.revenue_account_id} onChange={(e) => setForm({ ...form, revenue_account_id: e.target.value })} placeholder="اختر...">
                <option value="">اختر...</option>
                {accounts.filter((a) => a.type === "income").map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                ))}
              </Combobox>
            </div>
            <div>
              <Label>حساب تكلفة المبيعات</Label>
              <Combobox value={form.cogs_account_id} onChange={(e) => setForm({ ...form, cogs_account_id: e.target.value })} placeholder="اختر...">
                <option value="">اختر...</option>
                {accounts.filter((a) => a.type === "expense").map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                ))}
              </Combobox>
            </div>
            <div>
              <Label>حساب المخزون</Label>
              <Combobox value={form.inventory_account_id} onChange={(e) => setForm({ ...form, inventory_account_id: e.target.value })} placeholder="اختر...">
                <option value="">اختر...</option>
                {accounts.filter((a) => a.type === "asset").map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                ))}
              </Combobox>
            </div>
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
        message={`Delete ${selectedCount} selected categories?`}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
