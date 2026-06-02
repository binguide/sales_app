import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fn, fn0 } from "@/lib/format";
import { Wallet, ArrowLeft } from "lucide-react";

export default function POSSessionDetail() {
  const { id } = useParams();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => { api.getSession(id).then(setData); }, [id]);

  if (!data) return <div className="p-8 text-center text-muted-foreground">{t("common.loading")}</div>;

  const isAr = locale === "ar";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7" />{t("pos.sessionDetail")} #{data.id}
          </h2>
          <p className="text-muted-foreground">{data.user_name} - {new Date(data.opened_at).toLocaleString(isAr ? "ar-SA" : "en-US")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/pos/sessions")}>
            <ArrowLeft className="h-4 w-4 ml-2" />{t("pos.sessions")}
          </Button>
          <Button variant="outline" onClick={() => navigate("/pos")}>
            {t("pos.backToPOS")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">{t("pos.openingBalance")}</CardTitle></CardHeader>
          <CardContent className="py-2"><p className="text-2xl font-bold">{fn(data.opening_balance)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">{t("pos.totalSales")}</CardTitle></CardHeader>
          <CardContent className="py-2"><p className="text-2xl font-bold">{fn(data.total_sales)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">{t("pos.totalCash")}</CardTitle></CardHeader>
          <CardContent className="py-2"><p className="text-2xl font-bold">{fn(data.total_cash)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm text-muted-foreground">{t("pos.totalTax")}</CardTitle></CardHeader>
          <CardContent className="py-2"><p className="text-2xl font-bold">{fn(data.total_tax)}</p></CardContent>
        </Card>
      </div>

      {/* Expected vs Actual */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-muted-foreground">{t("pos.expectedClosing")}</p>
              <p className="text-xl font-bold">{fn(data.expected_closing || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("pos.actualClosing")}</p>
              <p className="text-xl font-bold">{fn(data.actual_closing || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("pos.difference")}</p>
              <p className={`text-xl font-bold ${(data.difference || 0) > 0 ? "text-red-600" : (data.difference || 0) < 0 ? "text-green-600" : ""}`}>
                {fn(data.difference || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales in this session */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">{t("pos.sessionSales")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>{t("common.id")}</TableHead><TableHead>{t("sales.customer")}</TableHead><TableHead>{t("common.total")}</TableHead><TableHead>{t("common.date")}</TableHead><TableHead>{t("common.status")}</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(data.sales || []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
              ) : data.sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.id}</TableCell>
                  <TableCell>{s.customer_name}</TableCell>
                  <TableCell>{fn(s.total)}</TableCell>
                  <TableCell>{new Date(s.date).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</TableCell>
                  <TableCell><Badge variant={s.status === "completed" ? "success" : "secondary"}>{s.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cash Log */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">{t("pos.cashLog")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>{t("common.date")}</TableHead><TableHead>{t("common.type")}</TableHead><TableHead>{t("common.amount")}</TableHead><TableHead>{t("common.reason")}</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(data.cashLog || []).length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
              ) : data.cashLog.map((cl) => (
                <TableRow key={cl.id}>
                  <TableCell>{new Date(cl.created_at).toLocaleString(isAr ? "ar-SA" : "en-US")}</TableCell>
                  <TableCell>
                    <Badge variant={cl.type === "in" ? "success" : "destructive"}>
                      {cl.type === "in" ? t("pos.cashIn") : t("pos.cashOut")}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{fn(cl.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{cl.reason || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Methods Summary */}
      <Card>
        <CardHeader className="py-3"><CardTitle className="text-base">{t("pos.paymentsSummary")}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>{t("pos.paymentMethod")}</TableHead><TableHead>{t("common.total")}</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(data.payments || []).length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
              ) : (
                Object.entries(
                  (data.payments || []).reduce((acc, p) => {
                    const key = isAr ? (p.name || p.name_en) : (p.name_en || p.name);
                    acc[key] = (acc[key] || 0) + p.amount;
                    return acc;
                  }, {})
                ).map(([name, total]) => (
                  <TableRow key={name}>
                    <TableCell>{name}</TableCell>
                    <TableCell className="font-medium">{fn(total)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}