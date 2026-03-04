// apps\web\app\(profile)\forgot-password\page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { forgotPassword } from '@/lib/profile';

const schema = z.object({
  email: z.string().min(1, 'Email requis').email('Email invalide'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [apiError,  setApiError]  = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      await forgotPassword(data.email);
      setSubmitted(true);
    } catch {
      setApiError('Une erreur est survenue. Veuillez réessayer.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">Email envoyé !</h2>
          <p className="text-gray-600 text-sm mb-2">
            Si un compte existe avec l'adresse{' '}
            <strong>{getValues('email')}</strong>, vous recevrez
            un lien de réinitialisation dans quelques minutes.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Pensez à vérifier vos spams.
          </p>
          <Link
            href="/login"
            className="text-sm text-gray-900 font-medium hover:underline"
          >
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h2 className="text-xl font-bold text-gray-900">Mot de passe oublié ?</h2>
          <p className="text-sm text-gray-500 mt-2">
            Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Adresse email
            </label>
            <input
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder="votre@email.com"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none
                focus:ring-2 focus:ring-gray-900 focus:border-transparent
                ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {apiError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Envoi...
              </>
            ) : 'Envoyer le lien'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/login" className="text-gray-900 font-medium hover:underline">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}