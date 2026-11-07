import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// GitHub Pages serves the repo at /APTA-funding/. On a custom domain set SITE_BASE=/
// (see README → Custom domain); routing, redirects and 404.html all follow it.
const base = process.env.SITE_BASE ?? '/APTA-funding/'

// GitHub Pages can't send security headers, so the policy ships as a <meta> tag.
// Build-only: the dev server relies on inline scripts for hot reload.
const contentSecurityPolicy: Plugin = {
  name: 'apta-csp',
  apply: 'build',
  transformIndexHtml: () => [
    {
      tag: 'meta',
      attrs: {
        'http-equiv': 'Content-Security-Policy',
        content: [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "img-src 'self' data: blob:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; '),
      },
      injectTo: 'head-prepend',
    },
    { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head' },
  ],
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), contentSecurityPolicy],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
