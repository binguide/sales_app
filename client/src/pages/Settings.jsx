import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, DollarSign, Percent, Warehouse, CreditCard, Store } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function Settings() {
  const { t, locale } = useI18n();
  const [currencies, setCurrencies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [posProfiles, setPosProfiles] = useState([]);
  const [settings, setSettings] = useState({ default_tax_rate: "15" });
  const [currDialog, setCurrDialog] = useState(false);
  const [editCurr, setEditCurr] = useState(null);
  const [currForm, setCurrForm] = useState({ code: "", name: "", name_en: "", symbol: "", rate: "1" });
  const [pmDialog, setPmDialog] = useState(false);
  const [editPm, setEditPm] = useState(null);
  const [pmForm, setPmForm] = useState({ name: "", name_en: "", account_id: "" });
  const [profileDialog, setProfileDialog] = useState(false);
  const [editProfile, setEditProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: "", name_en: "", warehouse_id: "", payment_method_id: "", currency_id: "", customer_id: "", show_categories: true, show_search: true, is_default: false });

  useEffect(() => {
    api.getCurrencies().then(setCurrencies);
    api.getWarehouses().then(setWarehouses);
    api.getPaymentMethods().then(setPaymentMethods);
    api.getSettings().then(setSettings);
    api.getAccounts(true).then(setAccounts);
    api.getCustomers().then(setCustomers);
    api.getPosProfiles().then(setPosProfiles);
  }, []);

  function saveTax(val) {
    const v = parseFloat(val) || 0;
    setSettings({ ...settings, default_tax_rate: String(v) });
    api.updateSettings({ default_tax_rate: String(v) }).then(() => toast(t("common.save"), { type: "success" }));
  }

  function saveDefaultWarehouse(val) {
    setSettings({ ...settings, default_warehouse: val });
    api.updateSettings({ default_warehouse: val }).then(() => toast(t("common.save"), { type: "success" }));
  }

  function openAddCurr() {
    setEditCurr(null);
    setCurrForm({ code: "", name: "", name_en: "", symbol: "", rate: "1" });
    setCurrDialog(true);
  }

  function openEditCurr(c) {
    setEditCurr(c);
    setCurrForm({ code: c.code, name: c.name, name_en: c.name_en || "", symbol: c.symbol, rate: String(c.rate) });
    setCurrDialog(true);
  }

  function saveCurr() {
    if (!currForm.code) return toast(t("common.fieldRequired"), { type: "error" });
    const action = editCurr
      ? api.updateCurrency(editCurr.id, { ...currForm, rate: parseFloat(currForm.rate) || 1 })
      : api.addCurrency({ ...currForm, rate: parseFloat(currForm.rate) || 1 });
    action.then(() => { api.getCurrencies().then(setCurrencies); setCurrDialog(false); toast("ok", { type: "success" }); });
  }

  function deleteCurr(id) {
    if (confirm("Delete?")) {
      api.deleteCurrency(id).then(() => { api.getCurrencies().then(setCurrencies); toast("ok", { type: "success" }); });
    }
  }

  function setMain(id) {
    const c = currencies.find(c => c.id === id);
    if (!c) return;
    api.updateCurrency(id, { code: c.code, name: c.name, name_en: c.name_en, symbol: c.symbol, rate: c.rate, is_main: 1 })
      .then(() => api.getCurrencies().then(setCurrencies));
  }

  function openAddPm() {
    setEditPm(null);
    setPmForm({ name: "", name_en: "", account_id: "" });
    setPmDialog(true);
  }

  function openEditPm(pm) {
    setEditPm(pm);
    setPmForm({ name: pm.name, name_en: pm.name_en || "", account_id: pm.account_id ? String(pm.account_id) : "" });
    setPmDialog(true);
  }

  function savePm() {
    if (!pmForm.name) return toast(t("common.nameRequired"), { type: "error" });
    const data = { name: pmForm.name, name_en: pmForm.name_en, account_id: pmForm.account_id ? parseInt(pmForm.account_id) : null };
    const action = editPm
      ? api.updatePaymentMethod(editPm.id, data)
      : api.addPaymentMethod(data);
    action.then(() => { api.getPaymentMethods().then(setPaymentMethods); setPmDialog(false); toast("ok", { type: "success" }); });
  }

  function deletePm(id) {
    if (confirm("Delete?")) {
      api.deletePaymentMethod(id).then(() => { api.getPaymentMethods().then(setPaymentMethods); toast("ok", { type: "success" }); });
    }
  }

  function openAddProfile() {
    setEditProfile(null);
    setProfileForm({ name: "", name_en: "", warehouse_id: "", payment_method_id: "", currency_id: "", customer_id: "", show_categories: true, show_search: true, is_default: false });
    setProfileDialog(true);
  }

  function openEditProfile(p) {
    setEditProfile(p);
    setProfileForm({
      name: p.name,
      name_en: p.name_en || "",
      warehouse_id: p.warehouse_id ? String(p.warehouse_id) : "",
      payment_method_id: p.payment_method_id ? String(p.payment_method_id) : "",
      currency_id: p.currency_id ? String(p.currency_id) : "",
      customer_id: p.customer_id ? String(p.customer_id) : "",
      show_categories: !!p.show_categories,
      show_search: !!p.show_search,
      is_default: !!p.is_default,
    });
    setProfileDialog(true);
  }

  function saveProfile() {
    if (!profileForm.name) return toast(t("common.nameRequired"), { type: "error" });
    const data = {
      ...profileForm,
      warehouse_id: profileForm.warehouse_id ? parseInt(profileForm.warehouse_id) : null,
      payment_method_id: profileForm.payment_method_id ? parseInt(profileForm.payment_method_id) : null,
      currency_id: profileForm.currency_id ? parseInt(profileForm.currency_id) : null,
      customer_id: profileForm.customer_id ? parseInt(profileForm.customer_id) : null,
    };
    const action = editProfile
      ? api.updatePosProfile(editProfile.id, data)
      : api.addPosProfile(data);
    action.then(() => { api.getPosProfiles().then(setPosProfiles); setProfileDialog(false); toast("ok", { type: "success" }); });
  }

  function deleteProfile(id) {
    if (confirm("Delete?")) {
      api.deletePosProfile(id).then(() => { api.getPosProfiles().then(setPosProfiles); toast("ok", { type: "success" }); });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t("settings.title")}</h2>
        <p className="text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Tax Settings */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Percent className="h-4 w-4" />{t("settings.tax")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{t("settings.defaultTax")}</Label>
              <Input type="number" value={settings.default_tax_rate || "0"}
                onChange={(e) => saveTax(e.target.value)}
                className="text-lg font-bold w-32" min="0" max="100" step="0.01" />
            </div>
            <p className="text-xs text-muted-foreground">تطبق هذه النسبة تلقائياً على فواتير البيع الجديدة</p>
          </CardContent>
        </Card>

        {/* Default Warehouse */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Warehouse className="h-4 w-4" />المخزن الافتراضي</CardTitle></CardHeader>
          <CardContent>
            <Combobox value={settings.default_warehouse || ""} onChange={(e) => saveDefaultWarehouse(e.target.value)} placeholder="اختر...">
              <option value="">اختر...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>{locale === "ar" ? (w.name || w.name_en) : (w.name_en || w.name)}</option>
              ))}
            </Combobox>
          </CardContent>
        </Card>

        {/* Allow Negative Stock */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Warehouse className="h-4 w-4" />البيع بالسالب</CardTitle></CardHeader>
          <CardContent>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="toggle-checkbox"
                checked={settings.allow_negative_stock === "1"}
                onChange={(e) => {
                  const val = e.target.checked ? "1" : "0";
                  setSettings({ ...settings, allow_negative_stock: val });
                  api.updateSettings({ allow_negative_stock: val }).then(() => toast(t("common.save"), { type: "success" }));
                }}
              />
              <span className="text-sm">السماح بالبيع عند نفاد المخزون</span>
            </label>
            <p className="text-xs text-muted-foreground mt-2">عند التفعيل، يمكن إتمام عمليات البيع حتى لو كانت الكمية صفر أو أقل</p>
          </CardContent>
        </Card>
      </div>

      {/* Default Accounts */}
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2">حسابات افتراضية</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>حساب الإيراد</Label>
              <Combobox value={settings.default_revenue_account || ""} onChange={(e) => { api.updateSettings({ default_revenue_account: e.target.value }).then(() => api.getSettings().then(setSettings)); }} placeholder="اختر...">
                <option value="">اختر...</option>
                {accounts.filter((a) => a.type === "income").map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                ))}
              </Combobox>
            </div>
            <div>
              <Label>حساب تكلفة المبيعات</Label>
              <Combobox value={settings.default_cogs_account || ""} onChange={(e) => { api.updateSettings({ default_cogs_account: e.target.value }).then(() => api.getSettings().then(setSettings)); }} placeholder="اختر...">
                <option value="">اختر...</option>
                {accounts.filter((a) => a.type === "expense").map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                ))}
              </Combobox>
            </div>
            <div>
              <Label>حساب المخزون</Label>
              <Combobox value={settings.default_inventory_account || ""} onChange={(e) => { api.updateSettings({ default_inventory_account: e.target.value }).then(() => api.getSettings().then(setSettings)); }} placeholder="اختر...">
                <option value="">اختر...</option>
                {accounts.filter((a) => a.type === "asset").map((a) => (
                  <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                ))}
              </Combobox>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* POS Profiles */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><Store className="h-4 w-4" />ملفات نقاط البيع</CardTitle>
          <Button size="sm" onClick={openAddProfile}><Plus className="h-4 w-4 ml-1" />إضافة ملف</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>المخزن</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>العملة</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>افتراضي</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posProfiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.warehouse_id ? (warehouses.find(w => w.id === p.warehouse_id) ? (locale === "ar" ? (warehouses.find(w => w.id === p.warehouse_id).name || warehouses.find(w => w.id === p.warehouse_id).name_en) : (warehouses.find(w => w.id === p.warehouse_id).name_en || warehouses.find(w => w.id === p.warehouse_id).name)) : "-") : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.payment_method_id ? (paymentMethods.find(pm => pm.id === p.payment_method_id) ? (locale === "ar" ? (paymentMethods.find(pm => pm.id === p.payment_method_id).name || paymentMethods.find(pm => pm.id === p.payment_method_id).name_en) : (paymentMethods.find(pm => pm.id === p.payment_method_id).name_en || paymentMethods.find(pm => pm.id === p.payment_method_id).name)) : "-") : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.currency_id ? (currencies.find(c => c.id === p.currency_id) ? currencies.find(c => c.id === p.currency_id).code : "-") : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.customer_id ? (customers.find(c => c.id === p.customer_id) ? (locale === "ar" ? (customers.find(c => c.id === p.customer_id).name || customers.find(c => c.id === p.customer_id).name_en) : (customers.find(c => c.id === p.customer_id).name_en || customers.find(c => c.id === p.customer_id).name)) : "-") : "-"}
                  </TableCell>
                  <TableCell>{p.is_default ? <Badge variant="default">نعم</Badge> : <Badge variant="outline">لا</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditProfile(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteProfile(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {posProfiles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-4">لا توجد ملفات نقاط بيع</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-4 w-4" />طرق الدفع</CardTitle>
          <Button size="sm" onClick={openAddPm}><Plus className="h-4 w-4 ml-1" />إضافة طريقة</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>الحساب المرتبط</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentMethods.map((pm) => (
                <TableRow key={pm.id}>
                  <TableCell>{locale === "ar" ? (pm.name || pm.name_en) : (pm.name_en || pm.name)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{pm.account_code ? `${pm.account_code} - ${locale === "ar" ? (pm.account_name || pm.account_name_en) : (pm.account_name_en || pm.account_name)}` : "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditPm(pm)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deletePm(pm.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Currencies */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><DollarSign className="h-4 w-4" />{t("settings.currencies")}</CardTitle>
          <Button size="sm" onClick={openAddCurr}><Plus className="h-4 w-4 ml-1" />{t("settings.addCurrency")}</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("settings.code")}</TableHead>
                <TableHead>{t("common.name")}</TableHead>
                <TableHead>{t("settings.symbol")}</TableHead>
                <TableHead>{t("settings.rate")}</TableHead>
                <TableHead>{t("common.status")}</TableHead>
                <TableHead className="text-start">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currencies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-bold">{c.code}</TableCell>
                  <TableCell>{locale === "ar" ? (c.name || c.name_en) : (c.name_en || c.name)}</TableCell>
                  <TableCell className="text-lg">{c.symbol}</TableCell>
                  <TableCell dir="ltr">{c.rate}</TableCell>
                  <TableCell>
                    {c.is_main ? <Badge variant="default">رئيسية</Badge> : <Badge variant="outline">فرعية</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!c.is_main && <Button variant="ghost" size="icon" onClick={() => setMain(c.id)} title="تعيين كرئيسية">⭐</Button>}
                      <Button variant="ghost" size="icon" onClick={() => openEditCurr(c)}><Pencil className="h-4 w-4" /></Button>
                      {!c.is_main && <Button variant="ghost" size="icon" onClick={() => deleteCurr(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={currDialog} onOpenChange={setCurrDialog}>
        <DialogHeader><DialogTitle>{editCurr ? t("settings.editCurrency") : t("settings.addCurrency")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t("settings.code")}</Label><Input value={currForm.code} onChange={(e) => setCurrForm({ ...currForm, code: e.target.value })} placeholder="USD" dir="ltr" className="font-mono" /></div>
            <div><Label>{t("settings.symbol")}</Label><Input value={currForm.symbol} onChange={(e) => setCurrForm({ ...currForm, symbol: e.target.value })} placeholder="$" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>الاسم (عربي)</Label><Input value={currForm.name} onChange={(e) => setCurrForm({ ...currForm, name: e.target.value })} /></div>
            <div><Label>الاسم (إنجليزي)</Label><Input value={currForm.name_en} onChange={(e) => setCurrForm({ ...currForm, name_en: e.target.value })} /></div>
          </div>
          <div><Label>{t("settings.rate")} (مقابل العملة الرئيسية)</Label><Input type="number" step="0.0001" value={currForm.rate} onChange={(e) => setCurrForm({ ...currForm, rate: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCurrDialog(false)}>{t("common.cancel")}</Button>
          <Button onClick={saveCurr}>{editCurr ? t("common.save") : t("common.add")}</Button>
        </DialogFooter>
      </Dialog>
      {/* Payment Method Dialog */}
      <Dialog open={pmDialog} onOpenChange={setPmDialog}>
        <DialogHeader><DialogTitle>{editPm ? "تعديل طريقة الدفع" : "إضافة طريقة دفع"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>الاسم (عربي)</Label><Input value={pmForm.name} onChange={(e) => setPmForm({ ...pmForm, name: e.target.value })} /></div>
          <div><Label>الاسم (إنجليزي)</Label><Input value={pmForm.name_en} onChange={(e) => setPmForm({ ...pmForm, name_en: e.target.value })} /></div>
          <div>
            <Label>الحساب المرتبط</Label>
            <Combobox value={pmForm.account_id} onChange={(e) => setPmForm({ ...pmForm, account_id: e.target.value })} placeholder="اختر...">
              <option value="">اختر...</option>
              {accounts.filter((a) => a.type === "asset").map((a) => (
                <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
              ))}
            </Combobox>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPmDialog(false)}>{t("common.cancel")}</Button>
          <Button onClick={savePm}>{editPm ? t("common.save") : t("common.add")}</Button>
        </DialogFooter>
      </Dialog>
      {/* POS Profile Dialog */}
      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogHeader><DialogTitle>{editProfile ? "تعديل ملف نقاط البيع" : "إضافة ملف نقاط بيع"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>الاسم (عربي)</Label><Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} /></div>
            <div><Label>الاسم (إنجليزي)</Label><Input value={profileForm.name_en} onChange={(e) => setProfileForm({ ...profileForm, name_en: e.target.value })} /></div>
          </div>
          <div><Label>المخزن الافتراضي</Label>
            <Combobox value={profileForm.warehouse_id} onChange={(e) => setProfileForm({ ...profileForm, warehouse_id: e.target.value })} placeholder="اختر...">
              <option value="">اختر...</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>{locale === "ar" ? (w.name || w.name_en) : (w.name_en || w.name)}</option>
              ))}
            </Combobox>
          </div>
          <div><Label>طريقة الدفع الافتراضية</Label>
            <Combobox value={profileForm.payment_method_id} onChange={(e) => setProfileForm({ ...profileForm, payment_method_id: e.target.value })} placeholder="اختر...">
              <option value="">اختر...</option>
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={String(pm.id)}>{locale === "ar" ? (pm.name || pm.name_en) : (pm.name_en || pm.name)}</option>
              ))}
            </Combobox>
          </div>
          <div><Label>العملة الافتراضية</Label>
            <Combobox value={profileForm.currency_id} onChange={(e) => setProfileForm({ ...profileForm, currency_id: e.target.value })} placeholder="اختر...">
              <option value="">اختر...</option>
              {currencies.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.code} - {locale === "ar" ? (c.name || c.name_en) : (c.name_en || c.name)}</option>
              ))}
            </Combobox>
          </div>
          <div><Label>العميل الافتراضي</Label>
            <Combobox value={profileForm.customer_id} onChange={(e) => setProfileForm({ ...profileForm, customer_id: e.target.value })} placeholder="اختر...">
              <option value="">اختر...</option>
              {customers.map((c) => (
                <option key={c.id} value={String(c.id)}>{locale === "ar" ? (c.name || c.name_en) : (c.name_en || c.name)}</option>
              ))}
            </Combobox>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={profileForm.show_categories} onChange={(e) => setProfileForm({ ...profileForm, show_categories: e.target.checked })} />
              عرض التصنيفات
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={profileForm.show_search} onChange={(e) => setProfileForm({ ...profileForm, show_search: e.target.checked })} />
              عرض البحث
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={profileForm.is_default} onChange={(e) => setProfileForm({ ...profileForm, is_default: e.target.checked })} />
              افتراضي
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setProfileDialog(false)}>{t("common.cancel")}</Button>
          <Button onClick={saveProfile}>{editProfile ? t("common.save") : t("common.add")}</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
