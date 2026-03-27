import "./globals.css";
import Link from 'next/link';
import HeaderNav from './components/HeaderNav';

export const metadata = {
  title: "Southall Kitchens",
  description: "Advanced restaurant billing & POS system",
  manifest: "/manifest.json",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#f97316" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body>
        <div className="flex flex-col min-h-screen">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10" style={{ borderBottomColor: 'var(--border)' }}>
            <div className="container flex justify-between items-center" style={{ padding: '0.75rem 1rem' }}>
              <div className="flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <img src="/logo.jpg" alt="Southall Kitchens Logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
                  <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--primary)' }}>Southall Kitchens</h1>
                </Link>
              </div>
              <HeaderNav />
            </div>
          </header>
          
          <main className="flex-1 bg-slate-50">
            {children}
          </main>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {}, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
