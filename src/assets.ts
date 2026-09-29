/// <reference types="vite/client" />

// Resolve public assets at render time so imported saves also use this site's base.
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}
