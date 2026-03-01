// .\.\apps\web\app\(auth)\register\page.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register as registerUser } from '@/lib/auth';

// ─── Schéma Zod ───────────────────────────────────────────
const registerSchema = z
  .object({
    firstName: z.string().min(2, 'Minimum 2 caractères'),
    lastName:  z.string().min(2, 'Minimum 2 caractères'),
    email:     z.string().min(1, 'Email requis').email('Email invalide'),
    phone:     z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/, 'Numéro invalide')
      .optional()
      .or(z.literal('')),
    password: z
      .string()
      .min(8, 'Minimum 8 caractères')
      .regex(/[A-Z]/, '1 majuscule requise')
      .regex(/[0-9]/, '1 chiffre requis')
      .regex(/[!@#$%^&*]/, '1 caractère spécial requis (!@#$%^&*)'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Composant champ input réutilisable ───────────────────
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}

const inputClass = (hasError: boolean) =>
  `w-full px-4 py-2.5 rounded-xl border text-sm transition-colors outline-none
   focus:ring-2 focus:ring-gray-900 focus:border-transparent
   ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white'}`;

// ─── Composant ────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [apiError, setApiError]     = useState<string | null>(null);
  const [success, setSuccess]       = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      await registerUser({
        email:     data.email,
        password:  data.password,
        firstName: data.firstName,
        lastName:  data.lastName,
        phone:     data.phone || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setApiError(
        axiosError.response?.data?.message ?? 'Erreur lors de l\'inscription',
      );
    }
  };

  // ─── Succès ───────────────────────────────────────────
  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <span className="text-5xl block mb-4">✅</span>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Compte créé !</h2>
        <p className="text-gray-500 text-sm">Redirection vers la connexion...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Créer un compte</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>

        {/* Prénom / Nom */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prénom" error={errors.firstName?.message}>
            <input
              {...register('firstName')}
              type="text"
              placeholder="Moussa"
              className={inputClass(!!errors.firstName)}
            />
          </Field>
          <Field label="Nom" error={errors.lastName?.message}>
            <input
              {...register('lastName')}
              type="text"
              placeholder="Diallo"
              className={inputClass(!!errors.lastName)}
            />
          </Field>
        </div>

        {/* Email */}
        <Field label="Email" error={errors.email?.message}>
          <input
            {...register('email')}
            type="email"
            placeholder="votre@email.com"
            autoComplete="email"
            className={inputClass(!!errors.email)}
          />
        </Field>

        {/* Téléphone */}
        <Field label="Téléphone (optionnel)" error={errors.phone?.message}>
          <input
            {...register('phone')}
            type="tel"
            placeholder="+221771234567"
            className={inputClass(!!errors.phone)}
          />
        </Field>

        {/* Mot de passe */}
        <Field label="Mot de passe" error={errors.password?.message}>
          <input
            {...register('password')}
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            className={inputClass(!!errors.password)}
          />
          <p className="text-xs text-gray-400 mt-1">
            8 caractères min, 1 majuscule, 1 chiffre, 1 spécial (!@#$%^&*)
          </p>
        </Field>

        {/* Confirmation */}
        <Field label="Confirmer le mot de passe" error={errors.confirmPassword?.message}>
          <input
            {...register('confirmPassword')}
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            className={inputClass(!!errors.confirmPassword)}
          />
        </Field>

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
              Création...
            </>
          ) : (
            'Créer mon compte'
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-gray-900 font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}