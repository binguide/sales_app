import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { fn } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";

const TYPE_COLORS = {
  asset: "border-blue-200 bg-gradient-to-br from-blue-50 to-white",
  liability: "border-orange-200 bg-gradient-to-br from-orange-50 to-white",
  equity: "border-green-200 bg-gradient-to-br from-green-50 to-white",
};

export default function BalanceSheet() {
  const { t, locale } = useI18n();
  const [data, setData] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function load() {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    api.getBalanceSheet(params).then(setData);
  }

  useEffect(load, []);

  const sectionRows = (items) => items.filter((r) => r.balance !== 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("balanceSheet.title")}</h2>
          <p className="text-muted-foreground">{t("balanceSheet.subtitle")}</p>
        </div>
        <ExportButtons data={data ? [...data.assets, ...data.liabilities, ...data.equity] : []} columns={[
          { key: "code", label: t("common.code") },
          { key: "name", label: t("common.name") },
          { key: "balance", label: t("balanceSheet.balance"), format: "number" },
        ]} filename="balance-sheet" title={t("balanceSheet.title")} />
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
        <div className="space-y-4">
          <Card className={TYPE_COLORS.asset}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-blue-700">{locale === "ar" ? "الأصول" : "Assets"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.code")}</TableHead>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead className="text-end">{t("balanceSheet.balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!data || sectionRows(data.assets).length === 0) ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">{t("common.noData")}</TableCell></TableRow>
                  ) : sectionRows(data.assets).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm">{row.code}</TableCell>
                      <TableCell>{locale === "ar" ? (row.name || row.name_en) : (row.name_en || row.name)}</TableCell>
                      <TableCell className="text-end font-bold text-blue-600">{fn(row.balance)}</TableCell>
                    </TableRow>
                  ))}
                  {data && <TableRow className="font-bold border-t-2"><TableCell /><TableCell>{locale === "ar" ? "إجمالي الأصول" : "Total Assets"}</TableCell><TableCell className="text-end text-blue-700">{fn(data.totals.total_assets)}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className={TYPE_COLORS.liability}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-orange-700">{locale === "ar" ? "الخصوم" : "Liabilities"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.code")}</TableHead>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead className="text-end">{t("balanceSheet.balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!data || sectionRows(data.liabilities).length === 0) ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">{t("common.noData")}</TableCell></TableRow>
                  ) : sectionRows(data.liabilities).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm">{row.code}</TableCell>
                      <TableCell>{locale === "ar" ? (row.name || row.name_en) : (row.name_en || row.name)}</TableCell>
                      <TableCell className="text-end font-bold text-orange-600">{fn(row.balance)}</TableCell>
                    </TableRow>
                  ))}
                  {data && <TableRow className="font-bold border-t-2"><TableCell /><TableCell>{locale === "ar" ? "إجمالي الخصوم" : "Total Liabilities"}</TableCell><TableCell className="text-end text-orange-700">{fn(data.totals.total_liabilities)}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className={TYPE_COLORS.equity}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-green-700">{locale === "ar" ? "حقوق الملكية" : "Equity"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.code")}</TableHead>
                    <TableHead>{t("common.name")}</TableHead>
                    <TableHead className="text-end">{t("balanceSheet.balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!data || sectionRows(data.equity).length === 0) ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">{t("common.noData")}</TableCell></TableRow>
                  ) : sectionRows(data.equity).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm">{row.code}</TableCell>
                      <TableCell>{locale === "ar" ? (row.name || row.name_en) : (row.name_en || row.name)}</TableCell>
                      <TableCell className="text-end font-bold text-green-600">{fn(row.balance)}</TableCell>
                    </TableRow>
                  ))}
                  {data && <TableRow className="font-bold border-t-2"><TableCell /><TableCell>{locale === "ar" ? "إجمالي حقوق الملكية" : "Total Equity"}</TableCell><TableCell className="text-end text-green-700">{fn(data.totals.total_equity)}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {data && (
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-2"><CardTitle className="text-lg text-purple-700">{locale === "ar" ? "معادلة الميزانية" : "Balance Sheet Equation"}</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center text-xl">
              <span className="font-bold text-blue-600">{locale === "ar" ? "الأصول" : "Assets"}: {fn(data.totals.total_assets)}</span>
              <span className="mx-4 text-muted-foreground">=</span>
              <span className="font-bold text-orange-600">{locale === "ar" ? "الخصوم" : "Liabilities"}: {fn(data.totals.total_liabilities)}</span>
              <span className="mx-2 text-muted-foreground">+</span>
              <span className="font-bold text-green-600">{locale === "ar" ? "حقوق الملكية" : "Equity"}: {fn(data.totals.total_equity)}</span>
              <span className="mx-4 text-muted-foreground">=</span>
              <span className={"font-bold " + (data.totals.total_assets === data.totals.total_liabilities + data.totals.total_equity ? "text-green-600" : "text-red-600")}>
                {fn(data.totals.total_liabilities + data.totals.total_equity)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}