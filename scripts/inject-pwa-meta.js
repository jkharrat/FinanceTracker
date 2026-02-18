const fs = require('fs');
const path = require('path');

const distHtml = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(distHtml)) {
  console.error('dist/index.html not found — run expo export first');
  process.exit(1);
}

const pwaTags = `
    <!-- PWA: iOS standalone mode -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Finance Tracker" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

    <!-- PWA: manifest & theme -->
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="theme-color" content="#F8F9FD" />
    <link rel="manifest" href="/manifest.json" />

    <!-- PWA: iOS standalone styling -->
    <style>
      html, body {
        margin: 0;
        height: 100%;
        background-color: #F8F9FD;
      }
      @media (prefers-color-scheme: dark) {
        html, body { background-color: #0F172A; }
      }
      @media all and (display-mode: standalone) {
        body { padding-top: env(safe-area-inset-top); }
      }
    </style>`;

let html = fs.readFileSync(distHtml, 'utf-8');

if (html.includes('apple-mobile-web-app-capable')) {
  console.log('PWA meta tags already present — skipping.');
  process.exit(0);
}

html = html.replace(
  /(<meta\s+name="viewport"[^>]*>)/i,
  `$1\n${pwaTags}`
);

html = html.replace(
  'shrink-to-fit=no"',
  'shrink-to-fit=no, viewport-fit=cover"'
);

fs.writeFileSync(distHtml, html, 'utf-8');
console.log('Injected PWA meta tags into dist/index.html');
