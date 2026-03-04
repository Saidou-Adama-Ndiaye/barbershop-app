// apps/web/app/admin/coupons/page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
  AdminCoupon,
  CreateCouponPayload,
} from '@/lib/admin/api';

// ─── Helpers ──────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency', currency: 'XOF', minimumFractionDigits: 0,
  }).format(n);

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat('fr-SN', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).format(new Date(d));

const isExpired = (expiresAt: string | null): boolean => {
  if (!expiresAt) return false;
  return new Date() > new Date(expiresAt);
};

// ─── Form par défaut ──────────────────────────────────────
const EMPTY_FORM: CreateCouponPayload = {
  code:         '',
  discountType: 'percent',
  value:        10,
  minOrder:     0,
  maxUses:      undefined,
  expiresAt:    undefined,
  isActive:     true,
};

// ─── Badge statut coupon ──────────────────────────────────
function CouponStatusBadge({ coupon }: { coupon: AdminCoupon }) {
  if (!coupon.isActive)
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-gray-500">
        Inactif
      </span>
    );
  if (isExpired(coupon.expiresAt))
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-red-900/50 text-red-300 border border-red-800">
        Expiré
      </span>
    );
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-orange-900/50 text-orange-300 border border-orange-800">
        Épuisé
      </span>
    );
  return (
    <span className="text-xs px-2.5 py-1 rounded-full bg-green-900/50 text-green-300 border border-green-800">
      Actif
    </span>
  );
}

