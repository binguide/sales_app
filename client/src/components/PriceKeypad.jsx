import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

export default function PriceKeypad({ open, mode, value, currency, onConfirm, onCancel }) {
  const [input, setInput] = useState("");

  useEffect(() => {
    if (open) {
      setInput(mode === "quantity" ? String(parseInt(value) || 0) : (parseFloat(value) || 0).toFixed(2));
    }
  }, [open, value, mode]);

  const handleKey = useCallback((k) => {
    if (k === "C") {
      setInput("0");
    } else if (k === "⌫") {
      setInput((prev) => prev.length > 1 ? prev.slice(0, -1) : "0");
    } else if (k === ".") {
      if (mode === "price" && !input.includes(".")) {
        setInput((prev) => prev.includes(".") ? prev : prev + ".");
      }
    } else if (/^[0-9]$/.test(k)) {
      setInput((prev) => {
        if (prev === "0" && k !== ".") return k;
        return prev + k;
      });
    }
  }, [mode, input]);

  const handleConfirm = useCallback(() => {
    const parsed = mode === "quantity" ? parseInt(input) || 0 : parseFloat(input) || 0;
    onConfirm(parsed);
  }, [input, mode, onConfirm]);

  const handleOverlay = useCallback((e) => {
    if (e.target === e.currentTarget) onCancel();
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onCancel]);

  if (!open) return null;

  const title = mode === "price"
    ? "تعديل السعر"
    : "تعديل الكمية";

  const btns = [
    ["7", "8", "9"],
    ["4", "5", "6"],
    ["1", "2", "3"],
    ["0", ".", "⌫"],
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center" onClick={handleOverlay}>
      <div className="bg-white rounded-2xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-sm">{title}</h3>
          <button onClick={onCancel} className="text-muted-foreground hover:text-destructive p-1">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Display */}
        <div className="bg-muted/50 rounded-xl px-4 py-3 mb-4 text-left" dir="ltr">
          <span className="text-2xl font-bold tracking-wider">
            {input}
          </span>
          {mode === "price" && (
            <span className="text-sm text-muted-foreground mr-1">{currency}</span>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {btns.flat().map((k) => (
            <button
              key={k}
              onClick={() => handleKey(k)}
              className={"h-14 rounded-xl text-xl font-bold transition-all active:scale-90 " + (
                k === "⌫"
                  ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                  : k === "."
                    ? "bg-accent text-muted-foreground hover:bg-accent/80"
                    : "bg-gray-100 hover:bg-gray-200 text-foreground"
              )}
            >
              {k}
            </button>
          ))}
        </div>

        {/* Bottom buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleKey("C")}
            className="flex-1 h-12 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-all active:scale-95"
          >
            C
          </button>
          <button
            onClick={handleConfirm}
            className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            ✓
          </button>
        </div>
      </div>
    </div>
  );
}
