// apps\web\app\admin\coiffeurs\page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminCoiffeurs, createAdminCoiffeur, AdminCoiffeur } from '@/lib/admin/api';
import api from '@/lib/api';

const formatXOF = (n: number) =>
  new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);

// ─── Modal Créer Coiffeur ─────────────────────────────────
function CreateCoiffeurModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
    phone:     '',
    password:  '',
    confirm:   '',
  });
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (form.password !== form.confirm) {
        throw new Error('Les mots de passe ne correspondent pas');
      }
      if (form.password.length < 8) {
        throw new Error('Le mot de passe doit faire au moins 8 caractères');
      }
      return createAdminCoiffeur({
        email:     form.email,
        firstName: form.firstName,
        lastName:  form.lastName,
        phone:     form.phone || undefined,
        password:  form.password,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coiffeurs'] });
      onClose();
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { response?: { data?: { message?: string } } })
              ?.response?.data?.message ?? 'Erreur';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const isValid =
    form.firstName && form.lastName && form.email &&
    form.password && form.password === form.confirm;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5">

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Nouveau coiffeur</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">

          {/* Prénom + Nom */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Prénom *</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                placeholder="Moussa"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Nom *</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                placeholder="Diallo"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="moussa@barbershop.sn"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Téléphone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+221 77 000 00 00"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Mot de passe * <span className="text-gray-600 text-xs">(min. 8 caractères)</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm pr-10"
              />
              <button
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Confirmation */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Confirmer le mot de passe *</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={form.confirm}
              onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
              placeholder="••••••••"
              className={`w-full bg-gray-800 border rounded-xl px-4 py-2.5 text-white outline-none text-sm ${
                form.confirm && form.password !== form.confirm
                  ? 'border-red-700'
                  : 'border-gray-700 focus:border-gray-500'
              }`}
            />
            {form.confirm && form.password !== form.confirm && (
              <p className="text-xs text-red-400 mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          {/* Info rôle */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-3 text-xs text-blue-300">
            ℹ️ Le compte sera créé avec le rôle <strong>coiffeur</strong>, actif et vérifié immédiatement.
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm">
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !isValid}
            className="flex-1 bg-white text-gray-900 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm disabled:opacity-50"
          >
            {mutation.isPending ? 'Création...' : 'Créer le compte'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Stats détaillées ───────────────────────────────
function CoiffeurStatsModal({
  coiffeur,
  onClose,
}: {
  coiffeur: AdminCoiffeur;
  onClose:  () => void;
}) {
  const noShowRate = coiffeur.totalRdv > 0
    ? Math.round((coiffeur.noShowRdv / coiffeur.totalRdv) * 100)
    : 0;

  const completionRate = coiffeur.totalRdv > 0
    ? Math.round((coiffeur.completedRdv / coiffeur.totalRdv) * 100)
    : 0;

  // Activer/désactiver le compte
  const queryClient = useQueryClient();
  const toggleMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      api.patch(`/admin/users/${coiffeur.id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-coiffeurs'] }),
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
              {coiffeur.firstName[0]}{coiffeur.lastName[0]}
            </div>
            <div>
              <h3 className="text-white font-bold">
                {coiffeur.firstName} {coiffeur.lastName}
              </h3>
              <p className="text-gray-400 text-sm">{coiffeur.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Statut compte */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
          <span className="text-sm text-gray-300">Compte actif</span>
          <button
            onClick={() => toggleMutation.mutate(!coiffeur.isActive)}
            disabled={toggleMutation.isPending}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              coiffeur.isActive ? 'bg-green-600' : 'bg-gray-600'
            }`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              coiffeur.isActive ? 'left-6' : 'left-1'
            }`} />
          </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total RDV',     value: coiffeur.totalRdv,     icon: '📅', color: 'text-white'        },
            { label: 'Terminés',      value: coiffeur.completedRdv, icon: '✅', color: 'text-green-300'    },
            { label: 'No-shows',      value: coiffeur.noShowRdv,    icon: '❌', color: 'text-red-300'      },
            { label: 'CA Généré',     value: formatXOF(coiffeur.revenue), icon: '💰', color: 'text-amber-300' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">{icon}</p>
              <p className={`font-bold text-lg ${color}`}>{value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Taux */}
        <div className="space-y-3">
          {/* Taux de complétion */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Taux de complétion</span>
              <span className="text-white font-medium">{completionRate}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          {/* Taux no-show */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Taux no-show</span>
              <span className={`font-medium ${noShowRate > 15 ? 'text-red-300' : 'text-white'}`}>
                {noShowRate}%
                {noShowRate > 15 && ' ⚠️'}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${noShowRate > 15 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${noShowRate}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function AdminCoiffeursPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selected,   setSelected]   = useState<AdminCoiffeur | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coiffeurs'],
    queryFn:  getAdminCoiffeurs,
  });

  const coiffeurs = data?.coiffeurs ?? [];

  const totalRdv     = coiffeurs.reduce((s, c) => s + c.totalRdv, 0);
  const totalRevenue = coiffeurs.reduce((s, c) => s + c.revenue, 0);
  const activeCount  = coiffeurs.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coiffeurs</h1>
          <p className="text-gray-400 mt-1">
            {coiffeurs.length} coiffeur(s) — {activeCount} actif(s)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-white text-gray-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm"
        >
          + Nouveau coiffeur
        </button>
      </div>

      {/* KPI globaux */}
      {!isLoading && coiffeurs.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total RDV',       value: totalRdv,            icon: '📅' },
            { label: 'CA Total',        value: formatXOF(totalRevenue), icon: '💰' },
            { label: 'Coiffeurs actifs', value: `${activeCount} / ${coiffeurs.length}`, icon: '👨‍💼' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4">
              <span className="text-3xl">{icon}</span>
              <div>
                <p className="text-white font-bold text-xl">{value}</p>
                <p className="text-gray-400 text-sm">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tableau */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : coiffeurs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          Aucun coiffeur — créez le premier !
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Coiffeur', 'Statut', 'Total RDV', 'Terminés', 'No-shows', 'CA Généré', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-4 text-gray-400 text-sm font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {coiffeurs.map((coiffeur) => {
                const noShowRate = coiffeur.totalRdv > 0
                  ? Math.round((coiffeur.noShowRdv / coiffeur.totalRdv) * 100)
                  : 0;

                return (
                  <tr key={coiffeur.id} className="hover:bg-gray-800/50 transition-colors">

                    {/* Identité */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {coiffeur.firstName[0]}{coiffeur.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {coiffeur.firstName} {coiffeur.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{coiffeur.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${
                        coiffeur.isActive
                          ? 'bg-green-900/50 text-green-300'
                          : 'bg-gray-800 text-gray-500'
                      }`}>
                        {coiffeur.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>

                    {/* Total RDV */}
                    <td className="px-5 py-4 text-white font-medium">
                      {coiffeur.totalRdv}
                    </td>

                    {/* Terminés */}
                    <td className="px-5 py-4 text-green-300 font-medium">
                      {coiffeur.completedRdv}
                    </td>

                    {/* No-shows */}
                    <td className="px-5 py-4">
                      <span className={noShowRate > 15 ? 'text-red-300 font-medium' : 'text-gray-400'}>
                        {coiffeur.noShowRdv}
                        {noShowRate > 15 && <span className="text-xs ml-1">({noShowRate}% ⚠️)</span>}
                      </span>
                    </td>

                    {/* CA */}
                    <td className="px-5 py-4 text-amber-300 font-medium">
                      {formatXOF(coiffeur.revenue)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setSelected(coiffeur)}
                        className="text-xs text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        📊 Détails
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateCoiffeurModal onClose={() => setShowCreate(false)} />
      )}

      {selected && (
        <CoiffeurStatsModal
          coiffeur={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}