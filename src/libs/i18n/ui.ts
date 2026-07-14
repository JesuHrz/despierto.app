import { es, type Dict } from "./es";
import { en } from "./en";

export const languages = ["es", "en"] as const;
export type Lang = (typeof languages)[number];

export const defaultLang: Lang = "es";

const dicts: Record<Lang, Dict> = { es, en };

export function getDict(lang: Lang): Dict {
  return dicts[lang] ?? dicts[defaultLang];
}

// Path to the same page in the other language. "/" <-> "/en".
export function altPath(lang: Lang): string {
  return lang === "es" ? "/en/" : "/";
}
