// apps\web\app\(profile)\reset-password\[token]\page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '@/lib/profile';

const schema = z.object({
  password: z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
      '1 majuscule, 1 chiffre, 1 caractère spécial requis'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const params   = useParams();
  const router   = useRouter();
  const token    = params.token as string;
  const [success,  setSuccess]  = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      await resetPassword(token, data.password);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(
        e.response?.data?.message ?? 'Lien invalide ou expiré. Veuillez refaire une demande.',
      );
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">
            Mot de passe réinitialisé !
          </h2>
          <p className="text-gray-600 text-sm mb-6">
            Votre mot de passe a été modifié avec succès.
            Vous allez être redirigé vers la page de connexion...
          </p>
          <Link
            href="/login"
            className="bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔒</div>
          <h2 className="text-xl font-bold text-gray-900">Nouveau mot de passe</h2>
          <p className="text-sm text-gray-500 mt-2">
            Choisissez un mot de passe sécurisé pour votre compte.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nouveau mot de passe
            </label>
            <input
              {...register('password')}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none
                focus:ring-2 focus:ring-gray-900 focus:border-transparent
                ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirmer le mot de passe
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none
                focus:ring-2 focus:ring-gray-900 focus:border-transparent
                ${errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1">
            <p>Le mot de passe doit contenir :</p>
            <p>• Minimum 8 caractères</p>
            <p>• Au moins 1 majuscule</p>
            <p>• Au moins 1 chiffre</p>
            <p>• Au moins 1 caractère spécial (!@#$%^&*)</p>
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {apiError}
              {apiError.includes('expiré') && (
                <Link
                  href="/forgot-password"
                  className="block mt-2 text-red-600 font-medium hover:underline"
                >
                  Faire une nouvelle demande →
                </Link>
              )}
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
                Réinitialisation...
              </>
            ) : 'Réinitialiser le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}