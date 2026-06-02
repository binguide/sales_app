import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useBulkSelect } from "@/lib/useBulkSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Eye, BookOpen, Scale, ArrowRight, Check } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { fn } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";
import ConfirmDialog from "@/components/ConfirmDialog";

function LineRow({ item, idx, accounts, locale, onChange, onRemove, disabled }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
      <TableCell>
        <Combobox value={String(item.account_id)} onChange={(e) => onChange(idx, "account_id", e.target.value)} disabled={disabled} placeholder="-- اختر --">
          <option value="">-- اختر --</option>
          {accounts.map((a) => (
            <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
          ))}
        </Combobox>
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" min="0" value={item.debit}
          onChange={(e) => onChange(idx, "debit", e.target.value)}
          className="font-mono text-xs text-start" dir="ltr" disabled={disabled} />
      </TableCell>
      <TableCell>
        <Input type="number" step="0.01" min="0" value={item.credit}
          onChange={(e) => onChange(idx, "credit", e.target.value)}
          className="font-mono text-xs text-start" dir="ltr" disabled={disabled} />
      </TableCell>
      <TableCell>
        <Input value={item.description} onChange={(e) => onChange(idx, "description", e.target.value)} placeholder="بيان" disabled={disabled} />
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" disabled={disabled} onClick={() => onRemove(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
      </TableCell>
    </TableRow>
  );
}

