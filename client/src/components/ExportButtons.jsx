import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/index.jsx";
import { exportToExcel, exportToPdf } from "@/lib/export";
import { FileSpreadsheet, FileText } from "lucide-react";

export default function ExportButtons({ data, columns, filename, title }) {
  const { t, locale } = useI18n();

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToExcel(data, columns, filename, locale)}
        title={t("common.exportExcel")}
      >
        <FileSpreadsheet className="h-4 w-4 ml-1" />
        Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportToPdf(data, columns, filename, title || t("common.exportPdf"), locale)}
        title={t("common.exportPdf")}
      >
        <FileText className="h-4 w-4 ml-1" />
        PDF
      </Button>
    </div>
  );
}
