import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Receipt, Search } from "lucide-react";
import { fn, fn0 } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";

export default function TaxReport() {
  const { t } = useI18n();
  const [taxReport, setTaxReport] = useState(null);
  const [taxFrom, setTaxFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 3); return d.toISOString().split("T")[0];
  });
  const [taxTo, setTaxTo] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => { loadTaxReport(); }, [taxFrom, taxTo]);

  function loadTaxReport() {
    api.get(`/reports/tax?from=${taxFrom}&to=${taxTo}`).then(setTaxReport);
  }

  function mergeMonths() {
    if (!taxReport) return [];
    const map = {};
    for (const m of taxReport.monthlyBreakdown) map[m.month] = { month: m.month, sales: m.sales, output_vat: m.output_vat, sales_count: m.invoice_count, purchases: 0, input_vat: 0, purchases_count: 0 };
    for (const m of taxReport.monthlyPurchases) {
      if (map[m.month]) { map[m.month].purchases = m.purchases; map[m.month].input_vat = m.input_vat; map[m.month].purchases_count = m.invoice_count; }
      else map[m.month] = { month: m.month, sales: 0, output_vat: 0, sales_count: 0, purchases: m.purchases, input_vat: m.input_vat, purchases_count: m.invoice_count };
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">الإقرار الضريبي</h2>
          <p className="text-muted-foreground">ضريبة القيمة المضافة (VAT)</p>
        </div>
        <ExportButtons data={mergeMonths()} columns={[
          { key: "month", label: "الشهر" },
          { key: "sales", label: "المبيعات", format: "number" },
          { key: "output_vat", label: "ضريبة المبيعات", format: "number" },
          { key: "purchases", label: "المشتريات", format: "number" },
          { key: "input_vat", label: "ضريبة المشتريات", format: "number" },
        ]} filename="tax-report" title="الإقرار الضريبي" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2"><Receipt className="h-5 w-5" />الإقرار الضريبي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4 mb-6">
            <div>
              <Label className="text-xs">من تاريخ</Label>
              <Input type="date" value={taxFrom} onChange={(e) => setTaxFrom(e.target.value)} className="w-44" />
            </div>
            <div>
              <Label className="text-xs">إلى تاريخ</Label>
              <Input type="date" value={taxTo} onChange={(e) => setTaxTo(e.target.value)} className="w-44" />
            </div>
            <Button variant="outline" size="sm" onClick={loadTaxReport}><Search className="h-4 w-4 ml-1" />عرض</Button>
          </div>

          {taxReport && (
            <>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">ضريبة المبيعات (خرج)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{fn(taxReport.outputVAT.tax_amount)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      إجمالي المبيعات الخاضعة: {fn(taxReport.outputVAT.subtotal)} | عدد الفواتير: {fn0(taxReport.outputVAT.invoice_count)}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-green-700">ضريبة المشتريات (دخل)</CardTitle></CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{fn(taxReport.inputVAT.tax_amount)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      إجمالي المشتريات الخاضعة: {fn(taxReport.inputVAT.subtotal)} | عدد الفواتير: {fn0(taxReport.inputVAT.invoice_count)}
                    </div>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${taxReport.netPayable >= 0 ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-white' : 'border-blue-200 bg-gradient-to-br from-blue-50 to-white'}`}>
                  <CardHeader className="pb-2"><CardTitle className={`text-sm ${taxReport.netPayable >= 0 ? 'text-orange-700' : 'text-blue-700'}`}>صافي الضريبة المستحقة</CardTitle></CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${taxReport.netPayable >= 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                      {taxReport.netPayable >= 0 ? fn(taxReport.netPayable) : `(${fn(Math.abs(taxReport.netPayable))})`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {taxReport.netPayable >= 0 ? 'مبلغ مستحق للحكومة' : 'مبلغ قابل للاسترداد'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-sm">تفصيل شهري</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الشهر</TableHead>
                        <TableHead className="text-start">المبيعات</TableHead>
                        <TableHead className="text-start">ضريبة المبيعات</TableHead>
                        <TableHead className="text-start">المشتريات</TableHead>
                        <TableHead className="text-start">ضريبة المشتريات</TableHead>
                        <TableHead className="text-start">صافي الضريبة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mergeMonths().map((m) => {
                        const net = m.output_vat - m.input_vat;
                        return (
                          <TableRow key={m.month}>
                            <TableCell className="font-medium">{m.month}</TableCell>
                            <TableCell className="font-mono text-xs">{fn(m.sales)}</TableCell>
                            <TableCell className="font-mono text-xs text-red-600">{fn(m.output_vat)}</TableCell>
                            <TableCell className="font-mono text-xs">{fn(m.purchases)}</TableCell>
                            <TableCell className="font-mono text-xs text-green-600">{fn(m.input_vat)}</TableCell>
                            <TableCell className="font-mono text-xs">
                              <span className={net >= 0 ? "text-orange-600 font-medium" : "text-blue-600 font-medium"}>
                                {net >= 0 ? fn(net) : `(${fn(Math.abs(net))})`}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {mergeMonths().length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-4">لا توجد معاملات خاضعة للضريبة في هذه الفترة</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
