import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fn } from "@/lib/format";
import { Wallet, ArrowLeft } from "lucide-react";

export default function POSSessions() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);

  useEffect(() => { api.getSessions().then(setSessions); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7" />{t("pos.sessions")}
          </h2>
          <p className="text-muted-foreground">{t("pos.sessionsSubtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/pos")}>
          <ArrowLeft className="h-4 w-4 ml-2" />{t("pos.backToPOS")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm text-muted-foreground">
                <th className="text-end p-3 font-medium">#</th>
                <th className="text-end p-3 font-medium">{t("common.user")}</th>
                <th className="text-end p-3 font-medium">{t("common.date")}</th>
                <th className="text-end p-3 font-medium">{t("pos.openingBalance")}</th>
                <th className="text-end p-3 font-medium">{t("pos.totalSales")}</th>
                <th className="text-end p-3 font-medium">{t("pos.totalCash")}</th>
                <th className="text-end p-3 font-medium">{t("pos.difference")}</th>
                <th className="text-end p-3 font-medium">{t("common.status")}</th>
                <th className="text-end p-3 font-medium">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-muted-foreground py-8">{t("common.noData")}</td></tr>
              ) : sessions.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium">{s.id}</td>
                  <td className="p-3">{s.user_name}</td>
                  <td className="p-3">{new Date(s.opened_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</td>
                  <td className="p-3">{fn(s.opening_balance)}</td>
                  <td className="p-3">{fn(s.total_sales)}</td>
                  <td className="p-3">{fn(s.total_cash)}</td>
                  <td className="p-3">
                    <span className={s.difference > 0 ? "text-red-600" : s.difference < 0 ? "text-green-600" : ""}>
                      {fn(s.difference || 0)}
                    </span>
                  </td>
                  <td className="p-3">
                    <Badge variant={s.status === "open" ? "success" : s.status === "closed" ? "secondary" : "destructive"}>
                      {s.status === "open" ? t("pos.open") : s.status === "closed" ? t("pos.closed") : t("pos.cancelled")}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/pos/sessions/${s.id}`)}>
                      {t("common.view")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}