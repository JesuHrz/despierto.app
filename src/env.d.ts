/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare function gtag(...args: unknown[]): void;

interface Window {
  gtag: typeof gtag;
  dataLayer: unknown[];
  __I18N: Record<string, string>;
  __DATE_LOCALE: string;
}
