import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useBulkSelect } from "@/lib/useBulkSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import ExportButtons from "@/components/ExportButtons";
import ConfirmDialog from "@/components/ConfirmDialog";

const unitCategories = ["count", "weight", "volume", "length"];

export default function Units() {
  const { t, locale } = useI18n();
  const [units, setUnits] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", name_en: "", abbreviation: "", abbreviation_en: "", category: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount } = useBulkSelect(units);

  useEffect(() => { load(); }, []);

  function load() { api.getUnits().then(setUnits); }

  function openAdd() { setEditItem(null); setForm({ name: "", name_en: "", abbreviation: "", abbreviation_en: "", category: "" }); setDialogOpen(true); }

  function openEdit(u) {
    setEditItem(u);
    setForm({ name: u.name, name_en: u.name_en || "", abbreviation: u.abbreviation || "", abbreviation_en: u.abbreviation_en || "", category: u.category || "" });
    setDialogOpen(true);
  }

  function save() {
    if (!form.name) return toast(t("common.nameRequired"), { type: "error" });
    const body = { ...form, category: form.category || null };
    const action = editItem ? api.updateUnit(editItem.id, body) : api.addUnit(body);
    action.then(() => { load(); setDialogOpen(false); toast("ok", { type: "success" }); })
      .catch((err) => { toast(err.message || "Error", { type: "error" }); });
  }

  function remove(id, name) {
    if (confirm(`delete "${name}"?`)) {
      api.deleteUnit(id).then(() => { load(); toast("deleted", { type: "success" }); });
    }
  }

  function bulkRemove() {
    api.bulkDelete("units", [...selectedIds]).then(() => {
      load(); clearSelection(); setConfirmOpen(false); toast("deleted", { type: "success" });
    });
  }

  const getName = (u) => locale === "ar" ? (u.name || u.name_en) : (u.name_en || u.name);
  const getAbbr = (u) => locale === "ar" ? (u.abbreviation || u.abbreviation_en) : (u.abbreviation_en || u.abbreviation);
  const catLabel = (cat) => cat ? t(`units.categories.${cat}`) : "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("units.title")}</h2>
          <p className="text-muted-foreground">{t("units.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4 ml-1" />{t("common.delete")} ({selectedCount})</Button>
          )}
          <ExportButtons data={units} columns={[
            { key: "name", label: t("common.name") },
            { key: "name_en", label: t("units.nameEn") },
            { key: "abbreviation", label: t("units.abbreviation") },
            { key: "category", label: t("units.category") },
          ]} filename="units" title={t("units.title")} />
          <Button onClick={openAdd}><Plus className="h-4 w-4 ml-2" />{t("units.add")}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" className="h-4 w-4" checked={isAllSelected} onChange={handleSelectAll} />
                </TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("units.nameEn")}</TableHead>
                <TableHead>{t("units.abbreviation")}</TableHead>
                <TableHead>{t("units.category")}</TableHead>
                <TableHead className="w-24">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">{t("common.noData")}</TableCell></TableRow>
              ) : units.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(u.id)} onChange={() => handleSelect(u.id)} />
                  </TableCell>
                  <TableCell className="font-medium">{getName(u)}</TableCell>
                  <TableCell>{u.name_en || u.name || "-"}</TableCell>
                  <TableCell>{getAbbr(u) || "-"}</TableCell>
                  <TableCell>{catLabel(u.category)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(u.id, getName(u))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editItem ? t("units.edit") : t("units.add")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("common.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{t("units.nameEn")}</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("units.abbreviation")}</Label><Input value={form.abbreviation} onChange={(e) => setForm({ ...form, abbreviation: e.target.value })} /></div>
            <div><Label>{t("units.abbreviation")} (English)</Label><Input value={form.abbreviation_en} onChange={(e) => setForm({ ...form, abbreviation_en: e.target.value })} /></div>
          </div>
          <div>
            <Label>{t("units.category")}</Label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">-</option>
              {unitCategories.map((cat) => (
                <option key={cat} value={cat}>{t(`units.categories.${cat}`)}</option>
              ))}
            </select>
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
        message={`Delete ${selectedCount} selected items?`}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
