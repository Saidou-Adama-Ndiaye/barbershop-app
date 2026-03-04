// apps\web\app\admin\services\page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminServices, createAdminService,
  updateAdminService, deleteAdminService,
  AdminService,
} from '@/lib/admin/api';

const formatXOF = (n: number) =>
  new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);

interface ServiceForm {
  name:        string;
  description: string;
  price:       number;
  durationMin: number;
  depositPct:  number;
  inclusions:  string[];
  isActive:    boolean;
}

const EMPTY_FORM: ServiceForm = {
  name: '', description: '', price: 0,
  durationMin: 30, depositPct: 30,
  inclusions: [], isActive: true,
};

// ─── Modal Service ────────────────────────────────────────
function ServiceModal({
  service, onClose,
}: {
  service: AdminService | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ServiceForm>(
    service
      ? {
          name:        service.name,
          description: service.description ?? '',
          price:       Number(service.price),
          durationMin: service.durationMin,
          depositPct:  Number(service.depositPct),
          inclusions:  service.inclusions ?? [],
          isActive:    service.isActive,
        }
      : EMPTY_FORM,
  );
  const [newInclusion, setNewInclusion] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      service
        ? updateAdminService(service.id, form)
        : createAdminService(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      onClose();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Erreur';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const addInclusion = () => {
    const val = newInclusion.trim();
    if (!val || form.inclusions.includes(val)) return;
    setForm((f) => ({ ...f, inclusions: [...f.inclusions, val] }));
    setNewInclusion('');
  };

  const removeInclusion = (idx: number) => {
    setForm((f) => ({
      ...f,
      inclusions: f.inclusions.filter((_, i) => i !== idx),
    }));
  };

  const depositAmount = Math.round(form.price * form.depositPct / 100);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg space-y-5 my-8">

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {service ? 'Modifier le service' : 'Nouveau service'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="space-y-4">

          {/* Nom */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Nom *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Coupe + Barbe"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm resize-none"
            />
          </div>

          {/* Prix + Durée */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Prix (XOF) *</label>
              <input
                type="number" min={0} value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Durée (minutes) *</label>
              <input
                type="number" min={5} max={480} value={form.durationMin}
                onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
          </div>

          {/* Acompte */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Acompte (%) — actuellement : {depositAmount > 0 ? formatXOF(depositAmount) : '—'}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={0} max={100} value={form.depositPct}
                onChange={(e) => setForm((f) => ({ ...f, depositPct: Number(e.target.value) }))}
                className="flex-1 accent-white"
              />
              <span className="text-white font-bold w-12 text-center">{form.depositPct}%</span>
            </div>
          </div>

          {/* Inclusions */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">
              Inclusions ({form.inclusions.length})
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={newInclusion}
                onChange={(e) => setNewInclusion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addInclusion()}
                placeholder="Ex: Shampoing inclus"
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white outline-none focus:border-gray-500 text-sm"
              />
              <button
                onClick={addInclusion}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm transition-colors"
              >
                + Ajouter
              </button>
            </div>
            {form.inclusions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.inclusions.map((inc, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 bg-gray-800 text-gray-300 text-xs px-3 py-1.5 rounded-full border border-gray-700"
                  >
                    {inc}
                    <button
                      onClick={() => removeInclusion(i)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actif */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
            <span className="text-sm text-gray-300">Service actif (disponible à la réservation)</span>
            <button
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-green-600' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.isActive ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm">
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || form.price <= 0 || form.durationMin <= 0}
            className="flex-1 bg-white text-gray-900 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm disabled:opacity-50"
          >
            {mutation.isPending ? 'Enregistrement...' : service ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function AdminServicesPage() {
  const queryClient = useQueryClient();
  const [modal,        setModal]        = useState<'create' | 'edit' | null>(null);
  const [selected,     setSelected]     = useState<AdminService | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminService | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['admin-services'],
    queryFn:  getAdminServices,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminService(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services Coiffure</h1>
          <p className="text-gray-400 mt-1">{services.length} service(s) au total</p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="bg-white text-gray-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm"
        >
          + Nouveau service
        </button>
      </div>

      {/* Grille de cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          Aucun service — créez le premier !
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className={`bg-gray-900 border rounded-2xl p-5 space-y-3 ${
                service.isActive ? 'border-gray-800' : 'border-gray-800 opacity-60'
              }`}
            >
              {/* Header card */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white">{service.name}</h3>
                  {service.description && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{service.description}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                  service.isActive ? 'bg-green-900/50 text-green-300' : 'bg-gray-800 text-gray-500'
                }`}>
                  {service.isActive ? 'Actif' : 'Inactif'}
                </span>
              </div>

              {/* Infos */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-800 rounded-xl p-2">
                  <p className="text-white font-bold text-sm">{formatXOF(Number(service.price))}</p>
                  <p className="text-gray-500 text-xs">Prix</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-2">
                  <p className="text-white font-bold text-sm">{service.durationMin} min</p>
                  <p className="text-gray-500 text-xs">Durée</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-2">
                  <p className="text-white font-bold text-sm">{Number(service.depositPct)}%</p>
                  <p className="text-gray-500 text-xs">Acompte</p>
                </div>
              </div>

              {/* Inclusions */}
              {service.inclusions?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {service.inclusions.map((inc, i) => (
                    <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      ✓ {inc}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setSelected(service); setModal('edit'); }}
                  className="flex-1 text-xs text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 py-2 rounded-xl transition-colors"
                >
                  ✏️ Modifier
                </button>
                <button
                  onClick={() => setDeleteTarget(service)}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-2 rounded-xl transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <ServiceModal
          service={modal === 'edit' ? selected : null}
          onClose={() => { setModal(null); setSelected(null); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-white font-bold">Désactiver le service ?</h3>
              <p className="text-gray-400 text-sm mt-2">
                <span className="text-white font-medium">{deleteTarget.name}</span> ne sera plus disponible à la réservation.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm">Annuler</button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Désactiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}