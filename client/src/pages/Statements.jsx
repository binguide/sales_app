import { useState, useEffect } from "react";
import { api } from "@/api";
import { useI18n } from "@/i18n/index.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Truck, BookOpen, UserCircle, Receipt, Search } from "lucide-react";
import { fn } from "@/lib/format";
import ExportButtons from "@/components/ExportButtons";

const typeLabels = {
  sale: { ar: "فاتورة مبيعات", en: "Sale Invoice", color: "text-green-600" },
  sales_return: { ar: "مرتجع مبيعات", en: "Sales Return", color: "text-red-600" },
  purchase: { ar: "فاتورة مشتريات", en: "Purchase Invoice", color: "text-orange-600" },
  purchase_return: { ar: "مرتجع مشتريات", en: "Purchase Return", color: "text-blue-600" },
  journal: { ar: "قيد يومية", en: "Journal Entry", color: "text-purple-600" },
};

export default function Statements() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState("customer");
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [partyId, setPartyId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getCustomers().then(setCustomers);
    api.getSuppliers().then(setSuppliers);
    api.getEmployees().then(setEmployees);
    api.getAccounts(true).then(setAccounts);
  }, []);

  function loadStatement() {
    if (!partyId) return;
    setLoading(true);
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const fns = {
      customer: api.getCustomerStatement,
      supplier: api.getSupplierStatement,
      employee: api.getEmployeeStatement,
      account: api.getAccountStatement,
    };
    fns[tab](parseInt(partyId), params).then((res) => {
      setData(res);
      setLoading(false);
    });
  }

  const tabs = [
    { key: "customer", label: t("statements.customers"), icon: Users },
    { key: "supplier", label: t("statements.suppliers"), icon: Truck },
    { key: "employee", label: t("statements.employees"), icon: UserCircle },
    { key: "account", label: t("statements.accounts"), icon: BookOpen },
  ];

  const partyLists = { customer: customers, supplier: suppliers, employee: employees, account: accounts };
  const partyLabels = {
    customer: t("statements.customer"),
    supplier: t("statements.supplier"),
    employee: t("statements.employee"),
    account: t("statements.account"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{t("statements.title")}</h2>
          <p className="text-muted-foreground">{t("statements.subtitle")}</p>
        </div>
        <ExportButtons data={data?.transactions || []} columns={[
          { key: "date", label: t("common.date") },
          { key: "type", label: t("statements.type") },
          { key: "ref", label: t("statements.reference") },
          { key: "debit", label: t("statements.debit"), format: "number" },
          { key: "credit", label: t("statements.credit"), format: "number" },
          { key: "balance", label: t("statements.balance"), format: "number" },
        ]} filename="statements" title={t("statements.title")} />
      </div>

      <div className="flex gap-2 border-b pb-2 flex-wrap">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => { setTab(tabItem.key); setData(null); setPartyId(""); }}
            className={"flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-all " +
              (tab === tabItem.key ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground")}
          >
            <tabItem.icon className="h-4 w-4" />
            {tabItem.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="min-w-[200px] flex-1">
              <Label>{partyLabels[tab]}</Label>
              <Combobox value={partyId} onChange={(e) => setPartyId(e.target.value)} placeholder="..." searchPlaceholder={t("common.search")}>
                <option value="">...</option>
                {partyLists[tab].map((p) => (
                  <option key={p.id} value={p.id}>
                    {tab === "account" ? `${p.code} - ${locale === "ar" ? (p.name || p.name_en) : (p.name_en || p.name)}` : p.name}
                  </option>
                ))}
              </Combobox>
            </div>
            <div>
              <Label className="text-xs">{t("common.date")} من</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs">{t("common.date")} إلى</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={loadStatement} disabled={!partyId || loading}>
              <Search className="h-4 w-4 ml-1" />{t("common.search")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{partyLabels[tab]}</CardTitle></CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  {tab === "account" ? `${data.party.code} - ${data.party.name || data.party.name_en}` : data.party.name}
                </div>
                {tab === "employee" && data.party.salary_account_name && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("employees.role")}: {data.party.role || "-"} | حساب الراتب: {data.party.salary_account_name}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("common.total")}</CardTitle></CardHeader>
              <CardContent><div className="text-lg font-bold">{fn(data.transactions.reduce((s, t) => s + t.debit, 0))} / {fn(data.transactions.reduce((s, t) => s + t.credit, 0))}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{t("statements.balance")}</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-lg font-bold ${data.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {fn(data.balance)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Receipt className="h-5 w-5" />{t("statements.transactions")}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("statements.type")}</TableHead>
                    <TableHead>{t("statements.reference")}</TableHead>
                    {tab === "account" && <TableHead>{t("journal.description")}</TableHead>}
                    <TableHead className="text-start">{t("statements.debit")}</TableHead>
                    <TableHead className="text-start">{t("statements.credit")}</TableHead>
                    <TableHead className="text-start">{t("statements.balance")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions.length === 0 ? (
                    <TableRow><TableCell colSpan={tab === "account" ? 7 : 6} className="text-center text-muted-foreground py-8">{t("common.noData")}</TableCell></TableRow>
                  ) : data.transactions.map((t, i) => {
                    const tl = typeLabels[t.type] || { ar: t.type, en: t.type, color: "" };
                    const refStr = t.type === "journal" ? `#${t.ref}` :
                      t.type.includes("sale") || t.type.includes("purchase") ? `#${t.ref}` :
                      `#RET${t.ref}`;
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{new Date(t.date).toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US")}</TableCell>
                        <TableCell><span className={tl.color}>{locale === "ar" ? tl.ar : tl.en}</span></TableCell>
                        <TableCell className="font-mono text-xs">{refStr}</TableCell>
                        {tab === "account" && <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{locale === "ar" ? (t.description || t.line_description || "") : (t.description_en || t.description || t.line_description || "")}</TableCell>}
                        <TableCell className="font-mono text-xs">{t.debit > 0 ? fn(t.debit) : "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{t.credit > 0 ? fn(t.credit) : "-"}</TableCell>
                        <TableCell className={`font-mono text-sm font-medium ${t.balance >= 0 ? "text-green-600" : "text-red-600"}`}>{fn(t.balance)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
