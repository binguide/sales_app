import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useSort } from "@/lib/useSort";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Eye, Trash2, ArrowUpDown, ArrowRight, ShoppingCart, Check, Undo2, Printer } from "lucide-react";
import { fn, fn0 } from "@/lib/format";
import { printInvoice } from "@/lib/print";
import { toast } from "@/components/ui/sonner";
import ExportButtons from "@/components/ExportButtons";

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

export default function Sales() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [settingsData, setSettingsData] = useState({});
  const { sorted, toggle, getIndicator } = useSort(sales, "id");
  const [mode, setMode] = useState("list");
  const [viewData, setViewData] = useState(null);

  const [customerId, setCustomerId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selProduct, setSelProduct] = useState("");
  const [selQty, setSelQty] = useState("1");
  const [selPrice, setSelPrice] = useState("");
  const [selTax, setSelTax] = useState("");
  const [selUnitId, setSelUnitId] = useState("");
  const [selUnitFactor, setSelUnitFactor] = useState(1);
  const [selProductUnits, setSelProductUnits] = useState([]);

  // Payment add state
  const [pmtMethodId, setPmtMethodId] = useState("");
  const [pmtAmount, setPmtAmount] = useState("");
  const [pmtDate, setPmtDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => { load(); }, []);

  function load() {
    api.getSales().then(setSales);
    api.getCustomers().then(setCustomers);
    api.getProducts().then(setProducts);
    api.getCurrencies().then(setCurrencies);
    api.getPaymentMethods().then(setPaymentMethods);
    api.getSettings().then(setSettingsData);
  }

  function startNew() {
    setViewData(null);
    setCustomerId(""); setPaymentMethodId(""); setCurrencyId("");
    const defaultTax = parseFloat(settingsData.default_tax_rate) || 0;
    setTaxRate(String(defaultTax));
    setSelectedItems([]); setSelProduct(""); setSelQty("1"); setSelPrice(""); setSelTax(String(defaultTax));
    setMode("form");
  }

  function onProductSelect(id) {
    setSelProduct(id);
    const p = products.find((x) => x.id === parseInt(id));
    if (p) {
      const units = p.product_units || [];
      setSelProductUnits(units);
      const base = units.find((u) => u.is_base) || units[0];
      if (base) { setSelUnitId(String(base.unit_id)); setSelUnitFactor(base.conversion_factor); setSelPrice(String(base.price)); } else { setSelPrice(String(p.price)); }
      if (!base) setSelUnitId("");
      setSelTax(String(p.tax_rate || ""));
    }
  }

  function addItem() {
    if (!selProduct) return toast(t("common.selectProduct"), { type: "error" });
    const p = products.find((x) => x.id === parseInt(selProduct));
    if (!p) return;
    const qty = parseInt(selQty) || 1;
    const price = parseFloat(selPrice) || 0;
    if (qty <= 0 || price <= 0) return toast(t("common.invalidQtyPrice"), { type: "error" });
    const tr = parseFloat(selTax) || 0;
    setSelectedItems([...selectedItems, { product_id: p.id, product_name: locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name), price, quantity: qty, tax_rate: tr, unit_id: selUnitId ? parseInt(selUnitId) : null, unit_conversion_factor: parseFloat(selUnitFactor) || 1 }]);
    setSelProduct(""); setSelQty("1"); setSelPrice(""); setSelTax(""); setSelUnitId(""); setSelUnitFactor(1); setSelProductUnits([]);
  }

  function removeItem(idx) { setSelectedItems(selectedItems.filter((_, i) => i !== idx)); }

  function updateItem(idx, field, value) {
    setSelectedItems(selectedItems.map((item, i) => i === idx ? { ...item, [field]: field === "price" || field === "tax_rate" ? parseFloat(value) || 0 : value } : item));
  }

  const taxAmount = selectedItems.reduce((s, i) => s + i.price * i.quantity * (i.tax_rate || 0) / 100, 0);
  const subtotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + taxAmount;

  function saveSale() {
    if (selectedItems.length === 0) return toast(t("sales.emptyInvoice"), { type: "error" });
    api.addSale({
      customer_id: customerId ? parseInt(customerId) : null,
      payment_method_id: paymentMethodId ? parseInt(paymentMethodId) : null,
      currency_id: currencyId ? parseInt(currencyId) : null,
      tax_rate: 0,
      items: selectedItems.map(({ product_id, price, quantity, tax_rate, unit_id, unit_conversion_factor }) => ({ product_id, price, quantity, tax_rate: tax_rate || 0, unit_id, unit_conversion_factor })),
    }).then(() => {
      toast(t("sales.saved"), { type: "success" });
      setMode("list");
      load();
    });
  }

  function viewSale(id) {
    api.getSale(id).then((data) => {
      setViewData(data);
      setPmtMethodId("");
      setPmtAmount("");
      setPmtDate(new Date().toISOString().split("T")[0]);
    });
  }

  function addPayment() {
    if (!pmtMethodId || !pmtAmount || parseFloat(pmtAmount) <= 0) return;
    api.addSalePayment(viewData.id, {
      payment_method_id: parseInt(pmtMethodId),
      amount: parseFloat(pmtAmount),
      date: pmtDate,
    }).then(() => {
      toast(t("payments.saved"), { type: "success" });
      viewSale(viewData.id);
    });
  }

  if (mode === "form") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMode("list")}><ArrowRight className="h-5 w-5" /></Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t("sales.newInvoice")}</h2>
              <p className="text-muted-foreground">{t("sales.subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMode("list")}>{t("common.cancel")}</Button>
            <Button onClick={saveSale} disabled={selectedItems.length === 0}><Check className="h-4 w-4 ml-1" />{t("common.save")}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>{t("sales.customer")}</Label>
            <Combobox value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder={t("sales.cash")}>
              <option value="">{t("sales.cash")}</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Combobox>
          </div>
          <div>
            <Label>طريقة الدفع</Label>
            <Combobox value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} placeholder="اختر...">
              <option value="">اختر...</option>
              {paymentMethods.map((pm) => <option key={pm.id} value={pm.id}>{locale === "ar" ? (pm.name || pm.name_en) : (pm.name_en || pm.name)}</option>)}
            </Combobox>
          </div>
          <div>
            <Label>العملة</Label>
            <Combobox value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} placeholder="افتراضي">
              <option value="">افتراضي</option>
              {currencies.map((c) => <option key={c.id} value={c.id}>{c.code} {c.symbol}</option>)}
            </Combobox>
          </div>
          <div>
            <Label>نسبة الضريبة %</Label>
            <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} min="0" max="100" step="0.01" />
          </div>
        </div>

        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" />{t("sales.addItem")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap mb-4">
              <Combobox value={selProduct} onChange={(e) => onProductSelect(e.target.value)} className="flex-[2] min-w-[180px]" placeholder="..." searchPlaceholder={t("common.search")}>
                <option value="">...</option>
                {products.filter((p) => settingsData.allow_negative_stock === "1" || p.quantity > 0).map((p) => (
                  <option key={p.id} value={p.id}>
                    {locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name)} - {fn(p.price)} ({fn0(p.quantity)})
                  </option>
                ))}
              </Combobox>
              <Input type="number" value={selQty} onChange={(e) => setSelQty(e.target.value)} className="w-20" min="1" placeholder={t("common.quantity")} />
              {selProductUnits.length > 1 && (
                <Combobox value={selUnitId} onChange={(e) => {
                  const u = selProductUnits.find(pu => String(pu.unit_id) === e.target.value);
                  setSelUnitId(e.target.value);
                  if (u) { setSelUnitFactor(u.conversion_factor); setSelPrice(String(u.price)); }
                }} className="w-28" placeholder={t("products.unit")}>
                  <option value="">{t("products.unit")}</option>
                  {selProductUnits.map((u) => (
                    <option key={u.unit_id} value={String(u.unit_id)}>
                      {locale === "ar" ? (u.unit_name || u.unit_name_en) : (u.unit_name_en || u.unit_name)}
                    </option>
                  ))}
                </Combobox>
              )}
              <Input type="number" value={selPrice} onChange={(e) => setSelPrice(e.target.value)} className="w-24" min="0" step="0.01" placeholder={t("common.price")} />
              <Input type="number" value={selTax} onChange={(e) => setSelTax(e.target.value)} className="w-20" min="0" max="100" step="0.01" placeholder={t("vat") + "%"} />
              <Button onClick={addItem} size="sm">{t("sales.addItem")}</Button>
            </div>
            {selectedItems.length > 0 && (
              <Table>
                  <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead>{t("common.quantity")}</TableHead>
                    <TableHead>{t("common.price")}</TableHead>
                    <TableHead>{t("vat")} %</TableHead>
                    <TableHead>{t("common.total")}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>{fn0(item.quantity)}</TableCell>
                      <TableCell><Input type="number" value={item.price} onChange={(e) => updateItem(idx, "price", e.target.value)} className="w-24 h-8" min="0" step="0.01" /></TableCell>
                      <TableCell><Input type="number" value={item.tax_rate} onChange={(e) => updateItem(idx, "tax_rate", e.target.value)} className="w-20 h-8" min="0" max="100" step="0.01" /></TableCell>
                      <TableCell>{fn(item.price * item.quantity)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
            {selectedItems.length > 0 && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-1">
                <div className="flex justify-between text-sm text-muted-foreground"><span>المجموع</span><span>{fn(subtotal)}</span></div>
                {(selectedItems.some((i) => i.tax_rate > 0) || taxAmount > 0) && (
                  <div className="flex justify-between text-sm text-orange-600"><span>ضريبة</span><span>{fn(taxAmount)}</span></div>
                )}
                <div className="flex justify-between text-lg font-bold"><span>{t("common.total")}</span><span>{fn(total)}</span></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("sales.title")}</h2>
          <p className="text-muted-foreground">{t("sales.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons data={sorted} columns={[
            { key: "id", label: t("sales.invoiceNum"), format: "int" },
            { key: "customer_name", label: t("sales.customer") },
            { key: "total", label: t("common.total"), format: "number" },
            { key: "paid_amount", label: t("payments.paid"), format: "number" },
            { key: "remaining", label: t("payments.remaining"), format: "number" },
            { key: "date", label: t("common.date") },
          ]} filename="sales" title={t("sales.title")} />
          <Button variant="outline" onClick={() => window.open("/pos", "_blank")} className="hidden md:flex">
            {t("nav.pos")}
          </Button>
          <Button onClick={startNew}><Plus className="h-4 w-4 ml-2" />{t("sales.newInvoice")}</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <Th sortKey="id" toggle={toggle} indicator={getIndicator}>{t("sales.invoiceNum")}</Th>
              <Th sortKey="customer_name" toggle={toggle} indicator={getIndicator}>{t("sales.customer")}</Th>
              <TableHead>{t("common.total")}</TableHead>
              <TableHead>{t("payments.paid")}</TableHead>
              <TableHead>{t("payments.remaining")}</TableHead>
              <Th sortKey="date" toggle={toggle} indicator={getIndicator}>{t("common.date")}</Th>
              <TableHead className="text-start">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
            ) : sorted.map((s) => {
              const paid = s.paid_amount || 0;
              const remaining = s.total - paid;
              return (
              <TableRow key={s.id}>
                <TableCell className="font-medium">#{fn0(s.id)}</TableCell>
                <TableCell>{s.customer_name}</TableCell>
                <TableCell>{fn(s.total)} {s.currency_symbol}</TableCell>
                <TableCell className={paid >= s.total ? "text-green-600 font-medium" : paid > 0 ? "text-amber-600" : "text-muted-foreground"}>{fn(paid)}</TableCell>
                <TableCell className={remaining <= 0 ? "text-green-600" : "text-red-600 font-medium"}>{remaining <= 0 ? "—" : fn(remaining)}</TableCell>
                <TableCell>{new Date(s.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => viewSale(s.id)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            );
          })}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={!!viewData} onOpenChange={(open) => !open && setViewData(null)} contentClassName="max-w-5xl max-h-[90vh] overflow-y-auto">
        {viewData && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" />{t("sales.invoice")} #{viewData.id}</DialogTitle>
            </DialogHeader>
            <div className="flex gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={() => printInvoice(viewData, "sale", locale)}><Printer className="h-3.5 w-3.5 ml-1" />{t("common.print") || "طباعة"}</Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/sales-returns?fromSale=${viewData.id}`)}><Undo2 className="h-3.5 w-3.5 ml-1" />مرتجع</Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div><span className="text-muted-foreground">{t("sales.customer")}:</span> {viewData.customer_name}</div>
              <div><span className="text-muted-foreground">{t("common.date")}:</span> {new Date(viewData.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</div>
              <div><span className="text-muted-foreground">طريقة الدفع:</span> {locale === "ar" ? (viewData.payment_method_name || viewData.payment_method_name_en) : (viewData.payment_method_name_en || viewData.payment_method_name)}</div>
              {viewData.currency_code && <div><span className="text-muted-foreground">العملة:</span> {viewData.currency_code} {viewData.currency_symbol}</div>}
            </div>
            <Table>
              <TableHeader>
                <TableRow><TableHead>{t("common.name")}</TableHead><TableHead>{t("common.quantity")}</TableHead><TableHead>{t("products.unit")}</TableHead><TableHead>{t("common.price")}</TableHead><TableHead>التكلفة</TableHead>{viewData.items && viewData.items.some((i) => i.tax_rate > 0) && <TableHead>الضريبة</TableHead>}<TableHead>{t("common.total")}</TableHead><TableHead>الربح</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {viewData.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{fn0(item.quantity)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.abbreviation ? item.abbreviation : (item.unit_name || "")}
                    </TableCell>
                    <TableCell>{fn(item.price)}</TableCell>
                    <TableCell className="text-muted-foreground">{fn(item.cost_price)}</TableCell>
                    {viewData.items && viewData.items.some((i) => i.tax_rate > 0) && <TableCell className="text-orange-600">{fn(item.item_tax_amount || (item.price * item.quantity * (item.tax_rate || 0) / 100))}</TableCell>}
                    <TableCell>{fn(item.quantity * item.price)}</TableCell>
                    <TableCell className={item.item_profit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                      {fn(item.item_profit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 space-y-1 text-start">
              {viewData.subtotal != null && <div className="flex justify-between text-sm text-muted-foreground"><span>المجموع</span><span>{fn(viewData.subtotal)}</span></div>}
              {viewData.items && viewData.items.some((i) => i.tax_rate > 0) && (
                <div className="flex justify-between text-sm text-orange-600"><span>ضريبة</span><span>{fn(viewData.tax_amount || 0)}</span></div>
              )}
              <div className="flex justify-between items-center text-lg font-bold"><span>{t("common.total")}: {fn(viewData.total)}</span><span className="text-green-600">الربح: {fn(viewData.totalProfit)}</span></div>
            </div>
            {/* Payments */}
            <Card className="mt-4">
              <CardHeader className="py-3">
                <CardTitle className="text-base">{t("payments.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 mb-3 text-sm">
                  <span className="text-muted-foreground">{t("payments.totalPaid")}: <strong className={viewData.total - (viewData.paid_amount || 0) <= 0 ? "text-green-600" : "text-amber-600"}>{fn(viewData.payments?.reduce((s, p) => s + p.amount, 0) || 0)}</strong></span>
                  <span className="text-muted-foreground">{t("payments.remaining")}: <strong className={(viewData.total - (viewData.payments?.reduce((s, p) => s + p.amount, 0) || 0)) <= 0 ? "text-green-600" : "text-red-600"}>{fn(Math.max(0, viewData.total - (viewData.payments?.reduce((s, p) => s + p.amount, 0) || 0)))}</strong></span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("payments.date")}</TableHead>
                      <TableHead>{t("payments.paymentMethod")}</TableHead>
                      <TableHead>{t("payments.amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewData.payments && viewData.payments.length > 0 ? viewData.payments.map((p, i) => (
                      <TableRow key={i}>
                        <TableCell>{p.date ? new Date(p.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US") : "—"}</TableCell>
                        <TableCell>{locale === "ar" ? (p.payment_method_name || p.payment_method_name_en) : (p.payment_method_name_en || p.payment_method_name)}</TableCell>
                        <TableCell>{fn(p.amount)}</TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">{t("payments.noPayments")}</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
                {(viewData.payments?.reduce((s, p) => s + p.amount, 0) || 0) < viewData.total && (
                  <div className="mt-4 p-3 border rounded-lg">
                    <h4 className="text-sm font-medium mb-2">{t("payments.add")}</h4>
                    <div className="flex gap-2 flex-wrap">
                      <Combobox value={pmtMethodId} onChange={(e) => setPmtMethodId(e.target.value)} className="flex-1 min-w-[140px]" placeholder={t("payments.paymentMethod")}>
                        <option value="">{t("payments.paymentMethod")}</option>
                        {paymentMethods.map((pm) => <option key={pm.id} value={pm.id}>{locale === "ar" ? (pm.name || pm.name_en) : (pm.name_en || pm.name)}</option>)}
                      </Combobox>
                      <Input type="number" value={pmtAmount} onChange={(e) => setPmtAmount(e.target.value)} className="w-28" min="0" step="0.01" placeholder={t("payments.amount")} />
                      <Input type="date" value={pmtDate} onChange={(e) => setPmtDate(e.target.value)} className="w-36" />
                      <Button size="sm" onClick={addPayment} disabled={!pmtMethodId || !pmtAmount || parseFloat(pmtAmount) <= 0}>{t("payments.add")}</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setViewData(null)}>{t("common.close")}</Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </div>
  );
}