// apps\web\app\(profile)\profil\page.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth.store';
import { updateProfile, uploadAvatar, changePassword } from '@/lib/profile';

// ─── Schémas Zod ──────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(2, 'Minimum 2 caractères').max(100),
  lastName:  z.string().min(2, 'Minimum 2 caractères').max(100),
  phone:     z.string()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Numéro invalide')
    .optional()
    .or(z.literal('')),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Requis'),
  newPassword: z.string()
    .min(8, 'Minimum 8 caractères')
    .regex(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, 
      '1 majuscule, 1 chiffre, 1 caractère spécial requis'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type ProfileFormData  = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

// ─── Composant ────────────────────────────────────────────
export default function ProfilPage() {
  const { user, setAuth, accessToken } = useAuthStore();
  const router = useRouter();

  const [activeTab,     setActiveTab]     = useState<'profil' | 'password'>('profil');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null);
  const [isDragging,    setIsDragging]    = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [apiError,      setApiError]      = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Form profil ────────────────────────────────────────
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName:  user?.lastName  ?? '',
      phone:     user?.phone     ?? '',
    },
  });

  // ─── Form password ───────────────────────────────────────
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // ─── Gestion avatar ──────────────────────────────────────
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setApiError('Seules les images sont acceptées (JPEG, PNG, WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setApiError('Image trop grande (max 5 MB)');
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setAvatarPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  // ─── Submit profil ───────────────────────────────────────
  const onProfileSubmit = async (data: ProfileFormData) => {
    setApiError(null);
    setProfileSuccess(false);
    try {
      // Upload avatar si sélectionné
      if (avatarFile) {
        await uploadAvatar(avatarFile);
      }

      const updatedUser = await updateProfile({
        firstName: data.firstName,
        lastName:  data.lastName,
        phone:     data.phone || undefined,
      });

      if (user && accessToken) {
        setAuth({ ...user, ...updatedUser }, accessToken);
      }

      setProfileSuccess(true);
      setAvatarFile(null);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? 'Erreur lors de la mise à jour');
    }
  };

  // ─── Submit password ─────────────────────────────────────
  const onPasswordSubmit = async (data: PasswordFormData) => {
    setApiError(null);
    setPasswordSuccess(false);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      });
      setPasswordSuccess(true);
      resetPasswordForm();
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setApiError(e.response?.data?.message ?? 'Erreur lors du changement de mot de passe');
    }
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  // ─── Initiales avatar ────────────────────────────────────
  const initiales = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Mon profil</h1>

      {/* Banner email non vérifié */}
      {!user.isVerified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-amber-800 font-medium text-sm">Email non vérifié</p>
              <p className="text-amber-700 text-xs mt-0.5">
                Vérifiez votre boîte mail pour activer votre compte.
              </p>
            </div>
          </div>
          <ResendVerificationButton />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-8">
        {(['profil', 'password'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setApiError(null); }}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'profil' ? '👤 Informations' : '🔒 Mot de passe'}
          </button>
        ))}
      </div>

      {/* ─── TAB PROFIL ─── */}
      {activeTab === 'profil' && (
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-6">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            {/* Aperçu */}
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-900 flex items-center justify-center border-4 border-gray-200">
                  <span className="text-white text-2xl font-bold">{initiales}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-white border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm">📷</span>
              </button>
            </div>

            {/* Zone drag & drop */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50'
              }`}
            >
              <p className="text-sm text-gray-500">
                {avatarFile
                  ? `✅ ${avatarFile.name}`
                  : 'Glissez une image ici ou cliquez pour choisir'}
              </p>
              <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — max 5 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
          </div>

          {/* Champs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Prénom
              </label>
              <input
                {...registerProfile('firstName')}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                  profileErrors.firstName ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {profileErrors.firstName && (
                <p className="text-red-500 text-xs mt-1">{profileErrors.firstName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nom
              </label>
              <input
                {...registerProfile('lastName')}
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                  profileErrors.lastName ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {profileErrors.lastName && (
                <p className="text-red-500 text-xs mt-1">{profileErrors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Téléphone
            </label>
            <input
              {...registerProfile('phone')}
              type="tel"
              placeholder="+221771234567"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                profileErrors.phone ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {profileErrors.phone && (
              <p className="text-red-500 text-xs mt-1">{profileErrors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email
            </label>
            <input
              value={user.email}
              disabled
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-400 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">
              L'email ne peut pas être modifié.
            </p>
          </div>

          {/* Erreur / Succès */}
          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {apiError}
            </div>
          )}
          {profileSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
              ✅ Profil mis à jour avec succès
            </div>
          )}

          {/* Bouton submit */}
          <button
            type="submit"
            disabled={isProfileSubmitting}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProfileSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sauvegarde...
              </>
            ) : 'Sauvegarder les modifications'}
          </button>

          {/* Lien adresses */}
          <div className="text-center">
            <Link
              href="/profil/adresses"
              className="text-sm text-gray-500 hover:text-gray-900 underline transition-colors"
            >
              📍 Gérer mes adresses de livraison
            </Link>
          </div>
        </form>
      )}

      {/* ─── TAB PASSWORD ─── */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Mot de passe actuel
            </label>
            <input
              {...registerPassword('currentPassword')}
              type="password"
              autoComplete="current-password"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                passwordErrors.currentPassword ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {passwordErrors.currentPassword && (
              <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Nouveau mot de passe
            </label>
            <input
              {...registerPassword('newPassword')}
              type="password"
              autoComplete="new-password"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                passwordErrors.newPassword ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {passwordErrors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirmer le nouveau mot de passe
            </label>
            <input
              {...registerPassword('confirmPassword')}
              type="password"
              autoComplete="new-password"
              className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                passwordErrors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {passwordErrors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword.message}</p>
            )}
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
              {apiError}
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
              ✅ Mot de passe modifié avec succès
            </div>
          )}

          <button
            type="submit"
            disabled={isPasswordSubmitting}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPasswordSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Modification...
              </>
            ) : 'Changer le mot de passe'}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Composant bouton renvoi vérification ─────────────────
function ResendVerificationButton() {
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResend = async () => {
    setLoading(true);
    try {
      await import('@/lib/profile').then((m) => m.resendVerification());
      setSent(true);
    } catch {
      // silencieux
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleResend}
      disabled={loading || sent}
      className="text-xs text-amber-700 underline hover:text-amber-900 transition-colors disabled:opacity-50 whitespace-nowrap"
    >
      {sent ? '✅ Envoyé !' : loading ? 'Envoi...' : 'Renvoyer le lien'}
    </button>
  );
}