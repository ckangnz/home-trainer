import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'

const root = resolve(import.meta.dirname, '..')
const dist = join(root, 'dist')
const env = { ...loadEnv('production', root, 'VITE_'), ...process.env }
const siteUrl = (env.VITE_SITE_URL ?? '').replace(/\/$/, '')
const basePath = (env.VITE_BASE_PATH ?? '/').replace(/\/$/, '')

const { render, prepare, PRERENDER_ROUTES } = await import(pathToFileURL(join(root, 'dist-ssr', 'entry-server.js')).href)
const template = readFileSync(join(dist, 'app-shell.html'), 'utf8')

function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function outputFile(route) {
  return route === '/' ? join(dist, 'index.html') : join(dist, route.slice(1), 'index.html')
}

function publicUrl(route) {
  return `${siteUrl}${route === '/' ? '/' : `${route}/`}`
}

function headTags(route, meta) {
  const tags = [
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta name="twitter:card" content="summary" />',
  ]
  if (siteUrl) {
    tags.push(`<link rel="canonical" href="${publicUrl(route)}" />`)
    tags.push(`<meta property="og:url" content="${publicUrl(route)}" />`)
    tags.push(`<meta property="og:image" content="${siteUrl}/icons/icon-512.png" />`)
  }
  return tags.join('\n    ')
}

await prepare()

for (const route of PRERENDER_ROUTES) {
  const { html, meta, catalogs } = render(route)
  const page = template
    .replace('<div id="root"></div>', `<div id="root">${html}</div><script>window.__HT_CATALOGS__=${JSON.stringify(catalogs)}</script>`)
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(meta.description)}" />\n    ${headTags(route, meta)}`)
  const file = outputFile(route)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, page)
}

if (basePath === '') {
  const robots = ['User-agent: *', 'Allow: /', 'Disallow: /app/', siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml` : null]
    .filter(Boolean)
    .join('\n')
  writeFileSync(join(dist, 'robots.txt'), `${robots}\n`)
}

if (siteUrl) {
  const today = new Date().toISOString().slice(0, 10)
  const urls = PRERENDER_ROUTES.map((route) => `  <url><loc>${publicUrl(route)}</loc><lastmod>${today}</lastmod></url>`)
  writeFileSync(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  )
}

console.log(`Prerendered ${PRERENDER_ROUTES.length} routes${siteUrl ? ` for ${siteUrl}` : ''}.`)
