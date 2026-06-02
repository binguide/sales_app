import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useBulkSelect } from "@/lib/useBulkSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, LayoutGrid, Table as TableIcon } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import ExportButtons from "@/components/ExportButtons";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Warehouses() {
  const { t, locale } = useI18n();
  const [warehouses, setWarehouses] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ name: "", name_en: "", location: "" });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState("cards");
  const { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount } = useBulkSelect(warehouses);

  useEffect(() => { load(); }, []);

  function load() { api.getWarehouses().then(setWarehouses); }

  function openAdd() { setEditItem(null); setForm({ name: "", name_en: "", location: "" }); setDialogOpen(true); }
  function openEdit(w) { setEditItem(w); setForm({ name: w.name, name_en: w.name_en || "", location: w.location || "" }); setDialogOpen(true); }

  function save() {
    if (!form.name) return toast(t("common.nameRequired"), { type: "error" });
    const action = editItem ? api.updateWarehouse(editItem.id, form) : api.addWarehouse(form);
    action.then(() => { load(); setDialogOpen(false); toast("ok", { type: "success" }); });
  }

  function remove(id) {
    if (confirm(`delete?`)) {
      api.deleteWarehouse(id).then(() => { load(); toast("deleted", { type: "success" }); });
    }
  }

  function bulkRemove() {
    api.bulkDelete("warehouses", [...selectedIds]).then(() => {
      load(); clearSelection(); setConfirmOpen(false); toast("deleted", { type: "success" });
    });
  }

  const gw = (w) => locale === "ar" ? (w.name || w.name_en) : (w.name_en || w.name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("warehouses.title")}</h2>
          <p className="text-muted-foreground">{t("warehouses.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4 ml-1" />{t("common.delete")} ({selectedCount})</Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")} title={viewMode === "table" ? "Card view" : "Table view"}>
            {viewMode === "table" ? <LayoutGrid className="h-4 w-4" /> : <TableIcon className="h-4 w-4" />}
          </Button>
          <ExportButtons data={warehouses} columns={[
            { key: "name", label: t("common.name") },
            { key: "name_en", label: "English Name" },
            { key: "location", label: t("warehouses.location") },
          ]} filename="warehouses" title={t("warehouses.title")} />
          <Button onClick={openAdd}><Plus className="h-4 w-4 ml-2" />{t("warehouses.add")}</Button>
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
                  <TableHead>{t("warehouses.nameEn")}</TableHead>
                  <TableHead>{t("warehouses.location")}</TableHead>
                  <TableHead className="w-24">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">{t("common.noData")}</TableCell></TableRow>
                ) : warehouses.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(w.id)} onChange={() => handleSelect(w.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{gw(w)}</TableCell>
                    <TableCell>{w.name_en || w.name || "-"}</TableCell>
                    <TableCell>{w.location || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(w)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(w.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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
          {warehouses.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-8">{t("common.noData")}</div>
          ) : warehouses.map((w) => (
            <Card key={w.id}>
              <CardContent className="p-4">
                <div className="flex justify-end mb-3">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(w.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
                <p className="font-semibold truncate">{gw(w)}</p>
                {w.name_en && <p className="text-sm text-muted-foreground truncate">{w.name_en}</p>}
                {w.location && <p className="text-sm text-muted-foreground truncate">{w.location}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editItem ? t("warehouses.edit") : t("warehouses.add")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("common.name")}</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{t("warehouses.nameEn")}</Label><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></div>
          </div>
          <div><Label>{t("warehouses.location")}</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={save}>{editItem ? t("common.save") : t("common.add")}</Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        message={`Delete ${selectedCount} selected warehouses?`}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
