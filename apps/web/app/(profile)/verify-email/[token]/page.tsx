// apps\web\app\(profile)\verify-email\[token]\page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { verifyEmail } from '@/lib/profile';

type Status = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const params  = useParams();
  const token   = params.token as string;
  const [status,  setStatus]  = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verify = async () => {
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        setMessage(
          e.response?.data?.message ?? 'Token invalide ou déjà utilisé.',
        );
        setStatus('error');
      }
    };
    if (token) verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">

        {/* Loading */}
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <span className="w-12 h-12 border-4 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Vérification en cours...
            </h2>
            <p className="text-gray-500 text-sm">
              Merci de patienter quelques secondes.
            </p>
          </>
        )}

        {/* Succès */}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Email vérifié !
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              Votre adresse email a été confirmée avec succès.
              Votre compte est maintenant pleinement actif.
            </p>
            <Link
              href="/packs"
              className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              Découvrir le catalogue →
            </Link>
          </>
        )}

        {/* Erreur */}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Vérification échouée
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              {message}
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/profil"
                className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Renvoyer depuis mon profil
              </Link>
              <Link
                href="/login"
                className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Retour à la connexion
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}