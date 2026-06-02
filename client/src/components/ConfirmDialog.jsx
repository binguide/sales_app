import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/index.jsx";

export default function ConfirmDialog({ open, onOpenChange, title, message, onConfirm, confirmLabel, variant }) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader><DialogTitle>{title || t("common.confirm")}</DialogTitle></DialogHeader>
      <p className="text-muted-foreground">{message}</p>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
        <Button variant={variant || "destructive"} onClick={onConfirm}>{confirmLabel || t("common.delete")}</Button>
      </DialogFooter>
    </Dialog>
  );
}
