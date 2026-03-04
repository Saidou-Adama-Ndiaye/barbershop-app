// apps\web\app\admin\packs\page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminPacks, createAdminPack, updateAdminPack, deleteAdminPack,
  addProductToPack, removeProductFromPack,
  getAdminCategories, getAdminProducts,
  AdminPack, AdminProduct, AdminCategory,
} from '@/lib/admin/api';

const formatXOF = (n: number) =>
  new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);

function toSlug(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Modal Pack Info ──────────────────────────────────────
function PackModal({
  pack, categories, onClose,
}: {
  pack: AdminPack | null;
  categories: AdminCategory[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name:           pack?.name           ?? '',
    slug:           pack?.slug           ?? '',
    description:    pack?.description    ?? '',
    basePrice:      pack ? Number(pack.basePrice) : 0,
    discountPct:    pack ? Number(pack.discountPct) : 0,
    isCustomizable: pack?.isCustomizable ?? true,
    categoryId:     pack?.categoryId     ?? '',
    isActive:       pack?.isActive       ?? true,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      pack ? updateAdminPack(pack.id, form) : createAdminPack(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packs'] });
      onClose();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Erreur';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const finalPrice = Math.round(form.basePrice * (1 - form.discountPct / 100));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg space-y-5 my-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">{pack ? 'Modifier le pack' : 'Nouveau pack'}</h3>
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
              onChange={(e) => setForm((f) => ({
                ...f, name: e.target.value,
                slug: pack ? f.slug : toSlug(e.target.value),
              }))}
              placeholder="Ex: Pack Rasage Pro"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Slug *</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="pack-rasage-pro"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm font-mono"
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

          {/* Prix + Remise */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Prix de base (XOF) *</label>
              <input
                type="number" min={0} value={form.basePrice}
                onChange={(e) => setForm((f) => ({ ...f, basePrice: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Remise (%)</label>
              <input
                type="number" min={0} max={100} value={form.discountPct}
                onChange={(e) => setForm((f) => ({ ...f, discountPct: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
          </div>

          {/* Prix final calculé */}
          {form.discountPct > 0 && (
            <div className="bg-green-900/20 border border-green-800 rounded-xl px-4 py-2.5 text-sm">
              <span className="text-gray-400">Prix final après remise : </span>
              <span className="text-green-300 font-bold">{formatXOF(finalPrice)}</span>
            </div>
          )}

          {/* Catégorie */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Catégorie</label>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none text-sm"
            >
              <option value="">Sans catégorie</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            {[
              { key: 'isCustomizable', label: 'Pack personnalisable (clients peuvent modifier)' },
              { key: 'isActive',       label: 'Pack actif (visible en boutique)' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
                <span className="text-sm text-gray-300">{label}</span>
                <button
                  onClick={() => setForm((f) => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    form[key as keyof typeof form] ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    form[key as keyof typeof form] ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm">
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.slug || form.basePrice <= 0}
            className="flex-1 bg-white text-gray-900 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm disabled:opacity-50"
          >
            {mutation.isPending ? 'Enregistrement...' : pack ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Builder Produits d'un Pack ───────────────────────────
function PackBuilder({
  pack,
  products,
  onClose,
}: {
  pack:     AdminPack;
  products: AdminProduct[];
  onClose:  () => void;
}) {
  const queryClient  = useQueryClient();
  const [search, setSearch] = useState('');
  const [qty,    setQty]    = useState<Record<string, number>>({});
  const [opt,    setOpt]    = useState<Record<string, boolean>>({});

  const packProductIds = new Set(pack.packProducts?.map((pp) => pp.productId) ?? []);

  const addMutation = useMutation({
    mutationFn: ({ productId }: { productId: string }) =>
      addProductToPack(pack.id, {
        productId,
        quantity:   qty[productId]   ?? 1,
        isOptional: opt[productId]   ?? false,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-packs'] }),
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeProductFromPack(pack.id, productId),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['admin-packs'] }),
  });

  const available = products.filter((p) =>
    p.isActive &&
    !packProductIds.has(p.id) &&
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl space-y-5 my-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">🔧 Builder — {pack.name}</h3>
            <p className="text-gray-400 text-sm mt-0.5">Gérer les produits du pack</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {/* Produits actuels */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">
            Produits inclus ({pack.packProducts?.length ?? 0})
          </h4>
          {pack.packProducts?.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4 bg-gray-800 rounded-xl">
              Aucun produit dans ce pack
            </p>
          ) : (
            <div className="space-y-2">
              {pack.packProducts?.map((pp) => (
                <div
                  key={pp.id}
                  className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{pp.product.name}</p>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-400">Qté : {pp.quantity}</span>
                      {pp.isOptional && (
                        <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded-full">
                          Optionnel
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatXOF(Number(pp.product.unitPrice))}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMutation.mutate(pp.productId)}
                    disabled={removeMutation.isPending}
                    className="text-red-400 hover:text-red-300 text-sm ml-4 border border-red-900 hover:border-red-700 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    ✕ Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Séparateur */}
        <div className="border-t border-gray-800" />

        {/* Ajouter des produits */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Ajouter un produit</h4>
          <input
            type="text" value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500 mb-3"
          />

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {available.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">
                {search ? 'Aucun produit trouvé' : 'Tous les produits actifs sont déjà dans ce pack'}
              </p>
            ) : (
              available.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3"
                >
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-gray-400">{formatXOF(Number(product.unitPrice))}</p>
                  </div>

                  {/* Quantité */}
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500">Qté</label>
                    <input
                      type="number" min={1}
                      value={qty[product.id] ?? 1}
                      onChange={(e) => setQty((q) => ({ ...q, [product.id]: Number(e.target.value) }))}
                      className="w-14 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-white text-xs text-center outline-none"
                    />
                  </div>

                  {/* Optionnel */}
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={opt[product.id] ?? false}
                      onChange={(e) => setOpt((o) => ({ ...o, [product.id]: e.target.checked }))}
                      className="w-3.5 h-3.5 rounded"
                    />
                    <span className="text-xs text-gray-400">Optionnel</span>
                  </label>

                  {/* Ajouter */}
                  <button
                    onClick={() => addMutation.mutate({ productId: product.id })}
                    disabled={addMutation.isPending}
                    className="text-xs bg-white text-gray-900 px-3 py-1.5 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                  >
                    + Ajouter
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="border border-gray-700 text-gray-300 px-6 py-2.5 rounded-xl hover:bg-gray-800 text-sm"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function AdminPacksPage() {
  const queryClient = useQueryClient();
  const [modal,        setModal]        = useState<'create' | 'edit' | 'builder' | null>(null);
  const [selected,     setSelected]     = useState<AdminPack | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPack | null>(null);
  const [search,       setSearch]       = useState('');

  const { data: packs      = [], isLoading } = useQuery({ queryKey: ['admin-packs'],      queryFn: getAdminPacks      });
  const { data: categories = [] }            = useQuery({ queryKey: ['admin-categories'], queryFn: getAdminCategories });
  const { data: products   = [] }            = useQuery({ queryKey: ['admin-products'],   queryFn: getAdminProducts   });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminPack(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packs'] });
      setDeleteTarget(null);
    },
  });

  const filtered = packs.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Packs</h1>
          <p className="text-gray-400 mt-1">{packs.length} pack(s) au total</p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="bg-white text-gray-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm"
        >
          + Nouveau pack
        </button>
      </div>

      {/* Recherche */}
      <input
        type="text" value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par nom ou slug..."
        className="w-full max-w-sm bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500"
      />

      {/* Tableau */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Pack', 'Catégorie', 'Prix', 'Remise', 'Produits', 'Statut', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-4 text-gray-400 text-sm font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((pack) => {
                const finalPrice = Math.round(
                  Number(pack.basePrice) * (1 - Number(pack.discountPct) / 100),
                );
                return (
                  <tr key={pack.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-white">{pack.name}</p>
                      <span className="font-mono text-xs text-gray-500">{pack.slug}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {pack.category?.name ?? <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-white font-medium text-sm">{formatXOF(Number(pack.basePrice))}</p>
                      {Number(pack.discountPct) > 0 && (
                        <p className="text-green-400 text-xs">{formatXOF(finalPrice)}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {Number(pack.discountPct) > 0
                        ? <span className="text-green-400 font-medium">-{pack.discountPct}%</span>
                        : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full border border-gray-700">
                        {pack.packProducts?.length ?? 0} produit(s)
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${
                        pack.isActive ? 'bg-green-900/50 text-green-300' : 'bg-gray-800 text-gray-500'
                      }`}>
                        {pack.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelected(pack); setModal('builder'); }}
                          className="text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          🔧 Produits
                        </button>
                        <button
                          onClick={() => { setSelected(pack); setModal('edit'); }}
                          className="text-xs text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => setDeleteTarget(pack)}
                          className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {search ? 'Aucun pack trouvé' : 'Aucun pack — créez le premier !'}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <PackModal
          pack={modal === 'edit' ? selected : null}
          categories={categories}
          onClose={() => { setModal(null); setSelected(null); }}
        />
      )}

      {modal === 'builder' && selected && (
        <PackBuilder
          pack={selected}
          products={products}
          onClose={() => { setModal(null); setSelected(null); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-white font-bold">Désactiver le pack ?</h3>
              <p className="text-gray-400 text-sm mt-2">
                <span className="text-white font-medium">{deleteTarget.name}</span> sera masqué de la boutique.
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