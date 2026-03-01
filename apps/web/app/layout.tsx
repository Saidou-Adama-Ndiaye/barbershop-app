// .\.\apps\web\app\layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: {
    default: 'BarberShop — Produits & Accessoires',
    template: '%s | BarberShop',
  },
  description: 'Packs professionnels pour coiffeurs — Sénégal & Zone UEMOA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}