// apps\web\app\(profile)\profil\adresses\page.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import {
  getAddresses, createAddress, updateAddress,
  deleteAddress, UserAddress,
} from '@/lib/profile';

// ─── Schéma Zod ───────────────────────────────────────────
const addressSchema = z.object({
  label:     z.string().min(2, 'Minimum 2 caractères').max(100),
  street:    z.string().min(5, 'Minimum 5 caractères').max(255),
  city:      z.string().min(2, 'Minimum 2 caractères').max(100),
  country:   z.string().min(2).max(100).optional(),
  isDefault: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

// ─── Composant ────────────────────────────────────────────
export default function AdressesPage() {
  const queryClient = useQueryClient();
  const [showForm,   setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<UserAddress | null>(null);
  const [apiError,   setApiError]   = useState<string | null>(null);

  // ─── Query ──────────────────────────────────────────────
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn:  getAddresses,
  });

  // ─── Mutations ──────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowForm(false);
      reset();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setApiError(err.response?.data?.message ?? 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AddressFormData> }) =>
      updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setEditTarget(null);
      reset();
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      setApiError(err.response?.data?.message ?? 'Erreur lors de la modification');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  // ─── Form ────────────────────────────────────────────────
  const {
    register, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'Sénégal', isDefault: false },
  });

  const openEdit = (address: UserAddress) => {
    setEditTarget(address);
    setShowForm(true);
    setValue('label',     address.label);
    setValue('street',    address.street);
    setValue('city',      address.city);
    setValue('country',   address.country);
    setValue('isDefault', address.isDefault);
    setApiError(null);
  };

  const onSubmit = async (data: AddressFormData) => {
    setApiError(null);
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/profil"
          className="text-gray-400 hover:text-gray-900 transition-colors"
        >
          ← Retour au profil
        </Link>
        <span className="text-gray-300">|</span>
        <h1 className="text-2xl font-bold text-gray-900">Mes adresses</h1>
      </div>

      {/* Liste adresses */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">📍</p>
          <p className="font-medium text-gray-600">Aucune adresse enregistrée</p>
          <p className="text-sm mt-1">Ajoutez une adresse pour faciliter vos commandes</p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {addresses.map((address) => (
            <div
              key={address.id}
              className={`border rounded-xl p-4 flex items-start justify-between gap-4 transition-colors ${
                address.isDefault
                  ? 'border-gray-900 bg-gray-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-900">
                    {address.label}
                  </span>
                  {address.isDefault && (
                    <span className="bg-gray-900 text-white text-xs px-2 py-0.5 rounded-full">
                      Par défaut
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{address.street}</p>
                <p className="text-sm text-gray-500">{address.city}, {address.country}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEdit(address)}
                  className="text-xs text-gray-500 hover:text-gray-900 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={() => deleteMutation.mutate(address.id)}
                  disabled={deleteMutation.isPending}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  🗑️ Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bouton ajouter */}
      {!showForm && (
        <button
          onClick={() => {
            setEditTarget(null);
            reset({ label: '', street: '', city: '', country: 'Sénégal', isDefault: false });
            setShowForm(true);
            setApiError(null);
          }}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          + Ajouter une adresse
        </button>
      )}

      {/* Formulaire ajout/édition */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4">
          <h2 className="font-semibold text-gray-900 mb-4">
            {editTarget ? '✏️ Modifier l\'adresse' : '➕ Nouvelle adresse'}
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Libellé <span className="text-gray-400 font-normal">(ex: Maison, Bureau)</span>
              </label>
              <input
                {...register('label')}
                placeholder="Maison"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                  errors.label ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.label && (
                <p className="text-red-500 text-xs mt-1">{errors.label.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Rue</label>
              <input
                {...register('street')}
                placeholder="Rue 10, Cité Keur Gorgui"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                  errors.street ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.street && (
                <p className="text-red-500 text-xs mt-1">{errors.street.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville</label>
                <input
                  {...register('city')}
                  placeholder="Dakar"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                    errors.city ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.city && (
                  <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
                <input
                  {...register('country')}
                  placeholder="Sénégal"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-colors ${
                    errors.country ? 'border-red-400 bg-red-50' : 'border-gray-200'
                  }`}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                {...register('isDefault')}
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Définir comme adresse par défaut</span>
            </label>

            {apiError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                {apiError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditTarget(null); reset(); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sauvegarde...
                  </>
                ) : editTarget ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}