import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA standalone mode for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Finance Tracker" />
        <link rel="apple-touch-icon" href="/assets/icon.png" />

        {/* PWA manifest */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#6C63FF" />
        <link rel="manifest" href="/manifest.json" />

        <ScrollViewStyleReset />

        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #F8F9FD;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: #1a1a2e;
  }
}`;
