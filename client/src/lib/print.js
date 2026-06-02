import { fn, fn0 } from "./format";

export function printInvoice(data, type, locale) {
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const titles = {
    sale: isAr ? "فاتورة مبيعات" : "Sales Invoice",
    purchase: isAr ? "فاتورة مشتريات" : "Purchase Invoice",
    "sales-return": isAr ? "مرتجع مبيعات" : "Sales Return",
    "purchase-return": isAr ? "مرتجع مشتريات" : "Purchase Return",
  };

  const partyLabel = type === "sale" || type === "sales-return"
    ? (isAr ? "العميل" : "Customer")
    : (isAr ? "المورد" : "Supplier");

  const partyName = data.customer_name || data.supplier_name || "-";
  const itemsKey = type === "sale" ? "sale_items" : type === "purchase" ? "purchase_items" : "items";
  const items = data[itemsKey] || data.items || [];
  const taxRate = data.tax_rate || 0;
  const currencySymbol = data.currency_symbol || "";

  const discountAmount = data.discount_amount || 0;
  const payments = data.payments || [];

  let itemRows = items.map((item, i) => {
    const itemTotal = item.price * item.quantity;
    const itemTax = itemTotal * (taxRate / 100);
    return `<tr>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:${isAr ? "right" : "left"}">${item.product_name}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${fn0(item.quantity)}</td>
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${fn(item.price)}</td>
      ${taxRate > 0 ? `<td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${fn(itemTax)}</td>` : ""}
      <td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${fn(itemTotal)}</td>
    </tr>`;
  }).join("");

  let paymentRows = payments.map((p) => {
    const pmName = isAr ? (p.payment_method_name || p.payment_method_name_en) : (p.payment_method_name_en || p.payment_method_name);
    return `<tr><td style="padding:4px 8px;border:1px solid #ddd">${pmName}</td><td style="padding:4px 8px;border:1px solid #ddd;text-align:center">${fn(p.amount)}</td></tr>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${titles[type]} #${data.id}</title>
  <style>
    @page { margin: 15mm; }
    body { margin:0;padding:20px;font-family:${isAr ? "'Traditional Arabic','Arial'" : "'Arial','Helvetica'"},sans-serif;font-size:13px;color:#222; }
    .header { text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:2px solid #333; }
    .header h1 { margin:0;font-size:22px; }
    .header .meta { font-size:12px;color:#666;margin-top:4px; }
    .info { display:flex;justify-content:space-between;margin-bottom:15px;font-size:13px; }
    .info div { flex:1; }
    table { width:100%;border-collapse:collapse;margin-top:10px; }
    th { background:#f5f5f5;padding:8px;border:1px solid #ddd;font-weight:bold; }
    td { padding:6px 8px;border:1px solid #ddd; }
    .totals { margin-top:15px;text-align:${isAr ? "left" : "right"}; }
    .totals div { margin:3px 0; }
    .total-line { font-size:16px;font-weight:bold;margin-top:5px;padding-top:5px;border-top:2px solid #333; }
    .footer { text-align:center;margin-top:30px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:10px; }
    .tax-note { font-size:11px;color:#888;margin-top:10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${titles[type]}</h1>
    <div class="meta">#${fn0(data.id)} | ${new Date(data.date).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</div>
  </div>
  <div class="info">
    <div><strong>${partyLabel}:</strong> ${partyName}</div>
    <div>${data.payment_method_name ? `<strong>${isAr ? "طريقة الدفع" : "Payment"}:</strong> ${data.payment_method_name}` : ""}</div>
    <div>${currencySymbol ? `<strong>${isAr ? "العملة" : "Currency"}:</strong> ${data.currency_code || ""} ${currencySymbol}` : ""}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${isAr ? "الصنف" : "Item"}</th>
        <th>${isAr ? "الكمية" : "Qty"}</th>
        <th>${isAr ? "السعر" : "Price"}</th>
        ${taxRate > 0 ? `<th>${isAr ? "الضريبة" : "Tax"}</th>` : ""}
        <th>${isAr ? "الإجمالي" : "Total"}</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    ${taxRate > 0 ? `<div>${isAr ? "المجموع" : "Subtotal"}: ${fn(data.subtotal)} ${currencySymbol}</div>` : ""}
    ${discountAmount > 0 ? `<div style="color:#16a34a">${isAr ? "الخصم" : "Discount"}: -${fn(discountAmount)} ${currencySymbol}</div>` : ""}
    ${taxRate > 0 ? `<div style="color:#c2410c">${isAr ? "الضريبة" : "Tax"} (${taxRate}%): ${fn(data.tax_amount)} ${currencySymbol}</div>` : ""}
    <div class="total-line">${isAr ? "الإجمالي" : "Total"}: ${fn(data.total)} ${currencySymbol}</div>
  </div>
  ${paymentRows ? `
  <div style="margin-top:15px">
    <h3 style="font-size:14px;font-weight:bold;margin-bottom:5px">${isAr ? "طرق الدفع" : "Payments"}</h3>
    <table style="width:100%;border-collapse:collapse">
      <thead><tr><th style="padding:4px 8px;border:1px solid #ddd;background:#f5f5f5;text-align:${isAr ? "right" : "left"}">${isAr ? "الطريقة" : "Method"}</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f5f5f5">${isAr ? "المبلغ" : "Amount"}</th></tr></thead>
      <tbody>${paymentRows}</tbody>
    </table>
  </div>` : ""}
  <div class="footer">${isAr ? "شكراً لتعاملكم" : "Thank you for your business"}</div>
  <script>window.onload=function(){window.print();window.close();}<\/script>
</body>
</html>`;

  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}
