import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // Vercel and custom domains serve from the root; GitHub Pages serves the repo at
  // /APTA-funding/. SITE_BASE overrides both (see README → Deploying).
  const base = env.SITE_BASE ?? process.env.SITE_BASE ?? (process.env.VERCEL ? '/' : '/APTA-funding/')

  // The only API this site may talk to is its own Supabase project.
  const supabaseHost = env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).host : null
  const turnstile = env.VITE_TURNSTILE_SITE_KEY ? 'https://challenges.cloudflare.com' : ''

  // Static hosts may not send our headers (GitHub Pages can't), so the policy also
  // ships as a <meta> tag. Build-only: the dev server needs inline scripts for hot reload.
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
            `script-src 'self' ${turnstile}`.trim(),
            "style-src 'self' 'unsafe-inline'",
            "font-src 'self'",
            "img-src 'self' data: blob:",
            supabaseHost ? `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}` : "connect-src 'self'",
            turnstile ? `frame-src ${turnstile}` : "frame-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            'upgrade-insecure-requests',
          ].join('; '),
        },
        injectTo: 'head-prepend',
      },
      { tag: 'meta', attrs: { name: 'referrer', content: 'strict-origin-when-cross-origin' }, injectTo: 'head' },
    ],
  }

  return {
    base,
    define: {
      // Speed Insights only exists on Vercel; elsewhere (GitHub Pages, local) it would 404.
      'import.meta.env.VITE_ON_VERCEL': JSON.stringify(process.env.VERCEL ? '1' : ''),
    },
    plugins: [react(), tailwindcss(), contentSecurityPolicy],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    build: {
      // No source maps in production: don't publish the original source.
      sourcemap: false,
    },
  }
})
