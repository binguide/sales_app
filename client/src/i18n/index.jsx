import { createContext, useContext, useState, useCallback } from "react";
import ar from "./ar.js";
import en from "./en.js";

const langs = { ar, en };
const I18nContext = createContext();

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem("locale") || "ar";
  });

  const t = useCallback((path, vars = {}) => {
    const keys = path.split(".");
    let val = langs[locale];
    for (const k of keys) {
      val = val?.[k];
    }
    if (val === undefined) return path;
    if (typeof val === "string") {
      return val.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
    }
    return val;
  }, [locale]);

  const changeLocale = useCallback((l) => {
    setLocale(l);
    localStorage.setItem("locale", l);
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
  }, []);

  return (
    <I18nContext.Provider value={{ t, locale, changeLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
