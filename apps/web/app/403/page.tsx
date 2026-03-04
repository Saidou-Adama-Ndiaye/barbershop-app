import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accès refusé',
};

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">

        {/* Illustration */}
        <div className="relative mb-8">
          <p className="text-[120px] leading-none font-black text-gray-800 select-none">
            403
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl">🔒</span>
          </div>
        </div>

        {/* Texte */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Accès refusé
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Vous n&apos;avez pas les permissions nécessaires pour accéder
          à cette page. Si vous pensez qu&apos;il s&apos;agit d&apos;une
          erreur, contactez un administrateur.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/packs"
            className="bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors text-sm"
          >
            🏠 Retour à l&apos;accueil
          </Link>
          <Link
            href="/login"
            className="border border-gray-700 text-gray-300 font-medium px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm"
          >
            🔑 Se connecter
          </Link>
        </div>

        {/* Code erreur discret */}
        <p className="text-gray-600 text-xs mt-8">
          Code d&apos;erreur : 403 — Accès non autorisé
        </p>
      </div>
    </div>
  );
}