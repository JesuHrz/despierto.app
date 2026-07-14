const SITE = import.meta.env.SITE ?? "https://despierto.app";

// Builds a clean absolute URL from a path, for canonical / hreflang / og tags.
export function abs(path: string): string {
  return new URL(path, SITE).href;
}