// ─── Modal création / édition ─────────────────────────────
function CouponModal({
  coupon,
  onClose,
}: {
  coupon:  AdminCoupon | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateCouponPayload>(
    coupon
      ? {
          code:         coupon.code,
          discountType: coupon.discountType,
          value:        Number(coupon.value),
          minOrder:     Number(coupon.minOrder),
          maxUses:      coupon.maxUses ?? undefined,
          expiresAt:    coupon.expiresAt
            ? new Date(coupon.expiresAt).toISOString().slice(0, 16)
            : undefined,
          isActive:     coupon.isActive,
        }
      : EMPTY_FORM,
  );
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      coupon
        ? updateAdminCoupon(coupon.id, {
            ...form,
            code:      form.code.trim().toUpperCase(),
            expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
          })
        : createAdminCoupon({
            ...form,
            code:      form.code.trim().toUpperCase(),
            expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
          }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      onClose();
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message ?? 'Erreur serveur';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const set = <K extends keyof CreateCouponPayload>(
    key: K,
    value: CreateCouponPayload[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const isValid = form.code.trim().length >= 2 && form.value > 0;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg space-y-5 my-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {coupon ? '✏️ Modifier le coupon' : '🎟️ Nouveau coupon'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">

          {/* Code promo */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Code promo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              placeholder="Ex: PROMO20"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white font-mono uppercase outline-none focus:border-gray-500 text-sm"
            />
          </div>

          {/* Type + Valeur */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Type de remise</label>
              <select
                value={form.discountType}
                onChange={(e) =>
                  set('discountType', e.target.value as 'percent' | 'fixed')
                }
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none text-sm"
              >
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (XOF)</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Valeur{' '}
                <span className="text-gray-500">
                  ({form.discountType === 'percent' ? '%' : 'XOF'})
                </span>{' '}
                <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                min={0}
                max={form.discountType === 'percent' ? 100 : undefined}
                value={form.value}
                onChange={(e) => set('value', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
          </div>

          {/* Montant min + Max utilisations */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Montant min. commande (XOF)
              </label>
              <input
                type="number"
                min={0}
                value={form.minOrder ?? 0}
                onChange={(e) => set('minOrder', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Max. utilisations{' '}
                <span className="text-gray-500">(vide = illimité)</span>
              </label>
              <input
                type="number"
                min={1}
                value={form.maxUses ?? ''}
                onChange={(e) =>
                  set('maxUses', e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="Illimité"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
          </div>

          {/* Date expiration */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Date d&apos;expiration{' '}
              <span className="text-gray-500">(optionnelle)</span>
            </label>
            <input
              type="datetime-local"
              value={form.expiresAt ?? ''}
              onChange={(e) =>
                set('expiresAt', e.target.value || undefined)
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm [color-scheme:dark]"
            />
          </div>

          {/* Toggle actif */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
            <span className="text-sm text-gray-300">Coupon actif</span>
            <button
              onClick={() => set('isActive', !form.isActive)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.isActive ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  form.isActive ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Aperçu de la remise */}
        {form.value > 0 && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 text-sm text-gray-300">
            <span className="text-gray-500">Aperçu : </span>
            {form.discountType === 'percent'
              ? `${form.value}% de réduction${form.minOrder ? ` dès ${fmt(form.minOrder)}` : ''}`
              : `${fmt(form.value)} de réduction${form.minOrder ? ` dès ${fmt(form.minOrder)}` : ''}`}
            {form.maxUses ? ` · max ${form.maxUses} utilisations` : ''}
            {form.expiresAt
              ? ` · expire le ${new Date(form.expiresAt).toLocaleDateString('fr-SN')}`
              : ''}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !isValid}
            className="flex-1 bg-white text-gray-900 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm disabled:opacity-50"
          >
            {mutation.isPending
              ? 'Enregistrement...'
              : coupon
              ? 'Modifier'
              : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function AdminCouponsPage() {
  const queryClient                       = useQueryClient();
  const [modal, setModal]                 = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected]           = useState<AdminCoupon | null>(null);
  const [deleteTarget, setDeleteTarget]   = useState<AdminCoupon | null>(null);
  const [search, setSearch]               = useState('');
  const [filterActive, setFilterActive]   = useState<'all' | 'active' | 'inactive'>('all');

  // ─── Fetch ───────────────────────────────────────────
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn:  getAdminCoupons,
  });

  // ─── Suppression ─────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminCoupon(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      setDeleteTarget(null);
    },
  });

  // ─── Toggle actif rapide ─────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateAdminCoupon(id, { isActive }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  // ─── Filtres ─────────────────────────────────────────
  const filtered = coupons.filter((c) => {
    const matchSearch =
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchActive =
      filterActive === 'all'
        ? true
        : filterActive === 'active'
        ? c.isActive
        : !c.isActive;
    return matchSearch && matchActive;
  });

  // ─── Stats rapides ────────────────────────────────────
  const totalActive  = coupons.filter((c) => c.isActive && !isExpired(c.expiresAt)).length;
  const totalExpired = coupons.filter((c) => isExpired(c.expiresAt)).length;
  const totalUses    = coupons.reduce((sum, c) => sum + c.usedCount, 0);

  return (
    <div className="space-y-6 text-white">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="text-gray-400 mt-1">
            {coupons.length} coupon{coupons.length > 1 ? 's' : ''} au total
          </p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="bg-white text-gray-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm"
        >
          + Nouveau coupon
        </button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: '✅', label: 'Coupons actifs',    value: totalActive  },
          { icon: '⏰', label: 'Expirés',            value: totalExpired },
          { icon: '🔢', label: 'Utilisations totales', value: totalUses  },
        ].map(({ icon, label, value }) => (
          <div
            key={label}
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center gap-4"
          >
            <span className="text-3xl">{icon}</span>
            <div>
              <p className="text-gray-400 text-sm">{label}</p>
              <p className="text-white text-2xl font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtres ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un code..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm outline-none focus:border-gray-500"
          />
        </div>
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilterActive(f)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              filterActive === f
                ? 'bg-white text-gray-900'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {{ all: 'Tous', active: 'Actifs', inactive: 'Inactifs' }[f]}
          </button>
        ))}
      </div>

      {/* ── Tableau ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🎟️</p>
          <p>
            {search ? 'Aucun coupon trouvé' : 'Aucun coupon — créez le premier !'}
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {[
                  'Code', 'Remise', 'Min. commande',
                  'Utilisations', 'Expiration', 'Statut', 'Actions',
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-5 py-4 text-gray-400 text-sm font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((coupon) => (
                <tr
                  key={coupon.id}
                  className="hover:bg-gray-800/50 transition-colors"
                >
                  {/* Code */}
                  <td className="px-5 py-4">
                    <span className="font-mono font-bold text-white bg-gray-800 px-3 py-1.5 rounded-lg text-sm tracking-wider">
                      {coupon.code}
                    </span>
                  </td>

                  {/* Remise */}
                  <td className="px-5 py-4">
                    <span className={`font-semibold text-sm ${
                      coupon.discountType === 'percent'
                        ? 'text-blue-300'
                        : 'text-green-300'
                    }`}>
                      {coupon.discountType === 'percent'
                        ? `${coupon.value}%`
                        : fmt(Number(coupon.value))}
                    </span>
                    <span className="text-gray-600 text-xs ml-1">
                      {coupon.discountType === 'percent' ? 'réduction' : 'fixe'}
                    </span>
                  </td>

                  {/* Min commande */}
                  <td className="px-5 py-4 text-sm text-gray-400">
                    {Number(coupon.minOrder) > 0
                      ? fmt(Number(coupon.minOrder))
                      : <span className="text-gray-600">—</span>}
                  </td>

                  {/* Utilisations */}
                  <td className="px-5 py-4">
                    <div className="text-sm">
                      <span className="text-white font-medium">{coupon.usedCount}</span>
                      {coupon.maxUses !== null && (
                        <span className="text-gray-500"> / {coupon.maxUses}</span>
                      )}
                      {coupon.maxUses === null && (
                        <span className="text-gray-600 text-xs ml-1">illimité</span>
                      )}
                    </div>
                    {/* Barre de progression si maxUses défini */}
                    {coupon.maxUses !== null && (
                      <div className="mt-1 h-1 w-20 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              (coupon.usedCount / coupon.maxUses) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                  </td>

                  {/* Expiration */}
                  <td className="px-5 py-4 text-sm">
                    {coupon.expiresAt ? (
                      <span
                        className={
                          isExpired(coupon.expiresAt)
                            ? 'text-red-400'
                            : 'text-gray-400'
                        }
                      >
                        {fmtDate(coupon.expiresAt)}
                      </span>
                    ) : (
                      <span className="text-gray-600">Sans limite</span>
                    )}
                  </td>

                  {/* Statut */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <CouponStatusBadge coupon={coupon} />
                      {/* Toggle rapide actif/inactif */}
                      <button
                        onClick={() =>
                          toggleMutation.mutate({
                            id: coupon.id,
                            isActive: !coupon.isActive,
                          })
                        }
                        disabled={toggleMutation.isPending}
                        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                          coupon.isActive ? 'bg-green-600' : 'bg-gray-600'
                        }`}
                        title={coupon.isActive ? 'Désactiver' : 'Activer'}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            coupon.isActive ? 'left-4' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelected(coupon);
                          setModal('edit');
                        }}
                        className="text-xs text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => setDeleteTarget(coupon)}
                        className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal création / édition ─────────────────────── */}
      {(modal === 'create' || modal === 'edit') && (
        <CouponModal
          coupon={modal === 'edit' ? selected : null}
          onClose={() => { setModal(null); setSelected(null); }}
        />
      )}

      {/* ── Modal suppression ───────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-white font-bold text-lg">Supprimer le coupon ?</h3>
              <p className="text-gray-400 text-sm mt-2">
                Le code{' '}
                <span className="font-mono font-bold text-white bg-gray-800 px-2 py-0.5 rounded">
                  {deleteTarget.code}
                </span>{' '}
                sera définitivement supprimé.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}