import { useState, useEffect, useCallback } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useBulkSelect } from "@/lib/useBulkSelect";
import { useSort } from "@/lib/useSort";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, ArrowUpDown, Undo2, Check, Image as ImageIcon, Package, Wrench, LayoutGrid, Table as TableIcon } from "lucide-react";
import { fn, fn0 } from "@/lib/format";
import { toast } from "@/components/ui/sonner";
import ExportButtons from "@/components/ExportButtons";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function Products() {
  const { t, locale } = useI18n();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [units, setUnits] = useState([]);
  const [mode, setMode] = useState("list");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: "", name_en: "", barcode: "", category_id: "",
    price: "", wholesale_price: "", quantity: "0", tax_rate: "",
    revenue_account_id: "", cogs_account_id: "", inventory_account_id: "",
    is_service: false, image: "", min_stock: "", max_stock: "", reorder_point: "",
  });
  const [productUnits, setProductUnits] = useState([]);

  useEffect(() => { load(); }, []);

  function load() {
    api.getProducts().then(setProducts);
    api.getCategories().then(setCategories);
    api.getAccounts(true).then(setAccounts);
    api.getUnits().then(setUnits);
  }

  const { sorted, toggle, getIndicator } = useSort(products, "id");

  function resetForm() {
    setForm({
      name: "", name_en: "", barcode: "", category_id: "",
      price: "", wholesale_price: "", quantity: "0", tax_rate: "",
      revenue_account_id: "", cogs_account_id: "", inventory_account_id: "",
      is_service: false, image: "", min_stock: "", max_stock: "", reorder_point: "",
    });
    setProductUnits([]);
    setEditId(null);
  }

  const getName = (p) => locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name);
  const getCatName = (c) => locale === "ar" ? (c?.name || c?.name_en) : (c?.name_en || c?.name);

  function startNew() {
    resetForm();
    const defaultTax = "15";
    setForm(prev => ({ ...prev, tax_rate: defaultTax }));
    setMode("form");
  }

  function startEdit(p) {
    setEditId(p.id);
    setForm({
      name: p.name, name_en: p.name_en || "", barcode: p.barcode || "",
      category_id: p.category_id ? String(p.category_id) : "",
      price: String(p.price), wholesale_price: String(p.wholesale_price || ""), quantity: String(p.quantity),
      tax_rate: String(p.tax_rate || ""),
      revenue_account_id: p.revenue_account_id ? String(p.revenue_account_id) : "",
      cogs_account_id: p.cogs_account_id ? String(p.cogs_account_id) : "",
      inventory_account_id: p.inventory_account_id ? String(p.inventory_account_id) : "",
      is_service: !!p.is_service, image: p.image || "", min_stock: String(p.min_stock || ""),
      max_stock: String(p.max_stock || ""), reorder_point: String(p.reorder_point || ""),
    });
    setProductUnits((p.product_units || []).map(pu => ({
      ...pu,
      unit_id: String(pu.unit_id),
      conversion_factor: String(pu.conversion_factor),
      price: String(pu.price),
      wholesale_price: String(pu.wholesale_price),
      barcode: pu.barcode || "",
      is_base: !!pu.is_base,
    })));
    setMode("form");
  }

  const addProductUnit = useCallback(() => {
    setProductUnits(prev => [...prev, {
      unit_id: "", conversion_factor: "1", is_base: prev.length === 0,
      price: "", wholesale_price: "", barcode: "",
    }]);
  }, []);

  const removeProductUnit = useCallback((idx) => {
    setProductUnits(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length > 0 && !next.some(pu => pu.is_base)) next[0].is_base = true;
      return next;
    });
  }, []);

  const updateProductUnit = useCallback((idx, field, value) => {
    setProductUnits(prev => {
      const next = prev.map((pu, i) => i === idx ? { ...pu, [field]: value } : pu);
      if (field === "is_base" && value) {
        next.forEach((pu, i) => { if (i !== idx) pu.is_base = false; });
        if (next[idx]) next[idx].is_base = true;
      }
      return next;
    });
  }, []);

  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setForm(prev => ({ ...prev, image: "" }));
  }

  async function save() {
    if (!form.name) { toast(t("common.nameRequired"), { type: "error" }); return; }
    const data = {
      name: form.name,
      name_en: form.name_en || null,
      barcode: form.barcode || null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      price: parseFloat(form.price) || 0,
      wholesale_price: parseFloat(form.wholesale_price) || 0,
      quantity: parseInt(form.quantity) || 0,
      tax_rate: parseFloat(form.tax_rate) || 0,
      revenue_account_id: form.revenue_account_id ? parseInt(form.revenue_account_id) : null,
      cogs_account_id: form.cogs_account_id ? parseInt(form.cogs_account_id) : null,
      inventory_account_id: form.inventory_account_id ? parseInt(form.inventory_account_id) : null,
      is_service: form.is_service,
      image: form.image || null,
      min_stock: parseFloat(form.min_stock) || 0,
      max_stock: parseFloat(form.max_stock) || 0,
      reorder_point: parseFloat(form.reorder_point) || 0,
      product_units: productUnits.map(pu => ({
        unit_id: parseInt(pu.unit_id),
        conversion_factor: parseFloat(pu.conversion_factor) || 1,
        is_base: !!pu.is_base,
        price: parseFloat(pu.price) || 0,
        wholesale_price: parseFloat(pu.wholesale_price) || 0,
        barcode: pu.barcode || null,
      })),
    };
    try {
      if (editId) {
        await api.updateProduct(editId, data);
      } else {
        await api.addProduct(data);
      }
      load();
      setMode("list");
      toast(editId ? t("common.edit") : t("common.add"), { type: "success" });
    } catch { toast(t("common.error"), { type: "error" }); }
  }

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState("cards");
  const { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount } = useBulkSelect(products);

  function remove(p) {
    if (!confirm(`${t("common.delete")} "${getName(p)}"?`)) return;
    api.deleteProduct(p.id).then(() => { load(); toast(t("common.delete"), { type: "success" }); });
  }

  function bulkRemove() {
    api.bulkDelete("products", [...selectedIds]).then(() => {
      load(); clearSelection(); setConfirmOpen(false); toast(t("common.delete"), { type: "success" });
    });
  }

  function Th({ children, sortKey: sk }) {
    return (
      <TableHead>
        <button onClick={() => toggle(sk)} className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">
          {children}
          <ArrowUpDown className={"h-3 w-3 " + (getIndicator(sk) ? "text-primary" : "opacity-30")} />
        </button>
      </TableHead>
    );
  }

  if (mode === "form") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              {editId ? t("products.edit") : t("products.add")}
            </h2>
            <p className="text-muted-foreground">{t("products.subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMode("list")}>
              <Undo2 className="h-4 w-4 ml-2" />{t("common.cancel")}
            </Button>
            <Button onClick={save}>
              <Check className="h-4 w-4 ml-2" />{t("common.save")}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>{t("common.name")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("common.name")} (عربي)</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("products.nameEn")}</Label>
                    <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("products.barcode")}</Label>
                    <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} dir="ltr" className="font-mono" />
                  </div>
                  <div>
                    <Label>{t("products.category")}</Label>
                    <Combobox value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} placeholder={t("products.noCategory")}>
                      <option value="">{t("products.noCategory")}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{locale === "ar" ? c.name : (c.name_en || c.name)}</option>
                      ))}
                    </Combobox>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t("products.pricing")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_service}
                      onChange={(e) => setForm({ ...form, is_service: e.target.checked })}
                      className="accent-primary h-4 w-4" />
                    <span className="flex items-center gap-1.5"><Wrench className="h-4 w-4" />{t("products.isService")}</span>
                  </Label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t("products.retailPrice")}</Label>
                    <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div>
                    <Label>{t("products.wholesalePrice")}</Label>
                    <Input type="number" value={form.wholesale_price} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>الضريبة %</Label>
                    <Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} min="0" max="100" step="0.01" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!form.is_service && (
              <>
                <Card>
                  <CardHeader><CardTitle>{t("products.inventory")}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>{t("common.quantity")}</Label>
                        <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                      </div>
                      <div>
                        <Label>{t("products.minStock")}</Label>
                        <Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} min="0" />
                      </div>
                      <div>
                        <Label>{t("products.maxStock")}</Label>
                        <Input type="number" value={form.max_stock} onChange={(e) => setForm({ ...form, max_stock: e.target.value })} min="0" />
                      </div>
                      <div>
                        <Label>{t("products.reorderPoint")}</Label>
                        <Input type="number" value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: e.target.value })} min="0" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>{t("products.accounts")}</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>{t("products.revenueAccount")}</Label>
                        <Combobox value={form.revenue_account_id} onChange={(e) => setForm({ ...form, revenue_account_id: e.target.value })} placeholder={t("common.select")}>
                          <option value="">{t("common.select")}</option>
                          {accounts.filter((a) => a.type === "income").map((a) => (
                            <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                          ))}
                        </Combobox>
                      </div>
                      <div>
                        <Label>{t("products.cogsAccount")}</Label>
                        <Combobox value={form.cogs_account_id} onChange={(e) => setForm({ ...form, cogs_account_id: e.target.value })} placeholder={t("common.select")}>
                          <option value="">{t("common.select")}</option>
                          {accounts.filter((a) => a.type === "expense").map((a) => (
                            <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                          ))}
                        </Combobox>
                      </div>
                      <div>
                        <Label>{t("products.inventoryAccount")}</Label>
                        <Combobox value={form.inventory_account_id} onChange={(e) => setForm({ ...form, inventory_account_id: e.target.value })} placeholder={t("common.select")}>
                          <option value="">{t("common.select")}</option>
                          {accounts.filter((a) => a.type === "asset").map((a) => (
                            <option key={a.id} value={String(a.id)}>{a.code} - {locale === "ar" ? (a.name || a.name_en) : (a.name_en || a.name)}</option>
                          ))}
                        </Combobox>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("products.productUnits")}</CardTitle>
                  <Button variant="outline" size="sm" onClick={addProductUnit} type="button"><Plus className="h-3 w-3 ml-1" />{t("products.addUnit")}</Button>
                </div>
              </CardHeader>
              <CardContent>
                {productUnits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("common.noData")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("products.unit")}</TableHead>
                          <TableHead>{t("products.conversionFactor")}</TableHead>
                          <TableHead className="text-center">{t("products.baseUnit")}</TableHead>
                          <TableHead>{t("products.unitPrice")}</TableHead>
                          <TableHead>{t("products.unitWholesale")}</TableHead>
                          <TableHead>{t("products.barcode")}</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productUnits.map((pu, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="min-w-[140px]">
                              <Combobox value={pu.unit_id} onChange={(e) => updateProductUnit(idx, "unit_id", e.target.value)} placeholder={t("products.unit")}>
                                <option value="">{t("products.unit")}</option>
                                {units.map((u) => (
                                  <option key={u.id} value={String(u.id)}>
                                    {locale === "ar" ? (u.name || u.name_en) : (u.name_en || u.name)}
                                    {u.abbreviation ? ` (${u.abbreviation})` : ""}
                                  </option>
                                ))}
                              </Combobox>
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={pu.conversion_factor}
                                onChange={(e) => updateProductUnit(idx, "conversion_factor", e.target.value)}
                                min="0.001" step="any" className="w-20" dir="ltr" />
                            </TableCell>
                            <TableCell className="text-center">
                              <input type="checkbox" checked={pu.is_base}
                                onChange={(e) => updateProductUnit(idx, "is_base", e.target.checked)}
                                className="accent-primary h-4 w-4 cursor-pointer" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={pu.price}
                                onChange={(e) => updateProductUnit(idx, "price", e.target.value)}
                                step="any" className="w-24" dir="ltr" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={pu.wholesale_price}
                                onChange={(e) => updateProductUnit(idx, "wholesale_price", e.target.value)}
                                step="any" className="w-24" dir="ltr" />
                            </TableCell>
                            <TableCell>
                              <Input type="text" value={pu.barcode}
                                onChange={(e) => updateProductUnit(idx, "barcode", e.target.value)}
                                className="w-24 font-mono text-xs" dir="ltr" />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => removeProductUnit(idx)} type="button">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>{t("products.image")}</CardTitle></CardHeader>
              <CardContent>
                {form.image ? (
                  <div className="space-y-3">
                    <div className="relative border rounded-lg overflow-hidden bg-muted">
                      <img src={form.image} alt={form.name || t("products.image")}
                        className="w-full h-48 object-contain" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => document.getElementById("product-image-input").click()}>
                        {t("common.change")}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={removeImage} className="text-destructive">
                        <Trash2 className="h-4 w-4 ml-1" />{t("common.delete")}
                      </Button>
                    </div>
                    <input id="product-image-input" type="file" accept="image/*" className="hidden" onChange={handleImage} />
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => document.getElementById("product-image-input").click()}>
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{t("products.clickToUpload")}</p>
                    <input id="product-image-input" type="file" accept="image/*" className="hidden" onChange={handleImage} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("products.title")}</h2>
          <p className="text-muted-foreground">{t("products.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button variant="destructive" onClick={() => setConfirmOpen(true)}><Trash2 className="h-4 w-4 ml-1" />{t("common.delete")} ({selectedCount})</Button>
          )}
          <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")} title={viewMode === "table" ? "Card view" : "Table view"}>
            {viewMode === "table" ? <LayoutGrid className="h-4 w-4" /> : <TableIcon className="h-4 w-4" />}
          </Button>
          <ExportButtons data={sorted} columns={[
            { key: "id", label: "#", format: "int" },
            { key: "name", label: t("common.name") },
            { key: "name_en", label: t("products.nameEn") },
            { key: "barcode", label: t("products.barcode") },
            { key: "category_name", label: t("products.category") },
            { key: "price", label: t("products.retailPrice"), format: "number" },
            { key: "wholesale_price", label: t("products.wholesalePrice"), format: "number" },
            { key: "tax_rate", label: t("common.vat") },
            { key: "quantity", label: t("common.quantity"), format: "int" },
          ]} filename="products" title={t("products.title")} />
          <Button onClick={startNew}><Plus className="h-4 w-4 ml-2" />{t("products.add")}</Button>
        </div>
      </div>

      {viewMode === "table" ? (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input type="checkbox" className="h-4 w-4" checked={isAllSelected} onChange={handleSelectAll} />
                </TableHead>
                <TableHead className="w-12">{t("common.image")}</TableHead>
                <Th sortKey="id">#</Th>
                <Th sortKey="name">{t("common.name")}</Th>
                <Th sortKey="barcode">{t("products.barcode")}</Th>
                <Th sortKey="category_name">{t("products.category")}</Th>
                <TableHead className="text-end"><button onClick={() => toggle("price")} className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">{t("products.retailPrice")}<ArrowUpDown className={"h-3 w-3 " + (getIndicator("price") ? "text-primary" : "opacity-30")} /></button></TableHead>
                <TableHead className="text-end"><button onClick={() => toggle("wholesale_price")} className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">{t("products.wholesalePrice")}<ArrowUpDown className={"h-3 w-3 " + (getIndicator("wholesale_price") ? "text-primary" : "opacity-30")} /></button></TableHead>
                <TableHead className="text-end">{t("common.vat")}</TableHead>
                <TableHead className="text-end"><button onClick={() => toggle("quantity")} className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">{t("common.quantity")}<ArrowUpDown className={"h-3 w-3 " + (getIndicator("quantity") ? "text-primary" : "opacity-30")} /></button></TableHead>
                <TableHead><button onClick={() => toggle("is_service")} className="flex items-center gap-1.5 hover:text-foreground transition-colors font-medium">{t("common.type")}<ArrowUpDown className={"h-3 w-3 " + (getIndicator("is_service") ? "text-primary" : "opacity-30")} /></button></TableHead>
                <TableHead className="text-start">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
              ) : sorted.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <input type="checkbox" className="h-4 w-4" checked={selectedIds.has(p.id)} onChange={() => handleSelect(p.id)} />
                  </TableCell>
                  <TableCell>
                    {p.image ? (
                      <img src={p.image} alt="" className="w-8 h-8 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-end">{fn0(p.id)}</TableCell>
                  <TableCell className="font-medium">{getName(p)}</TableCell>
                  <TableCell dir="ltr" className="font-mono text-xs">{p.barcode || "-"}</TableCell>
                  <TableCell>
                    {p.category_id ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.category_color }} />
                        {getCatName(p)}
                      </span>
                    ) : <span className="text-muted-foreground">{t("products.noCategory")}</span>}
                  </TableCell>
                  <TableCell className="text-end font-mono" dir="ltr">{fn(p.price)}</TableCell>
                  <TableCell className="text-end font-mono" dir="ltr">{p.wholesale_price > 0 ? fn(p.wholesale_price) : "-"}</TableCell>
                  <TableCell className="text-end">{p.tax_rate ? p.tax_rate + "%" : "-"}</TableCell>
                  <TableCell className="text-end">{fn0(p.quantity)}</TableCell>
                  <TableCell>
                    {p.is_service ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Wrench className="h-3 w-3" />{t("products.service")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Package className="h-3 w-3" />{t("products.product")}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sorted.length === 0 ? (
            <div className="col-span-full text-center text-muted-foreground py-8">{t("common.noData")}</div>
          ) : sorted.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {p.image ? (
                    <img src={p.image} alt="" className="w-14 h-14 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded bg-muted flex items-center justify-center shrink-0">
                      {p.is_service ? <Wrench className="h-5 w-5 text-muted-foreground" /> : <Package className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate">{getName(p)}</p>
                    <p className="text-lg font-bold text-primary mt-0.5">{fn(p.price)}</p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                      <span>{t("common.quantity")}: <strong className="font-semibold">{fn0(p.quantity)}</strong></span>
                      {!!p.is_service && <Wrench className="h-3 w-3" />}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(p)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        message={`Delete ${selectedCount} selected products?`}
        onConfirm={bulkRemove}
      />
    </div>
  );
}
