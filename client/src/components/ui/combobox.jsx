import { useState, useRef, useEffect, useCallback, Children, isValidElement } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, X } from "lucide-react";

function parseOptions(children) {
  const opts = [];
  if (!children) return opts;
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === "option") {
      opts.push({ value: String(child.props.value), label: child.props.children, disabled: child.props.disabled || child.props.value === "" || child.props.value === undefined });
    }
  });
  return opts;
}

function Combobox({ value, onChange, children, placeholder = "اختر...", className, searchPlaceholder, emptyText, disabled, dir, ...props }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef(null);
  const rootRef = useRef(null);

  const options = parseOptions(children);
  const selectedOption = options.find((o) => o.value === value);
  const filtered = options.filter((o) => o.label?.toString().toLowerCase().includes(search.toLowerCase()) && !o.disabled);

  useEffect(() => {
    if (!open) { setSearch(""); setHighlightIdx(-1); return; }
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const select = useCallback((val) => {
    onChange?.({ target: { value: val } });
    setOpen(false);
  }, [onChange]);

  const handleTriggerClick = useCallback((e) => {
    if (disabled) return;
    setOpen((o) => !o);
  }, [disabled]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    select("");
    setSearch("");
  }, [select]);

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") { setOpen(true); e.preventDefault(); }
      return;
    }
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setHighlightIdx((i) => (i < filtered.length - 1 ? i + 1 : 0)); break;
      case "ArrowUp": e.preventDefault(); setHighlightIdx((i) => (i > 0 ? i - 1 : filtered.length - 1)); break;
      case "Enter": e.preventDefault(); if (filtered[highlightIdx]) select(filtered[highlightIdx].value); break;
      case "Escape": e.preventDefault(); setOpen(false); break;
    }
  };

  const handleSearchMouseDown = (e) => e.stopPropagation();

  const displayText = selectedOption ? selectedOption.label : (value || "");

  return (
    <div ref={rootRef} className={cn("relative", className)} dir={dir}>
      <div
        className={cn(
          "flex h-9 w-full items-center gap-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer",
          disabled && "cursor-not-allowed opacity-50"
        )}
        onClick={handleTriggerClick}
      >
        {open ? (
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={handleSearchMouseDown}
            placeholder={searchPlaceholder || "بحث..."}
            className="flex-1 bg-transparent outline-none text-sm min-w-0"
          />
        ) : (
          <span className={cn("flex-1 truncate", !displayText && "text-muted-foreground")}>
            {displayText || placeholder}
          </span>
        )}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {selectedOption && !disabled && (
            <X
              className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleClear}
            />
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
        </div>
      </div>

      {open && (
        <div
          className="absolute z-[60] mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-auto"
          style={{ insetInlineStart: 0 }}
        >
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">{emptyText || "لا توجد نتائج"}</div>
          ) : filtered.map((opt, idx) => (
            <div
              key={String(opt.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors",
                idx === highlightIdx ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                opt.value === value && !search && "font-medium"
              )}
              onClick={() => select(String(opt.value))}
              onMouseEnter={() => setHighlightIdx(idx)}
            >
              {opt.value === value && !search && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
              <span className={cn("flex-1 truncate", opt.value === value && !search && "font-medium")}>
                {opt.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { Combobox };
