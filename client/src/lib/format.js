export function fn(val) {
  if (val == null || isNaN(val)) return "0";
  const parts = Number(val).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function fn2(val) {
  if (val == null || isNaN(val)) return "0";
  const parts = Number(val).toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function fn0(val) {
  if (val == null || isNaN(val)) return "0";
  const parts = Math.round(Number(val)).toString();
  return parts.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
