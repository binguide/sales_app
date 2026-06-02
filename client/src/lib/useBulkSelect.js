import { useState, useCallback, useMemo } from "react";

export function useBulkSelect(items) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!items || items.length === 0) return;
    setSelectedIds((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((i) => i.id));
    });
  }, [items]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const isAllSelected = useMemo(() => items && items.length > 0 && selectedIds.size === items.length, [items, selectedIds]);
  const selectedCount = selectedIds.size;

  return { selectedIds, handleSelect, handleSelectAll, isAllSelected, clearSelection, selectedCount };
}
