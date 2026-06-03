import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2,
  Barcode, ArrowLeft, Percent, Package, DollarSign,
  PauseCircle, PlayCircle, LogOut, Wallet, Ban,
  CheckCircle,
} from "lucide-react";
import { fn, fn0 } from "@/lib/format";
import PriceKeypad from "@/components/PriceKeypad";

export default function Pos() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const barcodeRef = useRef(null);
  const canOverridePrice = user?.role === "admin" || user?.role === "manager";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [settingsData, setSettingsData] = useState({});
  const [currencies, setCurrencies] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [currencyId, setCurrencyId] = useState("");
  const [paying, setPaying] = useState(false);
  const [wholesaleMode, setWholesaleMode] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [cashType, setCashType] = useState("in");
  const [cashAmount, setCashAmount] = useState("");
  const [cashReason, setCashReason] = useState("");
  const [session, setSession] = useState(null);
  const [sessionOpening, setSessionOpening] = useState("0");
  const [posProfile, setPosProfile] = useState(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeActual, setCloseActual] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [splitPayments, setSplitPayments] = useState([]);
  const [discountType, setDiscountType] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [showHeld, setShowHeld] = useState(false);
  const [heldInvoices, setHeldInvoices] = useState([]);
  const [holdNote, setHoldNote] = useState("");
  const [priceOverrides, setPriceOverrides] = useState({});
  const [keypadTarget, setKeypadTarget] = useState(null);

  useEffect(() => {
    api.getProducts().then(setProducts);
    api.getCategories().then(setCategories);
    api.getCustomers().then(setCustomers);
    api.getWarehouses().then(setWarehouses);
    api.getSettings().then(setSettingsData);
    api.getCurrencies().then(setCurrencies);
    api.getPaymentMethods().then(setPaymentMethods);
    api.getActiveSession().then(setSession);
    api.getDefaultPosProfile().then((profile) => {
      if (profile) {
        setPosProfile(profile);
        if (profile.warehouse_id) setWarehouseId(String(profile.warehouse_id));
        if (profile.payment_method_id) setPaymentMethodId(String(profile.payment_method_id));
        if (profile.currency_id) setCurrencyId(String(profile.currency_id));
        if (profile.customer_id) setCustomerId(String(profile.customer_id));
      }
    });
  }, []);

  useEffect(() => {
    if (barcodeRef.current) barcodeRef.current.focus();
  }, []);

  const mainCurrency = currencies.find((c) => c.is_main) || currencies[0] || { symbol: "ر.س" };
  const selectedCurrency = currencies.find((c) => c.id === parseInt(currencyId)) || mainCurrency;
  const defaultTax = parseFloat(settingsData.default_tax_rate) || 0;

  const filtered = products.filter((p) => {
    if (activeCat && p.category_id !== activeCat) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (p.name + " " + (p.name_en || "")).toLowerCase();
    const bc = (p.barcode || "").toLowerCase();
    return name.includes(q) || bc.includes(q);
  });

  const inCartIds = new Set(cart.map((i) => i.product_id));

  const getPrice = useCallback((p) => {
    return wholesaleMode && p.wholesale_price > 0 ? p.wholesale_price : p.price;
  }, [wholesaleMode]);

  const getItemPrice = useCallback((item) => {
    const override = priceOverrides[item.product_id];
    return override !== undefined ? override : item.price;
  }, [priceOverrides]);

  const handlePriceOverride = useCallback((productId, value) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setPriceOverrides((prev) => ({ ...prev, [productId]: num }));
    }
  }, []);

  const addToCart = useCallback((p) => {
    const allowNeg = settingsData.allow_negative_stock === "1";
    if (!allowNeg && p.quantity <= 0) {
      toast(t("dashboard.outOfStock"), { type: "error" });
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === p.id);
      if (existing) {
        if (!allowNeg && existing.quantity >= p.quantity) {
          toast(t("dashboard.outOfStock"), { type: "error" });
          return prev;
        }
        return prev.map((i) =>
          i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, {
        product_id: p.id,
        product_name: p.name,
        product_name_en: p.name_en,
        price: getPrice(p),
        quantity: 1,
        max_qty: allowNeg ? 999999 : p.quantity,
      }];
    });
  }, [getPrice, t, settingsData.allow_negative_stock]);

  const handleBarcode = useCallback(async (val) => {
    if (!val) return;
    let p = products.find((x) => x.barcode === val);
    if (!p) {
      try {
        const res = await api.getProductByBarcode(val);
        if (res && res.id) {
          p = res;
          setProducts((prev) => {
            if (prev.find((x) => x.id === res.id)) return prev;
            return [...prev, res];
          });
        }
      } catch {}
    }
    if (p) {
      addToCart(p);
      setBarcode("");
      toast(`${p.name} - ${fn(getPrice(p))}`, { type: "success", duration: 1000 });
    } else {
      toast(t("pos.notFound"), { type: "error" });
      setBarcode("");
    }
  }, [products, addToCart, getPrice, t]);

  const updateQty = useCallback((productId, delta) => {
    const allowNeg = settingsData.allow_negative_stock === "1";
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty <= 0) return null;
        if (!allowNeg && newQty > i.max_qty) return i;
        return { ...i, quantity: newQty };
      }).filter(Boolean)
    );
  }, [settingsData.allow_negative_stock]);

  const setExactQty = useCallback((productId, newQty) => {
    const allowNeg = settingsData.allow_negative_stock === "1";
    setCart((prev) =>
      prev.map((i) => {
        if (i.product_id !== productId) return i;
        if (newQty <= 0) return null;
        if (!allowNeg && newQty > i.max_qty) return { ...i, quantity: i.max_qty };
        return { ...i, quantity: newQty };
      }).filter(Boolean)
    );
  }, [settingsData.allow_negative_stock]);

  const removeItem = useCallback((productId) => {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
    setPriceOverrides((prev) => {
      if (!(productId in prev)) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const subtotal = cart.reduce((s, i) => s + getItemPrice(i) * i.quantity, 0);
  let discountAmount = 0;
  if (discountType === "percent" && discountValue) {
    discountAmount = subtotal * (parseFloat(discountValue) / 100);
  } else if (discountType === "amount" && discountValue) {
    discountAmount = parseFloat(discountValue);
  }
  const taxAmount = (subtotal - discountAmount) * (defaultTax / 100);
  const total = subtotal + taxAmount - discountAmount;

  // Session management
  function openSession() {
    if (!sessionOpening && parseFloat(sessionOpening) <= 0) return toast("ادخل رصيد الافتتاح", { type: "error" });
    api.openSession({ user_name: "admin", opening_balance: parseFloat(sessionOpening) || 0 }).then((res) => {
      api.getActiveSession().then(setSession);
      setShowSessionDialog(false);
      toast(t("pos.sessionOpened"), { type: "success" });
    });
  }

  function doCloseSession() {
    api.closeSession(session.id, { actual_closing: parseFloat(closeActual) || 0, notes: closeNotes }).then(() => {
      setSession(null);
      setShowCloseDialog(false);
      toast(t("pos.sessionClosed"), { type: "success" });
    });
  }

  function doCashLog() {
    if (!cashAmount || parseFloat(cashAmount) <= 0) return toast("ادخل المبلغ", { type: "error" });
    api.addCashLog({ session_id: session.id, type: cashType, amount: parseFloat(cashAmount), reason: cashReason }).then(() => {
      api.getActiveSession().then(setSession);
      setShowCashDialog(false);
      setCashAmount("");
      setCashReason("");
      toast(cashType === "in" ? t("pos.cashAdded") : t("pos.cashWithdrawn"), { type: "success" });
    });
  }

  // Payment dialog
  function openPaymentDialog() {
    if (cart.length === 0) return toast(t("pos.emptyCart"), { type: "error" });
    // Initialize split payments from cart total
    const initialPmId = paymentMethodId ? parseInt(paymentMethodId) : (paymentMethods[0]?.id || "");
    setSplitPayments([{ payment_method_id: initialPmId, amount: total, currency_id: currencyId ? parseInt(currencyId) : null }]);
    setShowPaymentDialog(true);
  }

  function updateSplitPayment(index, field, value) {
    setSplitPayments((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  }

  function addSplitPayment() {
    const pmId = paymentMethodId ? parseInt(paymentMethodId) : (paymentMethods[0]?.id || "");
    setSplitPayments((prev) => [...prev, { payment_method_id: pmId, amount: 0, currency_id: currencyId ? parseInt(currencyId) : null }]);
  }

  function removeSplitPayment(index) {
    setSplitPayments((prev) => prev.filter((_, i) => i !== index));
  }

  const splitTotal = splitPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const splitDiff = total - splitTotal;

  function completeSaleWithPayments() {
    if (Math.abs(splitDiff) > 0.01) return toast(t("pos.paymentMismatch"), { type: "error" });
    if (!session) return toast("يجب فتح جلسة أولاً", { type: "error" });
    setPaying(true);
    const data = {
      customer_id: customerId ? parseInt(customerId) : null,
      warehouse_id: warehouseId ? parseInt(warehouseId) : null,
      payment_method_id: paymentMethodId ? parseInt(paymentMethodId) : null,
      currency_id: currencyId ? parseInt(currencyId) : null,
      tax_rate: defaultTax,
      discount_type: discountType || null,
      discount_value: discountValue ? parseFloat(discountValue) : 0,
      discount_amount: discountAmount,
      session_id: session.id,
      status: "completed",
      items: cart.map((i) => ({
        product_id: i.product_id,
        price: getItemPrice(i),
        original_price: i.price,
        quantity: i.quantity,
        tax_rate: defaultTax,
      })),
      payments: splitPayments.map((p) => ({
        payment_method_id: p.payment_method_id,
        amount: parseFloat(p.amount),
        currency_id: p.currency_id || null,
      })),
    };
    api.addSale(data).then((res) => {
      setCart([]);
      setDiscountType("");
      setDiscountValue("");
      setShowPaymentDialog(false);
      setPaying(false);
      api.getActiveSession().then(setSession);
      api.getProducts().then(setProducts);
      toast(`${t("pos.success")} #${res.id}`, { type: "success" });
    }).catch(() => {
      setPaying(false);
      toast("Error", { type: "error" });
    });
  }

  function doHold() {
    if (cart.length === 0) return toast(t("pos.emptyCart"), { type: "error" });
    if (!session) return toast("يجب فتح جلسة أولاً", { type: "error" });
    const data = {
      customer_id: customerId ? parseInt(customerId) : null,
      warehouse_id: warehouseId ? parseInt(warehouseId) : null,
      payment_method_id: paymentMethodId ? parseInt(paymentMethodId) : null,
      currency_id: currencyId ? parseInt(currencyId) : null,
      tax_rate: defaultTax,
      discount_type: discountType || null,
      discount_value: discountValue ? parseFloat(discountValue) : 0,
      discount_amount: discountAmount,
      session_id: session.id,
      status: "hold",
      hold_note: holdNote || null,
      items: cart.map((i) => ({
        product_id: i.product_id,
        price: getItemPrice(i),
        original_price: i.price,
        quantity: i.quantity,
        tax_rate: defaultTax,
      })),
    };
    api.addSale(data).then(() => {
      setCart([]);
      setDiscountType("");
      setDiscountValue("");
      setHoldNote("");
      toast(t("pos.held"), { type: "success" });
    });
  }

  function resumeHeldInvoice(sale) {
    setCart(sale.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product_name,
      product_name_en: item.product_name_en,
      price: item.price,
      quantity: item.quantity,
      max_qty: 999999,
    })));
    api.resumeSale(sale.id).then(() => {
      setShowHeld(false);
      loadHeld();
      toast(t("pos.resumed"), { type: "success" });
    });
  }

  function loadHeld() {
    api.getHeldInvoices().then(setHeldInvoices);
    setShowHeld(!showHeld);
  }

  const getName = (p) => locale === "ar" ? (p.product_name || p.product_name_en) : (p.product_name_en || p.product_name);

  // Session bar component
  function SessionBar() {
    if (!session) {
      return (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-amber-700 text-sm">
            <Ban className="h-4 w-4" />
            {t("pos.noActiveSession")}
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowSessionDialog(true)}>
            <Wallet className="h-3.5 w-3.5 ml-1" />
            {t("pos.openSession")}
          </Button>
        </div>
      );
    }
    const elapsed = Math.floor((new Date() - new Date(session.opened_at)) / 60000);
    return (
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-1.5 flex items-center justify-between shrink-0 text-sm">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-700 font-medium">
            <Wallet className="h-3.5 w-3.5" />
            {session.user_name}
          </span>
          <span className="text-muted-foreground">
            {t("pos.opened")}: {new Date(session.opened_at).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="text-muted-foreground">({elapsed} {t("common.minutes")})</span>
          <span className="text-muted-foreground">
            {t("pos.openingBalance")}: <strong>{fn(session.opening_balance)}</strong>
          </span>
          <span className="text-emerald-600 font-medium">
            {t("pos.totalSales")}: {fn(session.total_sales)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => { setCashType("in"); setShowCashDialog(true); }} className="h-7 text-xs">
            <Plus className="h-3 w-3 ml-1" />{t("pos.cashIn")}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setCashType("out"); setShowCashDialog(true); }} className="h-7 text-xs">
            <Minus className="h-3 w-3 ml-1" />{t("pos.cashOut")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCloseDialog(true)} className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50">
            <LogOut className="h-3 w-3 ml-1" />{t("pos.closeSession")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-indigo-50/20 overflow-hidden">
      <SessionBar />

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b px-4 py-2 flex items-center justify-between shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-primary flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t("pos.title")}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={showHeld ? "default" : "outline"} onClick={loadHeld} className="text-xs">
            <PauseCircle className="h-3.5 w-3.5 ml-1" />
            {t("pos.heldItems")}
            {heldInvoices.length > 0 && <Badge variant="secondary" className="mr-1 text-[10px] px-1">{heldInvoices.length}</Badge>}
          </Button>
          <Badge variant={wholesaleMode ? "default" : "outline"}
            className="cursor-pointer text-sm px-3 py-1.5"
            onClick={() => setWholesaleMode(!wholesaleMode)}>
            <Percent className="h-3.5 w-3.5 ml-1" />
            {t("pos.wholesale")}
          </Badge>
          <Combobox value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} className="w-32" searchPlaceholder={t("common.search")} placeholder={t("warehouses.title")}>
            <option value="">{t("warehouses.title")}</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{locale === "ar" ? (w.name || w.name_en) : (w.name_en || w.name)}</option>)}
          </Combobox>
          <Combobox value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className="w-32" searchPlaceholder={t("common.search")} placeholder={t("pos.paymentMethod")}>
            <option value="">{t("pos.paymentMethod")}</option>
            {paymentMethods.map((pm) => <option key={pm.id} value={pm.id}>{locale === "ar" ? (pm.name || pm.name_en) : (pm.name_en || pm.name)}</option>)}
          </Combobox>
          <Combobox value={currencyId} onChange={(e) => setCurrencyId(e.target.value)} className="w-28" searchPlaceholder={t("common.search")} placeholder={t("pos.currency")}>
            <option value="">{t("pos.currency")}</option>
            {currencies.map((c) => <option key={c.id} value={c.id}>{c.code} {c.symbol}</option>)}
          </Combobox>
          <Combobox value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-32" searchPlaceholder={t("common.search")} placeholder={t("pos.cash")}>
            <option value="">{t("pos.cash")}</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Combobox>
        </div>
      </header>

      {/* Held Invoices Panel */}
      {showHeld && heldInvoices.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 shrink-0">
          <div className="flex gap-2 overflow-x-auto">
            {heldInvoices.map((s) => (
              <Card key={s.id} className="p-2 flex items-center gap-3 shrink-0 cursor-pointer hover:bg-blue-100" onClick={() => resumeHeldInvoice(s)}>
                <PlayCircle className="h-4 w-4 text-blue-600" />
                <div className="text-xs">
                  <div className="font-medium">#{s.id} - {s.customer_name}</div>
                  <div className="text-muted-foreground">{fn(s.total)} {s.hold_note ? `- ${s.hold_note}` : ""}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main POS Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Products */}
        <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin shrink-0">
            <button
              onClick={() => setActiveCat(null)}
              className={"px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all btn-touch " +
                (!activeCat ? "bg-primary text-primary-foreground shadow-md" : "bg-white text-muted-foreground hover:bg-accent border")}
            >
              {t("pos.allCategories")}
            </button>
            {categories.map((c) => {
              const cName = locale === "ar" ? (c.name || c.name_en) : (c.name_en || c.name);
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCat(activeCat === c.id ? null : c.id)}
                  className={"px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all btn-touch border " +
                    (activeCat === c.id
                      ? "text-white shadow-md"
                      : "bg-white text-muted-foreground hover:bg-accent")}
                  style={activeCat === c.id ? { backgroundColor: c.color, borderColor: c.color } : {}}
                >
                  <span className="inline-block w-2 h-2 rounded-full ml-1.5" style={{ backgroundColor: c.color }} />
                  {cName}
                </button>
              );
            })}
          </div>

          {/* Search + Barcode */}
          <div className="flex gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("pos.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10 h-12 text-base rounded-xl"
              />
            </div>
            <div className="relative w-64">
              <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={barcodeRef}
                placeholder={t("pos.scanBarcode")}
                value={barcode}
                onChange={(e) => {
                  const val = e.target.value;
                  setBarcode(val);
                  if (val.length >= 8) handleBarcode(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleBarcode(barcode); }
                }}
                className="pr-10 h-12 text-base rounded-xl font-mono text-center"
                dir="ltr"
              />
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Package className="h-12 w-12 opacity-30" />
                <p>{t("common.noData")}</p>
              </div>
            ) : (
              <div className="pos-grid">
                  {filtered.map((p) => {
                  const inCart = inCartIds.has(p.id);
                  const pName = locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name);
                  const pPrice = getPrice(p);
                  const isOutOfStock = p.quantity <= 0;
                  const allowNeg = settingsData.allow_negative_stock === "1";
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className={"pos-product-card" + (inCart ? " selected" : "") + (isOutOfStock && !allowNeg ? " out-of-stock" : "")}
                      disabled={isOutOfStock && !allowNeg}
                    >
                      {p.category_color && (
                        <div className="cat-strip" style={{ backgroundColor: p.category_color }} />
                      )}
                      {p.image ? (
                        <img src={p.image} alt={pName} className="product-image" />
                      ) : (
                        <img src="/no-image.svg" alt={pName} className="product-image" />
                      )}
                      <span className="text-[11px] font-medium text-center leading-tight truncate w-full px-1">{pName}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-primary">{fn(pPrice)}</span>
                        {allowNeg ? (p.quantity > 0 && p.quantity <= 5 && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{fn0(p.quantity)}</Badge>
                        )) : (p.quantity <= 5 && (
                          <Badge variant={p.quantity === 0 ? "destructive" : "secondary"} className="text-[9px] px-1 py-0 h-4">
                            {p.quantity === 0 ? t("dashboard.outOfStock") : fn0(p.quantity)}
                          </Badge>
                        ))}
                      </div>
                      {inCart && (
                        <CheckCircle className="absolute top-1.5 right-1.5 h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Cart */}
        <div className="w-80 bg-white/90 backdrop-blur-sm border-l flex flex-col shrink-0">
          <div className="p-3 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              {t("pos.cart")}
              <Badge variant="secondary" className="text-xs">{cart.length}</Badge>
            </h2>
          </div>

          {/* Discount + Hold Note */}
          <div className="p-3 border-b bg-gray-50/50 space-y-2 shrink-0">
            <div className="flex gap-2">
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value)}
                className="w-20 text-xs rounded-md border border-input bg-background px-2 py-1"
              >
                <option value="">{t("pos.noDiscount")}</option>
                <option value="percent">%</option>
                <option value="amount">{selectedCurrency.symbol}</option>
              </select>
              <Input
                type="number"
                placeholder={t("pos.discount")}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                min="0"
                className="h-8 text-sm flex-1"
                disabled={!discountType}
              />
            </div>
            <Input
              placeholder={t("pos.holdNote") + "..."}
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <ShoppingCart className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t("pos.emptyCart")}</p>
              </div>
            ) : cart.map((item) => (
              <Card key={item.product_id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm line-clamp-1 flex-1">{getName(item)}</span>
                  <button onClick={() => removeItem(item.product_id)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    {canOverridePrice ? (
                      <>
                        <button
                          onClick={() => setKeypadTarget({ productId: item.product_id, mode: "price" })}
                          className="text-foreground font-semibold text-sm hover:text-primary cursor-pointer bg-transparent border-none p-0 truncate transition-colors"
                        >
                          {fn(priceOverrides[item.product_id] !== undefined ? priceOverrides[item.product_id] : item.price)}
                        </button>
                        {priceOverrides[item.product_id] !== undefined && (
                          <button
                            onClick={() => setPriceOverrides((prev) => { const n = { ...prev }; delete n[item.product_id]; return n; })}
                            className="text-destructive hover:text-destructive/80 shrink-0"
                            title={t("common.reset")}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">{fn(item.price)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.product_id, -1)}
                      className="w-8 h-8 rounded-full bg-accent flex items-center justify-center hover:bg-accent/80 active:scale-90 transition-all">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setKeypadTarget({ productId: item.product_id, mode: "quantity" })}
                      className="w-8 text-center font-bold text-base cursor-pointer bg-transparent border-none p-0 hover:text-primary transition-colors"
                    >
                      {fn0(item.quantity)}
                    </button>
                    <button onClick={() => updateQty(item.product_id, 1)}
                      className="w-8 h-8 rounded-full bg-accent flex items-center justify-center hover:bg-accent/80 active:scale-90 transition-all">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-bold text-sm text-left whitespace-nowrap">
                    {fn(getItemPrice(item) * item.quantity)}
                  </span>
                </div>
              </Card>
            ))}
          </div>

          {/* Total + Actions */}
          <div className="p-3 border-t bg-white space-y-2">
            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">{t("pos.discount")}</span>
                <span className="text-green-600">-{fn(discountAmount)} {selectedCurrency.symbol}</span>
              </div>
            )}
            {defaultTax > 0 && cart.length > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("pos.subtotal")}</span>
                  <span>{fn(subtotal)} {selectedCurrency.symbol}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t("pos.tax")} ({defaultTax}%)</span>
                  <span className="text-orange-600">{fn(taxAmount)} {selectedCurrency.symbol}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between pt-1 border-t">
              <span className="font-semibold">{t("pos.total")}</span>
              <span className="text-xl font-bold text-primary">{fn(total)} {selectedCurrency.symbol}</span>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={doHold}
                disabled={cart.length === 0 || !session}
                variant="outline"
                className="flex-1 h-12 text-sm font-semibold"
              >
                <PauseCircle className="h-4 w-4 ml-1" />
                {t("pos.hold")}
              </Button>
              <Button
                onClick={openPaymentDialog}
                disabled={cart.length === 0 || paying || !session}
                className="flex-[2] h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20"
              >
                {paying ? t("common.loading") : t("pos.pay")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Open Session Dialog */}
      {showSessionDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowSessionDialog(false)}>
          <div className="bg-white rounded-xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Wallet className="h-5 w-5" />{t("pos.openSession")}</h3>
            <Label className="text-sm text-muted-foreground">{t("pos.openingBalance")}</Label>
            <Input type="number" value={sessionOpening} onChange={(e) => setSessionOpening(e.target.value)} min="0" className="mb-4" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSessionDialog(false)}>{t("common.cancel")}</Button>
              <Button onClick={openSession}>{t("pos.openSession")}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Cash In/Out Dialog */}
      {showCashDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowCashDialog(false)}>
          <div className="bg-white rounded-xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {cashType === "in" ? t("pos.cashIn") : t("pos.cashOut")}
            </h3>
            <Label className="text-sm text-muted-foreground">{t("common.amount")}</Label>
            <Input type="number" value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} min="0" className="mb-3" />
            <Label className="text-sm text-muted-foreground">{t("common.reason")}</Label>
            <Input value={cashReason} onChange={(e) => setCashReason(e.target.value)} className="mb-4" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCashDialog(false)}>{t("common.cancel")}</Button>
              <Button onClick={doCashLog}>{t("common.save")}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Close Session Dialog */}
      {showCloseDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowCloseDialog(false)}>
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><LogOut className="h-5 w-5" />{t("pos.closeSession")}</h3>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between"><span>{t("pos.openingBalance")}:</span><span className="font-medium">{fn(session?.opening_balance)}</span></div>
              <div className="flex justify-between"><span>{t("pos.totalCash")}:</span><span className="font-medium">{fn(session?.total_cash)}</span></div>
              <div className="flex justify-between"><span>{t("pos.totalSales")}:</span><span className="font-medium">{fn(session?.total_sales)}</span></div>
              <div className="border-t pt-2 flex justify-between"><span>{t("pos.expectedClosing")}:</span><span className="font-bold">{fn((session?.opening_balance || 0) + (session?.total_cash || 0))}</span></div>
            </div>
            <Label className="text-sm text-muted-foreground">{t("pos.actualClosing")}</Label>
            <Input type="number" value={closeActual} onChange={(e) => setCloseActual(e.target.value)} min="0" className="mb-3" />
            <Label className="text-sm text-muted-foreground">{t("common.notes")}</Label>
            <Input value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} className="mb-4" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>{t("common.cancel")}</Button>
              <Button variant="destructive" onClick={doCloseSession}>{t("pos.closeSession")}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Price/Quantity Keypad */}
      <PriceKeypad
        open={keypadTarget !== null}
        mode={keypadTarget?.mode || "price"}
        value={
          keypadTarget
            ? (keypadTarget.mode === "quantity"
                ? (() => { const item = cart.find((i) => i.product_id === keypadTarget.productId); return item ? item.quantity : 1; })()
                : (keypadTarget.mode === "price"
                  ? (priceOverrides[keypadTarget.productId] !== undefined
                      ? priceOverrides[keypadTarget.productId]
                      : (() => { const item = cart.find((i) => i.product_id === keypadTarget.productId); return item ? item.price : 0; })())
                  : 0))
            : 0
        }
        currency={selectedCurrency.symbol}
        onConfirm={(v) => {
          if (!keypadTarget) return;
          if (keypadTarget.mode === "price") {
            handlePriceOverride(keypadTarget.productId, v);
          } else {
            setExactQty(keypadTarget.productId, v);
          }
          setKeypadTarget(null);
        }}
        onCancel={() => setKeypadTarget(null)}
      />

      {/* Payment Split Dialog */}
      {showPaymentDialog && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowPaymentDialog(false)}>
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t("pos.splitPayment")}
            </h3>

            <div className="mb-4 p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm"><span>{t("pos.subtotal")}:</span><span>{fn(subtotal)}</span></div>
              {discountAmount > 0 && <div className="flex justify-between text-sm text-green-600"><span>{t("pos.discount")}:</span><span>-{fn(discountAmount)}</span></div>}
              {defaultTax > 0 && <div className="flex justify-between text-sm text-orange-600"><span>{t("pos.tax")} ({defaultTax}%):</span><span>{fn(taxAmount)}</span></div>}
              <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>{t("pos.total")}:</span><span>{fn(total)} {selectedCurrency.symbol}</span></div>
            </div>

            <div className="space-y-2 mb-4">
              {splitPayments.map((sp, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={sp.payment_method_id}
                    onChange={(e) => updateSplitPayment(i, "payment_method_id", parseInt(e.target.value))}
                    className="flex-1 h-10 text-sm rounded-md border border-input bg-background px-3"
                  >
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>{locale === "ar" ? (pm.name || pm.name_en) : (pm.name_en || pm.name)}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    value={sp.amount}
                    onChange={(e) => updateSplitPayment(i, "amount", e.target.value)}
                    min="0"
                    className="w-24 h-10 text-sm"
                    placeholder="0"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeSplitPayment(i)} disabled={splitPayments.length <= 1}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" onClick={addSplitPayment} className="w-full mb-4">
              <Plus className="h-4 w-4 ml-1" />{t("pos.addPayment")}
            </Button>

            <div className="flex justify-between text-sm font-medium mb-4">
              <span>{t("pos.allocated")}:</span>
              <span className={Math.abs(splitDiff) < 0.01 ? "text-green-600" : "text-red-600"}>
                {fn(splitTotal)} / {fn(total)}
                {Math.abs(splitDiff) >= 0.01 && <span className="mr-2">({fn(splitDiff)} {t("pos.remaining")})</span>}
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>{t("common.cancel")}</Button>
              <Button onClick={completeSaleWithPayments} disabled={Math.abs(splitDiff) >= 0.01 || paying}>
                {paying ? t("common.loading") : t("pos.confirmPayment")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ children, className, ...props }) {
  return <label className={"block text-sm font-medium mb-1 " + (className || "")} {...props}>{children}</label>;
}