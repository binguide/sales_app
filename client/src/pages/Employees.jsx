import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useBulkSelect } from "@/lib/useBulkSelect";
import { useSort } from "@/lib/useSort";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ArrowUpDown, Users, BookOpen } from "lucide-react";
import { fn } from "@/lib/format";
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

export default function Employees() {
  const { t, locale } = useI18n();
  const [employees, setEmployees] = useState([]);
  const { sorted, toggle, getIndicator } = useSort(employees, "name");
  const [accounts, setAccounts] = useState([]);
  const [editData, setEditData] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount } = useBulkSelect(employees);

  useEffect(() => { load(); }, []);

  function load() { api.getEmployees().then(setEmployees); api.getAccounts(true).then(setAccounts); }

  function openAdd() {
    setEditData({ name: "", name_en: "", phone: "", email: "", salary: "", role: "", address: "", national_id: "", salary_account_id: "" });
    setDialogOpen(true);
  }

  function openEdit(emp) {
    setEditData({ ...emp, salary: String(emp.salary || "0"), salary_account_id: String(emp.salary_account_id || "") });
    setDialogOpen(true);
  }

  function save() {
    if (!editData.name) return toast(t("common.error"));
    const data = {
      name: editData.name,
      name_en: editData.name_en || null,
      phone: editData.phone || null,
      email: editData.email || null,
      salary: parseFloat(editData.salary) || 0,
      role: editData.role || null,
      address: editData.address || null,
      national_id: editData.national_id || null,
      salary_account_id: editData.salary_account_id ? parseInt(editData.salary_account_id) : null,
      is_active: editData.is_active != null ? editData.is_active : 1,
    };
    const promise = editData.id
      ? api.updateEmployee(editData.id, data)
      : api.addEmployee(data);
    promise.then(() => {
      toast(editData.id ? t("common.saved") : t("common.saved"), { type: "success" });
      setDialogOpen(false);
      load();
    });
  }

  function remove(id, name) {
    if (!confirm(`${t("common.confirm")} ${name}?`)) return;
    api.deleteEmployee(id).then(() => { load(); });
  }

  function bulkRemove() {
    api.bulkDelete("employees", [...selectedIds]).then(() => {
      load(); clearSelection(); setConfirmOpen(false); toast("deleted", { type: "success" });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("employees.title")}</h2>
          <p className="text-muted-foreground">{t("employees.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4 ml-1" />{t("common.delete")} ({selectedCount})</Button>
          )}
          <ExportButtons data={sorted} columns={[
            { key: "name", label: t("common.name") },
            { key: "role", label: t("employees.role") },
            { key: "phone", label: t("common.phone") },
            { key: "salary", label: t("employees.salary"), format: "number" },
            { key: "is_active", label: t("common.status") },
          ]} filename="employees" title={t("employees.title")} />
          <Button onClick={openAdd}><Plus className="h-4 w-4 ml-2" />{t("employees.add")}</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input type="checkbox" className="h-4 w-4" checked={isAllSelected} onChange={handleSelectAll} />
              </TableHead>
              <Th sortKey="name" toggle={toggle} indicator={getIndicator}>{t("common.name")}</Th>
              <Th sortKey="role" toggle={toggle} indicator={getIndicator}>{t("employees.role")}</Th>
              <Th sortKey="phone" toggle={toggle} indicator={getIndicator}>{t("common.phone")}</Th>
              <Th sortKey="salary" toggle={toggle} indicator={getIndicator}>{t("employees.salary")}</Th>
              <Th sortKey="is_active" toggle={toggle} indicator={getIndicator}>{t("common.status")}</Th>
              <TableHead className="text-start">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
            ) : sorted.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell>
                  <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(emp.id)} onChange={() => handleSelect(emp.id)} />
                </TableCell>
                <TableCell className="font-medium">{locale === "ar" ? (emp.name || emp.name_en) : (emp.name_en || emp.name)}</TableCell>
                <TableCell>{emp.role || "-"}</TableCell>
                <TableCell dir="ltr">{emp.phone || "-"}</TableCell>
                <TableCell>{emp.salary > 0 ? fn(emp.salary) : "-"}</TableCell>
                <TableCell>
                  <Badge variant={emp.is_active ? "success" : "destructive"}>
                    {emp.is_active ? (t("employees.active") || "نشط") : (t("employees.inactive") || "غير نشط")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(emp.id, emp.name)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="h-5 w-5" />{editData?.id ? t("employees.edit") : t("employees.add")}</DialogTitle>
          </DialogHeader>
          {editData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("common.name")}</Label>
                  <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} />
                </div>
                <div>
                  <Label>{locale === "ar" ? "الاسم (إنجليزي)" : "Name (English)"}</Label>
                  <Input value={editData.name_en} onChange={(e) => setEditData({ ...editData, name_en: e.target.value })} />
                </div>
                <div>
                  <Label>{t("employees.role")}</Label>
                  <Input value={editData.role} onChange={(e) => setEditData({ ...editData, role: e.target.value })} />
                </div>
                <div>
                  <Label>{t("employees.salary")}</Label>
                  <Input type="number" value={editData.salary} onChange={(e) => setEditData({ ...editData, salary: e.target.value })} min="0" step="0.01" />
                </div>
                <div>
                  <Label>{t("common.phone")}</Label>
                  <Input value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
                </div>
                <div>
                  <Label>البريد الإلكتروني</Label>
                  <Input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} />
                </div>
                <div>
                  <Label>{t("employees.nationalId") || "رقم الهوية"}</Label>
                  <Input value={editData.national_id} onChange={(e) => setEditData({ ...editData, national_id: e.target.value })} />
                </div>
                <div>
                  <Label>{t("employees.status") || "الحالة"}</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={editData.is_active ? "1" : "0"}
                    onChange={(e) => setEditData({ ...editData, is_active: e.target.value === "1" })}
                  >
                    <option value="1">{t("employees.active") || "نشط"}</option>
                    <option value="0">{t("employees.inactive") || "غير نشط"}</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>{t("warehouses.location")}</Label>
                <Input value={editData.address} onChange={(e) => setEditData({ ...editData, address: e.target.value })} />
              </div>
              <div>
                <Label>{t("employees.salaryAccount") || "حساب الراتب"}</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={editData.salary_account_id} onChange={(e) => setEditData({ ...editData, salary_account_id: e.target.value })}
                >
                  <option value="">-</option>
                  {accounts.filter((a) => a.is_leaf).map((a) => (
                    <option key={a.id} value={a.id}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
                <Button onClick={save}>{t("common.save")}</Button>
              </div>
            </div>
          )}
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        message={`Delete ${selectedCount} selected employees?`}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
