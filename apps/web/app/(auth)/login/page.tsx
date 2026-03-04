// .\.\apps\web\app\(auth)\login\page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/auth';
import { useAuthStore } from '@/lib/store/auth.store';

// ─── Schéma Zod ───────────────────────────────────────────
const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email requis')
    .email('Email invalide'),
  password: z
    .string()
    .min(8, 'Minimum 8 caractères'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Composant ────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/packs';
  const { setAuth } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      const response = await login(data);
      setAuth(response.user, response.accessToken);
      router.push(redirect);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setApiError(
        axiosError.response?.data?.message ?? 'Email ou mot de passe incorrect',
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Connexion</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="votre@email.com"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none
              focus:ring-2 focus:ring-gray-900 focus:border-transparent
              ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Mot de passe
          </label>
          <input
            {...register('password')}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none
              focus:ring-2 focus:ring-gray-900 focus:border-transparent
              ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`}
          />
        {errors.password && (
            <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Mot de passe oublié */}
        <div className="text-right">
          <Link
            href="/forgot-password"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        {/* Erreur API */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
            {apiError}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Connexion...
            </>
          ) : (
            'Se connecter'
          )}
        </button>
      </form>

      {/* Lien inscription */}
      <p className="text-center text-sm text-gray-500 mt-6">
        Pas encore de compte ?{' '}
        <Link href="/register" className="text-gray-900 font-medium hover:underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}