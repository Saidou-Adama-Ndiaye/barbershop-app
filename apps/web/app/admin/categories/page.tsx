// apps\web\app\admin\categories\page.tsx
'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminCategories, createAdminCategory,
  updateAdminCategory, deleteAdminCategory,
  AdminCategory,
} from '@/lib/admin/api';

// ─── Types formulaire ─────────────────────────────────────
interface CategoryForm {
  name:        string;
  slug:        string;
  description: string;
  parentId:    string;
  sortOrder:   number;
  isActive:    boolean;
}

const EMPTY_FORM: CategoryForm = {
  name: '', slug: '', description: '', parentId: '', sortOrder: 0, isActive: true,
};

// ─── Helper slug ──────────────────────────────────────────
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ─── Modal ────────────────────────────────────────────────
function CategoryModal({
  category,
  categories,
  onClose,
}: {
  category:   AdminCategory | null;
  categories: AdminCategory[];
  onClose:    () => void;
}) {
  const queryClient = useQueryClient();
  const fileRef     = useRef<HTMLInputElement>(null);
  const [form, setForm]       = useState<CategoryForm>(
    category
      ? {
          name:        category.name,
          slug:        category.slug,
          description: category.description ?? '',
          parentId:    category.parentId ?? '',
          sortOrder:   category.sortOrder,
          isActive:    category.isActive,
        }
      : EMPTY_FORM,
  );
  const [preview, setPreview] = useState<string | null>(null);
  const [file,    setFile]    = useState<File | null>(null);
  const [error,   setError]   = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('name',        form.name);
      fd.append('slug',        form.slug);
      fd.append('description', form.description);
      fd.append('sortOrder',   String(form.sortOrder));
      fd.append('isActive',    String(form.isActive));
      if (form.parentId) fd.append('parentId', form.parentId);
      if (file) fd.append('image', file);

      if (category) {
        return updateAdminCategory(category.id, fd);
      }
      return createAdminCategory(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      onClose();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Erreur';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handleNameChange = (val: string) => {
    setForm((f) => ({
      ...f,
      name: val,
      slug: category ? f.slug : toSlug(val),
    }));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const parents = categories.filter((c) => c.id !== category?.id);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {category ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Formulaire */}
        <div className="space-y-4">

          {/* Image upload */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Image (optionnelle)</label>
            <div
              className="border-2 border-dashed border-gray-700 rounded-xl p-4 text-center cursor-pointer hover:border-gray-500 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {preview || category?.imageUrl ? (
                <img
                  src={preview ?? `/api/placeholder/200/100`}
                  alt="preview"
                  className="h-20 object-contain mx-auto rounded"
                />
              ) : (
                <div className="text-gray-500 text-sm">
                  <p className="text-2xl mb-1">🖼️</p>
                  <p>Cliquer pour uploader (max 5 Mo)</p>
                </div>
              )}
              <input
                ref={fileRef} type="file" accept="image/*"
                className="hidden" onChange={handleFile}
              />
            </div>
          </div>

          {/* Nom */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Nom *</label>
            <input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Rasage"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Slug *</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="Ex: rasage"
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
              placeholder="Description optionnelle..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm resize-none"
            />
          </div>

          {/* Parent + Ordre sur une ligne */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Catégorie parente</label>
              <select
                value={form.parentId}
                onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none text-sm"
              >
                <option value="">Aucune (racine)</option>
                {parents.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Ordre d&apos;affichage</label>
              <input
                type="number" min={0} value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none text-sm"
              />
            </div>
          </div>

          {/* Actif toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
            <span className="text-sm text-gray-300">Catégorie active</span>
            <button
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-green-600' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.isActive ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 transition-colors text-sm"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || !form.slug}
            className="flex-1 bg-white text-gray-900 py-2.5 rounded-xl font-semibold hover:bg-gray-100 transition-colors text-sm disabled:opacity-50"
          >
            {mutation.isPending ? 'Enregistrement...' : category ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────
function ConfirmDelete({
  name,
  onConfirm,
  onCancel,
  loading,
}: {
  name:      string;
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="text-center">
          <p className="text-3xl mb-3">🗑️</p>
          <h3 className="text-white font-bold text-lg">Désactiver la catégorie ?</h3>
          <p className="text-gray-400 text-sm mt-2">
            <span className="text-white font-medium">{name}</span> sera masquée du catalogue.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm">
            Annuler
          </button>
          <button
            onClick={onConfirm} disabled={loading}
            className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold hover:bg-red-700 text-sm disabled:opacity-50"
          >
            {loading ? 'Suppression...' : 'Désactiver'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [modal,       setModal]       = useState<'create' | 'edit' | null>(null);
  const [selected,    setSelected]    = useState<AdminCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [search,      setSearch]      = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn:  getAdminCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminCategory(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setDeleteTarget(null);
    },
  });

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const openEdit = (cat: AdminCategory) => {
    setSelected(cat);
    setModal('edit');
  };

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catégories</h1>
          <p className="text-gray-400 mt-1">{categories.length} catégorie(s) au total</p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="bg-white text-gray-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-100 transition-colors text-sm"
        >
          + Nouvelle catégorie
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
            <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Image', 'Nom', 'Slug', 'Parent', 'Ordre', 'Statut', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-4 text-gray-400 text-sm font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-800/50 transition-colors">

                  {/* Image */}
                  <td className="px-5 py-3">
                    {cat.imageUrl ? (
                      <div className="w-10 h-10 rounded-lg bg-gray-700 overflow-hidden">
                        <div className="w-full h-full bg-gray-600 flex items-center justify-center text-xs text-gray-400">
                          🖼️
                        </div>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                        —
                      </div>
                    )}
                  </td>

                  {/* Nom */}
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{cat.name}</p>
                    {cat.description && (
                      <p className="text-xs text-gray-500 truncate max-w-32">{cat.description}</p>
                    )}
                  </td>

                  {/* Slug */}
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                      {cat.slug}
                    </span>
                  </td>

                  {/* Parent */}
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {cat.parent?.name ?? <span className="text-gray-600">—</span>}
                  </td>

                  {/* Ordre */}
                  <td className="px-5 py-3 text-sm text-gray-400 text-center">
                    {cat.sortOrder}
                  </td>

                  {/* Statut */}
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      cat.isActive
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-gray-800 text-gray-500'
                    }`}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-xs text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
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

          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {search ? 'Aucune catégorie trouvée' : 'Aucune catégorie — créez la première !'}
            </div>
          )}
        </div>
      )}

      {/* Modal création/édition */}
      {(modal === 'create' || modal === 'edit') && (
        <CategoryModal
          category={modal === 'edit' ? selected : null}
          categories={categories}
          onClose={() => { setModal(null); setSelected(null); }}
        />
      )}

      {/* Modal suppression */}
      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}