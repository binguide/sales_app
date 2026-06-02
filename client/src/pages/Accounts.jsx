import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronDown, ChevronLeft, FolderOpen } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import ExportButtons from "@/components/ExportButtons";

const typeLabels = {
  asset: "أصل",
  liability: "خصم",
  equity: "حق ملكية",
  income: "إيراد",
  expense: "مصروف",
};

const typeColors = {
  asset: "bg-blue-100 text-blue-700",
  liability: "bg-orange-100 text-orange-700",
  equity: "bg-purple-100 text-purple-700",
  income: "bg-green-100 text-green-700",
  expense: "bg-red-100 text-red-700",
};

export default function Accounts() {
  const { t, locale } = useI18n();
  const [accounts, setAccounts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({
    code: "", name: "", name_en: "", type: "asset", parent_id: "", is_active: "1", description: "",
  });
  const [expanded, setExpanded] = useState({});

  useEffect(() => { api.getAccounts().then(setAccounts); }, []);

  function openAdd(parentId) {
    setEditItem(null);
    setForm({ code: "", name: "", name_en: "", type: "asset", parent_id: parentId || "", is_active: "1", description: "" });
    setDialogOpen(true);
  }

  function openEdit(a) {
    setEditItem(a);
    setForm({
      code: a.code, name: a.name, name_en: a.name_en || "", type: a.type,
      parent_id: a.parent_id ? String(a.parent_id) : "", is_active: String(a.is_active), description: a.description || "",
    });
    setDialogOpen(true);
  }

  function save() {
    if (!form.code || !form.name) return toast(t("common.codeNameRequired"), { type: "error" });
    const payload = { ...form, parent_id: form.parent_id ? parseInt(form.parent_id) : null, is_active: form.is_active === "1" };
    const action = editItem
      ? api.updateAccount(editItem.id, payload)
      : api.addAccount(payload);
    action.then(() => { api.getAccounts().then(setAccounts); setDialogOpen(false); toast("ok", { type: "success" }); })
      .catch(() => toast("خطأ في الحفظ", { type: "error" }));
  }

  function remove(id, name) {
    if (confirm(`delete account "${name}"?`)) {
      api.deleteAccount(id).then(() => { api.getAccounts().then(setAccounts); toast("ok", { type: "success" }); });
    }
  }

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const childrenMap = {};
  for (const a of accounts) {
    if (a.parent_id) {
      if (!childrenMap[a.parent_id]) childrenMap[a.parent_id] = [];
      childrenMap[a.parent_id].push(a);
    }
  }

  function renderTree(parentId, depth = 0) {
    return accounts
      .filter((a) => a.parent_id === parentId)
      .flatMap((a) => {
        const hasChildren = childrenMap[a.id]?.length > 0;
        const isExpanded = expanded[a.id];
        const rows = [
          <TableRow key={a.id}>
            <TableCell className="font-mono text-xs">{a.code}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1" style={{ paddingInlineStart: `${depth * 20}px` }}>
                {hasChildren ? (
                  <button onClick={() => toggleExpand(a.id)} className="p-0.5 hover:bg-accent rounded">
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                  </button>
                ) : <span className="w-5" />}
                <span className="font-medium">{locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</span>
              </div>
            </TableCell>
            <TableCell><Badge className={typeColors[a.type] + " border-0"}>{typeLabels[a.type]}</Badge></TableCell>
            <TableCell>
              {a.is_leaf ? (
                <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-600">فرعي</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">رئيسي</Badge>
              )}
            </TableCell>
            <TableCell>
              {a.is_active ? (
                <Badge variant="success" className="text-[10px]">نشط</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">غير نشط</Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openAdd(a.id)} title="إضافة حساب فرعي"><Plus className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(a.id, a.name)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </TableCell>
          </TableRow>
        ];
        if (hasChildren && isExpanded) {
          rows.push(renderTree(a.id, depth + 1));
        }
        return rows;
      });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">شجرة الحسابات</h2>
          <p className="text-muted-foreground">دليل الحسابات المحاسبي</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons data={accounts} columns={[
            { key: "code", label: "الكود" },
            { key: "name", label: "الاسم" },
            { key: "type", label: "النوع" },
          ]} filename="chart-of-accounts" title="شجرة الحسابات" />
          <Button onClick={() => openAdd(null)}><Plus className="h-4 w-4 ml-2" />إضافة حساب</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-lg flex items-center gap-2"><FolderOpen className="h-4 w-4" />شجرة الحسابات</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">الكود</TableHead>
                <TableHead>الاسم</TableHead>
                <TableHead className="w-28">النوع</TableHead>
                <TableHead className="w-20">التصنيف</TableHead>
                <TableHead className="w-20">الحالة</TableHead>
                <TableHead className="w-36">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.filter((a) => !a.parent_id).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد حسابات. أضف حساباً جديداً.</TableCell></TableRow>
              ) : renderTree(null)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader><DialogTitle>{editItem ? "تعديل حساب" : "إضافة حساب"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>كود الحساب</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="1-1-1" dir="ltr" className="font-mono" />
            </div>
            <div>
              <Label>النوع</Label>
              <Combobox value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="asset">أصل</option>
                <option value="liability">خصم</option>
                <option value="equity">حق ملكية</option>
                <option value="income">إيراد</option>
                <option value="expense">مصروف</option>
              </Combobox>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>الاسم (عربي)</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>الاسم (إنجليزي)</Label>
              <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>الحساب الأب</Label>
              <Combobox value={form.parent_id} onChange={(e) => setForm({ ...form, parent_id: e.target.value })} placeholder="لا يوجد (جذر)">
                <option value="">لا يوجد (جذر)</option>
                {accounts.map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                ))}
              </Combobox>
            </div>
            <div>
              <Label>الحالة</Label>
              <Combobox value={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.value })}>
                <option value="1">نشط</option>
                <option value="0">غير نشط</option>
              </Combobox>
            </div>
          </div>
          <div>
            <Label>وصف</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button onClick={save}>{editItem ? t("common.save") : t("common.add")}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}