import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { fn } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";

export default function CashFlow() {
  const { t, locale } = useI18n();
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function load() {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    api.getCashFlow(params).then(setData);
  }

  useEffect(load, []);

  const allRows = data ? [...data.inflows.map(r => ({ ...r, rowType: "inflow" })), ...data.outflows.map(r => ({ ...r, rowType: "outflow" }))] : [];

  const row = (label, amount, isTotal = false, icon = null) => (
    <TableRow className={isTotal ? "font-bold border-t-2" : ""}>
      <TableCell>
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
      </TableCell>
      <TableCell className="text-end font-bold">{fn(amount)}</TableCell>
    </TableRow>
  );

  const SectionBadge = ({ label, color }) => (
    <div className="flex items-center gap-2 mb-2">
      <div className={`w-1 h-6 rounded-full ${color}`} />
      <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("cashFlow.title")}</h2>
          <p className="text-muted-foreground">{t("cashFlow.subtitle")}</p>
        </div>
        <ExportButtons data={allRows} columns={[
          { key: "rowType", label: t("cashFlow.type") },
          { key: locale === "ar" ? "ar" : "en", label: t("common.name") },
          { key: "amount", label: t("common.amount"), format: "number" },
        ]} filename="cash-flow" title={t("cashFlow.title")} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">{t("common.filters")}</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div><label className="text-sm font-medium">{t("common.date")}</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><label className="text-sm font-medium">{t("common.to")}</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <Button onClick={load}><Search className="h-4 w-4 ml-1" />{t("common.search")}</Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardHeader className="pb-2"><CardTitle className="text-lg text-green-700">{locale === "ar" ? "الرصيد الافتتاحي" : "Opening Balance"}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{fn(data.opening)}</div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-2"><CardTitle className="text-lg text-blue-700">{locale === "ar" ? "صافي التدفق" : "Net Change"}</CardTitle></CardHeader>
            <CardContent>
              <div className={"text-3xl font-bold " + (data.net_change >= 0 ? "text-blue-600" : "text-red-600")}>
                {fn(data.net_change)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="pb-2"><CardTitle className="text-lg text-purple-700">{locale === "ar" ? "الرصيد الختامي" : "Closing Balance"}</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{fn(data.closing)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{locale === "ar" ? "تفاصيل التدفقات النقدية" : "Cash Flow Details"}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{locale === "ar" ? "البيان" : "Description"}</TableHead>
                  <TableHead className="text-end">{locale === "ar" ? "المبلغ" : "Amount"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-green-50/50">
                  <TableCell colSpan={2}>
                    <SectionBadge label={locale === "ar" ? "التدفقات النقدية الواردة" : "CASH INFLOWS"} color="bg-green-500" />
                  </TableCell>
                </TableRow>
                {data.inflows.filter(r => r.amount !== 0).length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-3">{t("common.noData")}</TableCell></TableRow>
                ) : data.inflows.filter(r => r.amount !== 0).map((r) => row(locale === "ar" ? r.ar : r.en, r.amount, false, <ArrowUpRight className="h-4 w-4 text-green-600" />))}
                {row(locale === "ar" ? "إجمالي التدفقات الواردة" : "Total Inflows", data.total_inflows, true)}

                <TableRow className="bg-red-50/50">
                  <TableCell colSpan={2}>
                    <SectionBadge label={locale === "ar" ? "التدفقات النقدية الصادرة" : "CASH OUTFLOWS"} color="bg-red-500" />
                  </TableCell>
                </TableRow>
                {data.outflows.filter(r => r.amount !== 0).length === 0 ? (
                  <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-3">{t("common.noData")}</TableCell></TableRow>
                ) : data.outflows.filter(r => r.amount !== 0).map((r) => row(locale === "ar" ? r.ar : r.en, r.amount, false, <ArrowDownRight className="h-4 w-4 text-red-600" />))}
                {row(locale === "ar" ? "إجمالي التدفقات الصادرة" : "Total Outflows", data.total_outflows, true)}

                <TableRow className="bg-blue-50 border-t-2 border-blue-200">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-700">{locale === "ar" ? "صافي التدفق النقدي" : "Net Cash Flow"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-end">
                    <span className={"font-bold text-lg " + (data.net_change >= 0 ? "text-blue-600" : "text-red-600")}>
                      {fn(data.net_change)}
                    </span>
                  </TableCell>
                </TableRow>

                <TableRow className="bg-green-50 border-t-2 border-green-200">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-700">{locale === "ar" ? "رصيد النقدية أول المدة" : "Beginning Cash"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-end font-bold text-green-600 text-lg">{fn(data.opening)}</TableCell>
                </TableRow>

                <TableRow className="bg-purple-50 border-t-2 border-purple-200">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-700">{locale === "ar" ? "رصيد النقدية آخر المدة" : "Ending Cash"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-end font-bold text-purple-600 text-lg">{fn(data.closing)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}