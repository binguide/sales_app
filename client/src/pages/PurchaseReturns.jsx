import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useSort } from "@/lib/useSort";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Trash2, ArrowUpDown, ArrowRight, Undo2, Check, Printer } from "lucide-react";
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

export default function PurchaseReturns() {
  const { t, locale } = useI18n();
  const location = useLocation();
  const [returns, setReturns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [settingsData, setSettingsData] = useState({});
  const { sorted, toggle, getIndicator } = useSort(returns, "id");
  const [mode, setMode] = useState("list");
  const [viewData, setViewData] = useState(null);

  const [originalPurchaseId, setOriginalPurchaseId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [selectedItems, setSelectedItems] = useState([]);
  const [selProduct, setSelProduct] = useState("");
  const [selQty, setSelQty] = useState("1");
  const [selPrice, setSelPrice] = useState("");
  const [selTax, setSelTax] = useState("");

  useEffect(() => {
    load();
    const params = new URLSearchParams(location.search);
    const fromPurchase = params.get("fromPurchase");
    if (fromPurchase) {
      api.getPurchase(parseInt(fromPurchase)).then((purchase) => {
        if (purchase && purchase.items) {
          load();
          startFromPurchase(purchase);
        }
      });
    }
  }, []);

  function load() {
    api.getPurchaseReturns().then(setReturns);
    api.getSuppliers().then(setSuppliers);
    api.getProducts().then(setProducts);
    api.getCurrencies().then(setCurrencies);
    api.getPaymentMethods().then(setPaymentMethods);
    api.getSettings().then(setSettingsData);
  }

  function startNew() {
    setViewData(null);
    setOriginalPurchaseId(""); setSupplierId(""); setPaymentMethodId(""); setCurrencyId("");
    const defaultTax = parseFloat(settingsData.default_tax_rate) || 0;
    setTaxRate(String(defaultTax));
    setSelectedItems([]); setSelProduct(""); setSelQty("1"); setSelPrice(""); setSelTax(String(defaultTax));
    setMode("form");
  }

  function startFromPurchase(purchase) {
    setViewData(null);
    setOriginalPurchaseId(String(purchase.id));
    setSupplierId(purchase.supplier_id ? String(purchase.supplier_id) : "");
    setPaymentMethodId(purchase.payment_method_id ? String(purchase.payment_method_id) : "");
    setCurrencyId(purchase.currency_id ? String(purchase.currency_id) : "");
    setTaxRate(String(purchase.tax_rate || "0"));
    setSelectedItems(purchase.items.map((i) => ({
      product_id: i.product_id,
      product_name: locale === "ar" ? (i.product_name || i.product_name_en) : (i.product_name_en || i.product_name),
      price: i.price,
      quantity: i.quantity,
      tax_rate: i.tax_rate || 0,
    })));
    setSelProduct(""); setSelQty("1"); setSelPrice(""); setSelTax("");
    setMode("form");
  }

  function onProductSelect(id) {
    setSelProduct(id);
    const p = products.find((x) => x.id === parseInt(id));
    if (p) { setSelPrice(String(p.price)); setSelTax(String(p.tax_rate || "")); }
  }

  function addItem() {
    if (!selProduct) return toast(t("common.selectProduct"), { type: "error" });
    const p = products.find((x) => x.id === parseInt(selProduct));
    if (!p) return;
    const qty = parseInt(selQty) || 1;
    const price = parseFloat(selPrice) || 0;
    if (qty <= 0 || price <= 0) return toast(t("common.invalidQtyPrice"), { type: "error" });
    const available = p.quantity;
    if (qty > available) return toast(`متوفر فقط ${fn0(available)}`, { type: "error" });
    const tr = parseFloat(selTax) || 0;
    setSelectedItems([...selectedItems, { product_id: p.id, product_name: locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name), price, quantity: qty, tax_rate: tr }]);
    setSelProduct(""); setSelQty("1"); setSelPrice(""); setSelTax("");
  }

  function removeItem(idx) { setSelectedItems(selectedItems.filter((_, i) => i !== idx)); }

  function updateItem(idx, field, value) {
    setSelectedItems(selectedItems.map((item, i) => i === idx ? { ...item, [field]: field === "price" || field === "tax_rate" ? parseFloat(value) || 0 : value } : item));
  }

  const taxAmount = selectedItems.reduce((s, i) => s + i.price * i.quantity * (i.tax_rate || 0) / 100, 0);
  const subtotal = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + taxAmount;

  function saveReturn() {
    if (selectedItems.length === 0) return toast(t("purchaseReturns.emptyReturn"), { type: "error" });
    api.addPurchaseReturn({
      original_purchase_id: originalPurchaseId ? parseInt(originalPurchaseId) : null,
      supplier_id: supplierId ? parseInt(supplierId) : null,
      payment_method_id: paymentMethodId ? parseInt(paymentMethodId) : null,
      currency_id: currencyId ? parseInt(currencyId) : null,
      tax_rate: 0,
      items: selectedItems.map(({ product_id, price, quantity, tax_rate }) => ({ product_id, price, quantity, tax_rate: tax_rate || 0 })),
    }).then(() => {
      toast(t("purchaseReturns.saved"), { type: "success" });
      setMode("list");
      load();
    });
  }

  function viewReturn(id) { api.getPurchaseReturn(id).then(setViewData); }

  if (mode === "form") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setMode("list")}><ArrowRight className="h-5 w-5" /></Button>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">{t("purchaseReturns.newReturn")}</h2>
              <p className="text-muted-foreground">{t("purchaseReturns.subtitle")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMode("list")}>{t("common.cancel")}</Button>
            <Button onClick={saveReturn} disabled={selectedItems.length === 0}><Check className="h-4 w-4 ml-1" />{t("common.save")}</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label>{t("purchaseReturns.supplier")}</Label>
            <Combobox value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="-">
              <option value="">-</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
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
            <Label>نسبة الضريبة %</Label>
            <Input type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} min="0" max="100" step="0.01" />
          </div>
          <div>
            <Label>العملة</Label>
            <Combobox value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} placeholder="افتراضي">
              <option value="">افتراضي</option>
              {currencies.map((c) => <option key={c.id} value={c.id}>{c.code} {c.symbol}</option>)}
            </Combobox>
          </div>
        </div>

        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Undo2 className="h-4 w-4" />{t("sales.addItem")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap mb-4">
              <Combobox value={selProduct} onChange={(e) => onProductSelect(e.target.value)} className="flex-[2] min-w-[180px]" placeholder="..." searchPlaceholder={t("common.search")}>
                <option value="">...</option>
                {products.filter((p) => settingsData.allow_negative_stock === "1" || p.quantity > 0).map((p) => (
                  <option key={p.id} value={p.id}>
                    {locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name)} (stock: {fn0(p.quantity)})
                  </option>
                ))}
              </Combobox>
              <Input type="number" value={selQty} onChange={(e) => setSelQty(e.target.value)} className="w-20" min="1" placeholder={t("common.quantity")} />
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
          <h2 className="text-3xl font-bold tracking-tight">{t("purchaseReturns.title")}</h2>
          <p className="text-muted-foreground">{t("purchaseReturns.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <ExportButtons data={sorted} columns={[
            { key: "id", label: t("common.id"), format: "int" },
            { key: "original_purchase_num", label: t("common.id") },
            { key: "supplier_name", label: t("purchaseReturns.supplier") },
            { key: "total", label: t("common.total"), format: "number" },
            { key: "date", label: t("common.date") },
          ]} filename="purchase-returns" title={t("purchaseReturns.title")} />
          <Button onClick={startNew}><Plus className="h-4 w-4 ml-2" />{t("purchaseReturns.newReturn")}</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <Th sortKey="id" toggle={toggle} indicator={getIndicator}>{t("common.id")}</Th>
              <Th sortKey="original_purchase_num" toggle={toggle} indicator={getIndicator}>الفاتورة الأصلية</Th>
              <Th sortKey="supplier_name" toggle={toggle} indicator={getIndicator}>{t("purchaseReturns.supplier")}</Th>
              <Th sortKey="total" toggle={toggle} indicator={getIndicator}>{t("common.total")}</Th>
              <Th sortKey="date" toggle={toggle} indicator={getIndicator}>{t("common.date")}</Th>
              <TableHead className="text-start">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
            ) : sorted.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">#RET{fn0(r.id)}</TableCell>
                <TableCell>{r.original_purchase_num ? `#${fn0(r.original_purchase_num)}` : "-"}</TableCell>
                <TableCell>{r.supplier_name}</TableCell>
                <TableCell>{fn(r.total)}</TableCell>
                <TableCell>{new Date(r.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => viewReturn(r.id)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      {viewData && (
        <Card>
          <CardHeader className="py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Undo2 className="h-4 w-4" />{t("purchaseReturns.return")} #RET{viewData.id}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => printInvoice(viewData, "purchase-return", locale)}><Printer className="h-3.5 w-3.5 ml-1" />{t("common.print") || "طباعة"}</Button>
              <Button variant="ghost" size="sm" onClick={() => setViewData(null)}>{t("common.close")}</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div><span className="text-muted-foreground">{t("purchaseReturns.supplier")}:</span> {viewData.supplier_name}</div>
              <div><span className="text-muted-foreground">{t("common.date")}:</span> {new Date(viewData.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</div>
              {viewData.original_purchase_num && <div><span className="text-muted-foreground">الفاتورة الأصلية:</span> #{fn0(viewData.original_purchase_num)}</div>}
            </div>
            <Table>
              <TableHeader>
                <TableRow><TableHead>{t("common.name")}</TableHead><TableHead>{t("common.quantity")}</TableHead><TableHead>{t("common.price")}</TableHead>{viewData.items && viewData.items.some((i) => i.tax_rate > 0) && <TableHead>الضريبة</TableHead>}<TableHead>{t("common.total")}</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {viewData.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell>{fn0(item.quantity)}</TableCell>
                    <TableCell>{fn(item.price)}</TableCell>
                    {viewData.items && viewData.items.some((i) => i.tax_rate > 0) && <TableCell className="text-orange-600">{fn(item.price * item.quantity * (item.tax_rate || 0) / 100)}</TableCell>}
                    <TableCell>{fn(item.quantity * item.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 space-y-1 text-start">
              {viewData.subtotal != null && <div className="flex justify-between text-sm text-muted-foreground"><span>المجموع</span><span>{fn(viewData.subtotal)}</span></div>}
              {viewData.items && viewData.items.some((i) => i.tax_rate > 0) && (
                <div className="flex justify-between text-sm text-orange-600"><span>ضريبة</span><span>{fn(viewData.tax_amount || 0)}</span></div>
              )}
              <div className="text-lg font-bold">{t("common.total")}: {fn(viewData.total)}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}