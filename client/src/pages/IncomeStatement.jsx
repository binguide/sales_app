import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { fn } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";

export default function IncomeStatement() {
  const { t, locale } = useI18n();
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function load() {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    api.getIncomeStatement(params).then(setData);
  }

  useEffect(load, []);

  const sectionRows = (items) => items.filter((r) => r.balance !== 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("incomeStatement.title")}</h2>
          <p className="text-muted-foreground">{t("incomeStatement.subtitle")}</p>
        </div>
        <ExportButtons data={data ? [...data.income, ...data.expenses] : []} columns={[
          { key: "code", label: t("common.code") },
          { key: "name", label: t("common.name") },
          { key: "balance", label: t("incomeStatement.balance"), format: "number" },
        ]} filename="income-statement" title={t("incomeStatement.title")} />
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-emerald-700 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {locale === "ar" ? "الإيرادات" : "Income"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.code")}</TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead className="text-end">{t("incomeStatement.balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!data || sectionRows(data.income).length === 0) ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">{t("common.noData")}</TableCell></TableRow>
                ) : sectionRows(data.income).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>{locale === "ar" ? (row.name || row.name_en) : (row.name_en || row.name)}</TableCell>
                    <TableCell className="text-end font-bold text-emerald-600">{fn(row.balance)}</TableCell>
                  </TableRow>
                ))}
                {data && <TableRow className="font-bold border-t-2"><TableCell /><TableCell>{locale === "ar" ? "إجمالي الإيرادات" : "Total Income"}</TableCell><TableCell className="text-end text-emerald-700">{fn(data.totals.total_income)}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-red-700 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              {locale === "ar" ? "المصروفات" : "Expenses"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.code")}</TableHead>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead className="text-end">{t("incomeStatement.balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!data || sectionRows(data.expenses).length === 0) ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">{t("common.noData")}</TableCell></TableRow>
                ) : sectionRows(data.expenses).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.code}</TableCell>
                    <TableCell>{locale === "ar" ? (row.name || row.name_en) : (row.name_en || row.name)}</TableCell>
                    <TableCell className="text-end font-bold text-red-600">{fn(row.balance)}</TableCell>
                  </TableRow>
                ))}
                {data && <TableRow className="font-bold border-t-2"><TableCell /><TableCell>{locale === "ar" ? "إجمالي المصروفات" : "Total Expenses"}</TableCell><TableCell className="text-end text-red-700">{fn(data.totals.total_expenses)}</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {data && (
        <Card className={(data.totals.net_income >= 0 ? "border-green-200 bg-gradient-to-br from-green-50 to-white" : "border-red-200 bg-gradient-to-br from-red-50 to-white")}>
          <CardHeader className="pb-2">
            <CardTitle className={"text-lg " + (data.totals.net_income >= 0 ? "text-green-700" : "text-red-700")}>
              {locale === "ar" ? "صافي الدخل" : "Net Income"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className={"text-4xl font-bold " + (data.totals.net_income >= 0 ? "text-green-600" : "text-red-600")}>
                {data.totals.net_income >= 0 ? "" : "-"}{fn(Math.abs(data.totals.net_income))}
              </div>
              <Badge variant={data.totals.net_income >= 0 ? "default" : "destructive"} className="mt-2">
                {data.totals.net_income >= 0
                  ? (locale === "ar" ? "ربح" : "Profit")
                  : (locale === "ar" ? "خسارة" : "Loss")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}