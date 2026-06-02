import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { useSort } from "@/lib/useSort";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowUpDown } from "lucide-react";
import { fn } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";

const ACCOUNT_COLORS = {
  asset: "bg-blue-100 text-blue-700",
  liability: "bg-orange-100 text-orange-700",
  equity: "bg-green-100 text-green-700",
  income: "bg-emerald-100 text-emerald-700",
  expense: "bg-red-100 text-red-700",
};

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

export default function TrialBalance() {
  const { t, locale } = useI18n();
  const [data, setData] = useState([]);
  const [totals, setTotals] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { sorted, toggle, getIndicator } = useSort(data, "code");

  function load() {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    api.getTrialBalance(params).then((res) => {
      setData(res.rows);
      setTotals(res.totals);
    });
  }

  useEffect(load, []);

  const typeLabel = (type) => {
    const labels = {
      asset: locale === "ar" ? "أصل" : "Asset",
      liability: locale === "ar" ? "خصم" : "Liability",
      equity: locale === "ar" ? "حق ملكية" : "Equity",
      income: locale === "ar" ? "إيراد" : "Income",
      expense: locale === "ar" ? "مصروف" : "Expense",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("trialBalance.title")}</h2>
          <p className="text-muted-foreground">{t("trialBalance.subtitle")}</p>
        </div>
        <ExportButtons data={sorted} columns={[
          { key: "code", label: t("common.code") },
          { key: "name", label: t("common.name") },
          { key: "type", label: t("common.type") },
          { key: "debit_total", label: t("trialBalance.debit"), format: "number" },
          { key: "credit_total", label: t("trialBalance.credit"), format: "number" },
          { key: "balance", label: t("trialBalance.balance"), format: "number" },
        ]} filename="trial-balance" title={t("trialBalance.title")} />
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <Th sortKey="code" toggle={toggle} indicator={getIndicator}>{t("common.code")}</Th>
                <Th sortKey="name" toggle={toggle} indicator={getIndicator}>{t("common.name")}</Th>
                <Th sortKey="type" toggle={toggle} indicator={getIndicator}>{t("common.type")}</Th>
                <Th sortKey="debit_total" toggle={toggle} indicator={getIndicator}>{t("trialBalance.debit")}</Th>
                <Th sortKey="credit_total" toggle={toggle} indicator={getIndicator}>{t("trialBalance.credit")}</Th>
                <Th sortKey="balance" toggle={toggle} indicator={getIndicator}>{t("trialBalance.balance")}</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
              ) : sorted.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-sm">{row.code}</TableCell>
                  <TableCell>{locale === "ar" ? (row.name || row.name_en) : (row.name_en || row.name)}</TableCell>
                  <TableCell><Badge variant="outline" className={ACCOUNT_COLORS[row.type]}>{typeLabel(row.type)}</Badge></TableCell>
                  <TableCell className="text-end">{row.debit_total ? fn(row.debit_total) : "-"}</TableCell>
                  <TableCell className="text-end">{row.credit_total ? fn(row.credit_total) : "-"}</TableCell>
                  <TableCell className={`text-end font-bold ${row.balance > 0 ? "text-blue-600" : row.balance < 0 ? "text-red-600" : ""}`}>
                    {row.balance ? fn(row.balance) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totals && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-blue-700">{t("trialBalance.debit")}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-600">{fn(totals.total_debit)}</div></CardContent>
          </Card>
          <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-orange-700">{t("trialBalance.credit")}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold text-orange-600">{fn(totals.total_credit)}</div></CardContent>
          </Card>
          <Card className={(totals.total_balance === 0 ? "border-green-200 bg-gradient-to-br from-green-50 to-white" : "border-red-200 bg-gradient-to-br from-red-50 to-white")}>
            <CardHeader className="pb-2"><CardTitle className={"text-sm " + (totals.total_balance === 0 ? "text-green-700" : "text-red-700")}>{t("trialBalance.balance")}</CardTitle></CardHeader>
            <CardContent><div className={"text-2xl font-bold " + (totals.total_balance === 0 ? "text-green-600" : "text-red-600")}>{fn(totals.total_balance)}</div></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}