export default function JournalEntries() {
  const { t, locale } = useI18n();
  const j = (k) => t("journal." + k);
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [mode, setMode] = useState("list");
  const [viewEntry, setViewEntry] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount } = useBulkSelect(entries);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    description_en: "",
    reference: "",
    items: [
      { account_id: "", debit: "", credit: "", description: "" },
      { account_id: "", debit: "", credit: "", description: "" },
    ],
  });

  useEffect(() => { load(); }, []);

  function load() {
    api.getJournalEntries().then(setEntries);
    api.getAccounts(true).then(setAccounts);
  }

  function totalDebit() {
    return form.items.reduce((s, i) => s + (parseFloat(i.debit) || 0), 0);
  }
  function totalCredit() {
    return form.items.reduce((s, i) => s + (parseFloat(i.credit) || 0), 0);
  }
  function isBalanced() {
    return form.items.length >= 2 && Math.abs(totalDebit() - totalCredit()) < 0.001;
  }

  function addLine() {
    setForm({ ...form, items: [...form.items, { account_id: "", debit: "", credit: "", description: "" }] });
  }

  function removeLine(idx) {
    if (form.items.length <= 2) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  }

  function updateLine(idx, field, value) {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, items });
  }

  function save() {
    if (!form.description) return toast("الرجاء إدخال البيان", { type: "error" });
    if (form.items.length < 2) return toast(j("errorMinLines"), { type: "error" });
    if (!isBalanced()) return toast(j("errorBalance"), { type: "error" });
    api.addJournalEntry({
      date: form.date,
      description: form.description,
      description_en: form.description_en || null,
      reference: form.reference || null,
      items: form.items.map((i) => ({
        account_id: parseInt(i.account_id),
        debit: parseFloat(i.debit) || 0,
        credit: parseFloat(i.credit) || 0,
        description: i.description || null,
      })),
    }).then(() => {
      toast(j("saved"), { type: "success" });
      cancelForm();
    }).catch(() => toast("خطأ في الحفظ", { type: "error" }));
  }

  function cancelForm() {
    setMode("list");
    load();
  }

  function remove(id) {
    if (confirm("حذف قيد اليومية؟")) {
      api.deleteJournalEntry(id).then(() => {
        load();
        toast("تم الحذف", { type: "success" });
      });
    }
  }

  function bulkRemove() {
    api.bulkDelete("journal-entries", [...selectedIds]).then(() => {
      load(); clearSelection(); setConfirmOpen(false); toast("تم الحذف", { type: "success" });
    });
  }

  function viewDetails(entry) {
    api.getJournalEntry(entry.id).then(setViewEntry);
  }

  function startNew() {
    setForm({
      date: new Date().toISOString().split("T")[0],
      description: "", description_en: "", reference: "",
      items: [
        { account_id: "", debit: "", credit: "", description: "" },
        { account_id: "", debit: "", credit: "", description: "" },
      ],
    });
    setViewEntry(null);
    setMode("form");
  }

  if (mode === "form") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={cancelForm}><ArrowRight className="h-5 w-5" /></Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{j("add")}</h2>
              <p className="text-muted-foreground">{j("subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelForm}>{t("common.cancel")}</Button>
            <Button onClick={save} disabled={!isBalanced()}><Check className="h-4 w-4 ml-1" />{t("common.save")}</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>{j("date")}</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div>
            <Label>{j("reference")}</Label>
            <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="مثال: INV-001" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>{j("description")}</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="بيان القيد" />
          </div>
          <div>
            <Label>{j("description")} (English)</Label>
            <Input value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} placeholder="Entry description" />
          </div>
        </div>

        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />{j("items")}</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5 ml-1" />{j("addLine")}</Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-5">#</TableHead>
                  <TableHead>{j("account")}</TableHead>
                  <TableHead className="w-28">{j("debit")}</TableHead>
                  <TableHead className="w-28">{j("credit")}</TableHead>
                  <TableHead>{t("common.description")}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.items.map((item, idx) => (
                  <LineRow key={idx} item={item} idx={idx} accounts={accounts} locale={locale}
                    onChange={updateLine} onRemove={removeLine} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-6 p-4 bg-muted/30 rounded-lg border">
          <span className="flex items-center gap-2 text-sm">
            {j("totalDebit")}: <strong className="font-mono text-base">{fn(totalDebit())}</strong>
          </span>
          <span className="flex items-center gap-2 text-sm">
            {j("totalCredit")}: <strong className="font-mono text-base">{fn(totalCredit())}</strong>
          </span>
          <span className="flex items-center gap-2">
            <Scale className={`h-5 w-5 ${isBalanced() ? "text-green-600" : "text-destructive"}`} />
            <strong className={`text-sm ${isBalanced() ? "text-green-600" : "text-destructive"}`}>
              {isBalanced() ? j("balanced") : j("notBalanced")}
            </strong>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{j("title")}</h2>
          <p className="text-muted-foreground">{j("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4 ml-1" />{t("common.delete")} ({selectedCount})</Button>
          )}
          <ExportButtons data={entries} columns={[
            { key: "id", label: "#", format: "int" },
            { key: "date", label: j("date") },
            { key: "description", label: j("description") },
            { key: "reference", label: j("reference") },
            { key: "total_debit", label: j("totalDebit"), format: "number" },
            { key: "total_credit", label: j("totalCredit"), format: "number" },
          ]} filename="journal-entries" title={j("title")} />
          <Button onClick={startNew}><Plus className="h-4 w-4 ml-2" />{j("add")}</Button>
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
                <TableHead className="w-16">#</TableHead>
                <TableHead>{j("date")}</TableHead>
                <TableHead>{j("description")}</TableHead>
                <TableHead>{j("reference")}</TableHead>
                <TableHead className="text-center">{j("balance")}</TableHead>
                <TableHead className="text-start">{j("totalDebit")}</TableHead>
                <TableHead className="text-start">{j("totalCredit")}</TableHead>
                <TableHead className="w-24">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
              ) : entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(e.id)} onChange={() => handleSelect(e.id)} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{e.id}</TableCell>
                  <TableCell>{e.date}</TableCell>
                  <TableCell className="max-w-xs truncate">{locale === "ar" ? (e.description || e.description_en) : (e.description_en || e.description)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{e.reference || "-"}</TableCell>
                  <TableCell className="text-center">
                    {Math.abs(e.total_debit - e.total_credit) < 0.001 ? (
                      <Badge variant="success" className="text-[10px]">{j("balanced")}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive">{j("notBalanced")}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{fn(e.total_debit)}</TableCell>
                  <TableCell className="font-mono text-xs">{fn(e.total_credit)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => viewDetails(e)} title={j("view")}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {viewEntry && (
        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" />{j("entryNum")} #{viewEntry.id}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setViewEntry(null)}>{t("common.close")}</Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-sm mb-4">
              <div><span className="text-muted-foreground">{j("date")}:</span> {viewEntry.date}</div>
              <div><span className="text-muted-foreground">{j("reference")}:</span> {viewEntry.reference || "-"}</div>
              <div className="col-span-3"><span className="text-muted-foreground">{j("description")}:</span> {locale === "ar" ? (viewEntry.description || viewEntry.description_en) : (viewEntry.description_en || viewEntry.description)}</div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-5">#</TableHead>
                  <TableHead>{j("account")}</TableHead>
                  <TableHead className="w-28">{j("debit")}</TableHead>
                  <TableHead className="w-28">{j("credit")}</TableHead>
                  <TableHead>{t("common.description")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewEntry.items.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{item.account_code}</span>{" "}
                      {locale === "ar" ? (item.account_name || item.account_name_en) : (item.account_name_en || item.account_name)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.debit > 0 ? fn(item.debit) : "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{item.credit > 0 ? fn(item.credit) : "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.description || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-end gap-6 mt-4 text-sm">
              <span>{j("totalDebit")}: <strong className="font-mono">{fn(viewEntry.items.reduce((s, i) => s + i.debit, 0))}</strong></span>
              <span>{j("totalCredit")}: <strong className="font-mono">{fn(viewEntry.items.reduce((s, i) => s + i.credit, 0))}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        message={`Delete ${selectedCount} selected journal entries?`}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
