/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function normalizeBase(value: string | undefined): string {
  const trimmed = (value ?? '/').trim() || '/'
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`
}

function siteFiles(env: Record<string, string>, base: string): Plugin {
  const client = env.VITE_ADSENSE_CLIENT?.trim() ?? ''
  const adsense = client.startsWith('ca-pub-')
  return {
    name: 'hometrainer-site-files',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml() {
      if (!adsense) {
        return []
      }
      return [
        { tag: 'meta', attrs: { name: 'google-adsense-account', content: client }, injectTo: 'head' },
        {
          tag: 'script',
          attrs: {
            id: 'adsbygoogle-loader',
            async: true,
            crossorigin: 'anonymous',
            src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`,
          },
          injectTo: 'head',
        },
      ]
    },
    generateBundle(_options, bundle) {
      const index = bundle['index.html']
      if (index && index.type === 'asset') {
        this.emitFile({ type: 'asset', fileName: 'app-shell.html', source: index.source })
        this.emitFile({ type: 'asset', fileName: '404.html', source: index.source })
      }
      if (adsense && base === '/') {
        this.emitFile({
          type: 'asset',
          fileName: 'ads.txt',
          source: `google.com, ${client.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`,
        })
      }
    },
  }
}

export default defineConfig(({ mode, isSsrBuild }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const base = normalizeBase(process.env.VITE_BASE_PATH ?? env.VITE_BASE_PATH)

  return {
    base,
    plugins: [
      react(),
      siteFiles(env, base),
      VitePWA({
        disable: isSsrBuild,
        registerType: 'autoUpdate',
        manifest: false,
        includeAssets: ['icons/*.png', 'icons/*.svg'],
        workbox: {
          globPatterns: ['**/*.{js,css,svg,png,woff2}', 'app-shell.html'],
          globIgnores: ['**/index.html', '404.html'],
          navigateFallback: `${base}app-shell.html`,
          navigateFallbackDenylist: [/^\/__\//, /\/[^/?]+\.[^/]+$/],
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: isSsrBuild
          ? undefined
          : {
              manualChunks(id) {
                if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) {
                  return 'react-vendor'
                }
                if (/[\\/]node_modules[\\/](@firebase|firebase)[\\/]/.test(id)) {
                  return 'firebase-vendor'
                }
                return undefined
              },
            },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
