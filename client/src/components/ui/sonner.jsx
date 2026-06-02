import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

let toastId = 0;
let listeners = [];

function notifyListeners() {
  listeners.forEach((l) => l());
}

export function toast(message, options = {}) {
  const id = ++toastId;
  const t = { id, message, ...options };
  const current = JSON.parse(sessionStorage.getItem("toasts") || "[]");
  current.push(t);
  sessionStorage.setItem("toasts", JSON.stringify(current));
  notifyListeners();
  if (options.duration !== false) {
    setTimeout(() => dismissToast(id), options.duration || 3000);
  }
  return id;
}

function dismissToast(id) {
  const current = JSON.parse(sessionStorage.getItem("toasts") || "[]");
  sessionStorage.setItem("toasts", JSON.stringify(current.filter((t) => t.id !== id)));
  notifyListeners();
}

export function Toaster() {
  const [toasts, setToasts] = useState([]);
  const refresh = useCallback(() => {
    setToasts(JSON.parse(sessionStorage.getItem("toasts") || "[]"));
  }, []);

  useEffect(() => {
    listeners.push(refresh);
    return () => {
      listeners = listeners.filter((l) => l !== refresh);
    };
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, [refresh]);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg text-sm",
            t.type === "error" && "border-destructive text-destructive",
            t.type === "success" && "border-green-500 text-green-700"
          )}
        >
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismissToast(t.id)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
