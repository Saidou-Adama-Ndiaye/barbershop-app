// apps\web\app\admin\produits\page.tsx
'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminProducts, createAdminProduct,
  updateAdminProduct, deleteAdminProduct,
  getAdminCategories,
  AdminProduct, AdminCategory,
} from '@/lib/admin/api';

interface ProductForm {
  name:        string;
  description: string;
  unitPrice:   number;
  stockQty:    number;
  sku:         string;
  categoryId:  string;
  isActive:    boolean;
}

const EMPTY_FORM: ProductForm = {
  name: '', description: '', unitPrice: 0,
  stockQty: 0, sku: '', categoryId: '', isActive: true,
};

const formatXOF = (n: number) =>
  new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);

// ─── Modal Produit ────────────────────────────────────────
function ProductModal({
  product,
  categories,
  onClose,
}: {
  product:    AdminProduct | null;
  categories: AdminCategory[];
  onClose:    () => void;
}) {
  const queryClient = useQueryClient();
  const fileRef     = useRef<HTMLInputElement>(null);
  const [form, setForm]     = useState<ProductForm>(
    product
      ? {
          name:        product.name,
          description: product.description ?? '',
          unitPrice:   Number(product.unitPrice),
          stockQty:    product.stockQty,
          sku:         product.sku ?? '',
          categoryId:  product.categoryId ?? '',
          isActive:    product.isActive,
        }
      : EMPTY_FORM,
  );
  const [files,   setFiles]   = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error,   setError]   = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('name',        form.name);
      fd.append('description', form.description);
      fd.append('unitPrice',   String(form.unitPrice));
      fd.append('stockQty',    String(form.stockQty));
      fd.append('isActive',    String(form.isActive));
      if (form.sku)        fd.append('sku',        form.sku);
      if (form.categoryId) fd.append('categoryId', form.categoryId);
      files.forEach((f) => fd.append('images', f));

      return product
        ? updateAdminProduct(product.id, fd)
        : createAdminProduct(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      onClose();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Erreur';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    setFiles(selected);
    setPreviews(selected.map((f) => URL.createObjectURL(f)));
  };

  const field = (
    label:       string,
    key:         keyof ProductForm,
    type:        string = 'text',
    placeholder: string = '',
    required:    boolean = false,
  ) => (
    <div>
      <label className="text-sm text-gray-400 block mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={form[key] as string | number}
        onChange={(e) =>
          setForm((f) => ({
            ...f,
            [key]: type === 'number' ? Number(e.target.value) : e.target.value,
          }))
        }
        placeholder={placeholder}
        min={type === 'number' ? 0 : undefined}
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-xl space-y-5 my-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {product ? 'Modifier le produit' : 'Nouveau produit'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Images upload */}
        <div>
          <label className="text-sm text-gray-400 block mb-2">
            Images (max 5 — optionnelles)
          </label>
          <div
            className="border-2 border-dashed border-gray-700 rounded-xl p-4 cursor-pointer hover:border-gray-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {previews.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                {previews.map((p, i) => (
                  <img key={i} src={p} alt="" className="h-16 w-16 object-cover rounded-lg" />
                ))}
              </div>
            ) : product?.imageUrls?.length ? (
              <p className="text-sm text-gray-400 text-center">
                {product.imageUrls.length} image(s) existante(s) — cliquer pour remplacer
              </p>
            ) : (
              <p className="text-sm text-gray-500 text-center">
                📷 Cliquer pour uploader des images
              </p>
            )}
            <input
              ref={fileRef} type="file" accept="image/*"
              multiple className="hidden" onChange={handleFiles}
            />
          </div>
        </div>

        {/* Champs */}
        <div className="space-y-4">
          {field('Nom du produit', 'name', 'text', 'Ex: Pomade Premium', true)}

          <div>
            <label className="text-sm text-gray-400 block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Description du produit..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field('Prix unitaire (XOF) *', 'unitPrice', 'number', '5000', true)}
            {field('Stock initial', 'stockQty', 'number', '0')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              {field('SKU', 'sku', 'text', 'Ex: POMADE-001')}
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Catégorie</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none text-sm"
              >
                <option value="">Sans catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actif toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
            <span className="text-sm text-gray-300">Produit actif (visible en boutique)</span>
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
            className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.name || form.unitPrice <= 0}
            className="flex-1 bg-white text-gray-900 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm disabled:opacity-50"
          >
            {mutation.isPending ? 'Enregistrement...' : product ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function AdminProduitsPage() {
  const queryClient = useQueryClient();
  const [modal,        setModal]        = useState<'create' | 'edit' | null>(null);
  const [selected,     setSelected]     = useState<AdminProduct | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [search,       setSearch]       = useState('');
  const [catFilter,    setCatFilter]    = useState('');
  const [page,         setPage]         = useState(1);
  const PER_PAGE = 15;

  const { data: products  = [], isLoading: loadingProducts }  = useQuery({
    queryKey: ['admin-products'],
    queryFn:  getAdminProducts,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn:  getAdminCategories,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminProduct(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteTarget(null);
    },
  });

  const filtered = products.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter ? p.categoryId === catFilter : true;
    return matchSearch && matchCat;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const stockBadge = (qty: number) => {
    if (qty < 5)  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-300 border border-red-800">⚠️ {qty}</span>;
    if (qty < 10) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/50 text-amber-300 border border-amber-800">⚡ {qty}</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-300 border border-green-800">✓ {qty}</span>;
  };

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produits</h1>
          <p className="text-gray-400 mt-1">{products.length} produit(s) au total</p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="bg-white text-gray-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm"
        >
          + Nouveau produit
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher nom ou SKU..."
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500 flex-1 min-w-48"
        />
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white outline-none"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      {loadingProducts ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Produit', 'SKU', 'Catégorie', 'Prix', 'Stock', 'Statut', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-5 py-4 text-gray-400 text-sm font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {paginated.map((product) => (
                <tr key={product.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-gray-500 truncate max-w-40">{product.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                      {product.sku ?? '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-400">
                    {product.category?.name ?? <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-white">
                    {formatXOF(Number(product.unitPrice))}
                  </td>
                  <td className="px-5 py-3">
                    {stockBadge(product.stockQty)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${
                      product.isActive
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-gray-800 text-gray-500'
                    }`}>
                      {product.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setSelected(product); setModal('edit'); }}
                        className="text-xs text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        ✏️ Modifier
                      </button>
                      <button
                        onClick={() => setDeleteTarget(product)}
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

          {paginated.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {search || catFilter ? 'Aucun produit trouvé' : 'Aucun produit — créez le premier !'}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-40 hover:bg-gray-800"
          >
            ← Précédent
          </button>
          <span className="px-4 py-2 text-sm text-gray-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-40 hover:bg-gray-800"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Modal création/édition */}
      {(modal === 'create' || modal === 'edit') && (
        <ProductModal
          product={modal === 'edit' ? selected : null}
          categories={categories}
          onClose={() => { setModal(null); setSelected(null); }}
        />
      )}

      {/* Modal suppression */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-white font-bold text-lg">Désactiver le produit ?</h3>
              <p className="text-gray-400 text-sm mt-2">
                <span className="text-white font-medium">{deleteTarget.name}</span> sera masqué de la boutique.
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
                {deleteMutation.isPending ? 'Suppression...' : 'Désactiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}