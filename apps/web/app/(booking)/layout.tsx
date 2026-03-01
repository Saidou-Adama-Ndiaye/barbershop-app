// .\.\apps\web\app\(booking)\layout.tsx
import Header from '@/components/layout/Header';

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400">
        © 2025 BarberShop — Réservations en ligne
      </footer>
    </div>
  );
}