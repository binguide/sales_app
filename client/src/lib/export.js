import * as XLSX from "xlsx";

export function exportToExcel(data, columns, filename, locale) {
  const wsData = [
    columns.map((c) => c.label),
    ...data.map((row) =>
      columns.map((c) => {
        let val = row[c.key] ?? "";
        if (c.format === "number") val = Number(val).toFixed(2);
        return val;
      })
    ),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const wscols = columns.map(() => ({ wch: 20 }));
  ws["!cols"] = wscols;
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function exportToPdf(data, columns, filename, title, locale) {
  const isRtl = locale === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const align = isRtl ? "right" : "left";

  const headCells = columns
    .map((c) => `<th style="padding:6px 5px;border:1px solid #fff;text-align:${align};background:#3b82f6;color:#fff;font-weight:bold;font-size:11px;font-family:Arial,sans-serif">${esc(c.label)}</th>`)
    .join("");

  const bodyRows = data
    .map((row) => {
      const cells = columns
        .map((c) => {
          let val = row[c.key] ?? "";
          if (c.format === "number") val = Number(val).toFixed(2);
          if (c.format === "int" && val != null && val !== "") val = Number(val).toLocaleString();
          return `<td style="padding:5px;border:1px solid #ccc;text-align:${align};font-size:10px;font-family:Arial,sans-serif">${esc(val)}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html dir="${dir}">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 10mm; }
  body { margin:0; padding:0; font-family: ${isRtl ? "Arial" : "Arial"}, sans-serif; }
  table { width:100%; border-collapse:collapse; }
  th, td { word-break:break-word; }
  h2 { text-align:center; margin:0 0 15px 0; font-size:16px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
${title ? `<h2>${esc(title)}</h2>` : ""}
<table>
<thead><tr>${headCells}</tr></thead>
<tbody>${bodyRows}</tbody>
</table>
<script>
window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
