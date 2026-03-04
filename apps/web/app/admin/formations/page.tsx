// apps\web\app\admin\formations\page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getAdminFormations, createAdminFormation,
  updateAdminFormation, deleteAdminFormation,
  uploadVideo, updateAdminVideo, deleteAdminVideo,
  AdminFormation, AdminVideo,
} from '@/lib/admin/api';
import api from '@/lib/api';

const formatXOF = (n: number) =>
  new Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(n);

const LEVELS = [
  { value: 'debutant',      label: 'Débutant'      },
  { value: 'intermediaire', label: 'Intermédiaire'  },
  { value: 'avance',        label: 'Avancé'         },
];

const levelColors: Record<string, string> = {
  debutant:      'bg-green-900/50 text-green-300',
  intermediaire: 'bg-amber-900/50 text-amber-300',
  avance:        'bg-red-900/50 text-red-300',
};

function toSlug(str: string) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Modal Formation ──────────────────────────────────────
function FormationModal({
  formation, onClose,
}: {
  formation: AdminFormation | null;
  onClose:   () => void;
}) {
  const queryClient = useQueryClient();
  const thumbRef    = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title:       formation?.title       ?? '',
    slug:        formation?.slug        ?? '',
    description: formation?.description ?? '',
    price:       formation ? Number(formation.price) : 0,
    level:       formation?.level       ?? 'debutant',
    language:    formation?.language    ?? 'fr',
    tags:        formation?.tags?.join(', ') ?? '',
    isPublished: formation?.isPublished ?? false,
  });
  const [thumbFile,    setThumbFile]    = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [error,        setError]        = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const fd = new FormData();
      fd.append('title',       form.title);
      fd.append('slug',        form.slug);
      fd.append('description', form.description);
      fd.append('price',       String(form.price));
      fd.append('level',       form.level);
      fd.append('language',    form.language);
      fd.append('isPublished', String(form.isPublished));
      // Tags : convertir "coupe, rasage" → array via JSON
      const tagsArr = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
      tagsArr.forEach((t) => fd.append('tags', t));
      if (thumbFile) fd.append('thumbnail', thumbFile);

      return formation
        ? updateAdminFormation(formation.id, fd)
        : createAdminFormation(fd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-formations'] });
      onClose();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Erreur';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    },
  });

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg space-y-5 my-8">

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {formation ? 'Modifier la formation' : 'Nouvelle formation'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm">{error}</div>
        )}

        <div className="space-y-4">

          {/* Thumbnail */}
          <div>
            <label className="text-sm text-gray-400 block mb-2">Miniature (thumbnail)</label>
            <div
              className="border-2 border-dashed border-gray-700 rounded-xl p-4 cursor-pointer hover:border-gray-500 transition-colors text-center"
              onClick={() => thumbRef.current?.click()}
            >
              {thumbPreview ? (
                <img src={thumbPreview} alt="" className="h-24 object-cover mx-auto rounded-lg" />
              ) : formation?.thumbnailUrl ? (
                <p className="text-sm text-gray-400">Miniature existante — cliquer pour remplacer</p>
              ) : (
                <p className="text-sm text-gray-500">🖼️ Cliquer pour uploader (max 5 Mo)</p>
              )}
              <input
                ref={thumbRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { setThumbFile(f); setThumbPreview(URL.createObjectURL(f)); }
                }}
              />
            </div>
          </div>

          {/* Titre */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Titre *</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({
                ...f, title: e.target.value,
                slug: formation ? f.slug : toSlug(e.target.value),
              }))}
              placeholder="Ex: Maîtriser le rasage traditionnel"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Slug *</label>
            <input
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm font-mono"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm resize-none"
            />
          </div>

          {/* Prix + Niveau + Langue */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Prix (XOF) *</label>
              <input
                type="number" min={0} value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Niveau</label>
              <select
                value={form.level}
                onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none text-sm"
              >
                {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Langue</label>
              <select
                value={form.language}
                onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none text-sm"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="wo">Wolof</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Tags <span className="text-gray-600 text-xs">(séparés par des virgules)</span>
            </label>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="coupe, rasage, débutant"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
            />
          </div>

          {/* Publié */}
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-xl">
            <div>
              <span className="text-sm text-gray-300">Formation publiée</span>
              <p className="text-xs text-gray-500 mt-0.5">Visible dans le catalogue public</p>
            </div>
            <button
              onClick={() => setForm((f) => ({ ...f, isPublished: !f.isPublished }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isPublished ? 'bg-green-600' : 'bg-gray-600'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.isPublished ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm">
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !form.title || !form.slug || form.price <= 0}
            className="flex-1 bg-white text-gray-900 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm disabled:opacity-50"
          >
            {mutation.isPending ? 'Enregistrement...' : formation ? 'Modifier' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Vidéos ─────────────────────────────────────────
function VideosModal({
  formation, onClose,
}: {
  formation: AdminFormation;
  onClose:   () => void;
}) {
  const queryClient = useQueryClient();
  const videoRef    = useRef<HTMLInputElement>(null);
  const [videos,    setVideos]    = useState<AdminVideo[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [videoForm, setVideoForm] = useState({
    title: '', isFreePreview: false, sortOrder: 0,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  // Charger vidéos
  useEffect(() => {
    setLoading(true);
    api
      .get<AdminVideo[]>(`/admin/formations/${formation.id}/videos`)
      .then(({ data }) => setVideos(data ?? []))
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, [formation.id]);

  const handleUpload = async () => {
    if (!selectedFile || !videoForm.title) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('video',         selectedFile);
      fd.append('title',         videoForm.title);
      fd.append('isFreePreview', String(videoForm.isFreePreview));
      fd.append('sortOrder',     String(videoForm.sortOrder));

      await uploadVideo(formation.id, fd, setProgress);

      // Recharger vidéos
      const { data } = await api.get<AdminVideo[]>(
        `/admin/formations/${formation.id}/videos`
      );
      setVideos(data ?? []);
      setSelectedFile(null);
      setVideoForm({ title: '', isFreePreview: false, sortOrder: 0 });
      setProgress(0);
      queryClient.invalidateQueries({ queryKey: ['admin-formations'] });
    } catch {
      setError('Erreur lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    try {
      await deleteAdminVideo(formation.id, videoId);
      setVideos((v) => v.filter((vid) => vid.id !== videoId));
    } catch {
      setError('Erreur lors de la suppression');
    }
  };

  const handleToggleFree = async (video: AdminVideo) => {
    try {
      await updateAdminVideo(formation.id, video.id, { isFreePreview: !video.isFreePreview });
      setVideos((v) => v.map((vid) =>
        vid.id === video.id ? { ...vid, isFreePreview: !vid.isFreePreview } : vid,
      ));
    } catch {
      setError('Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl space-y-5 my-8">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">🎬 Vidéos — {formation.title}</h3>
            <p className="text-gray-400 text-sm">{videos.length} vidéo(s)</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-3 text-red-300 text-sm">{error}</div>
        )}

        {/* Liste vidéos existantes */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Vidéos existantes</h4>
          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => <div key={i} className="h-14 bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          ) : videos.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6 bg-gray-800 rounded-xl">
              Aucune vidéo — uploadez la première !
            </p>
          ) : (
            <div className="space-y-2">
              {videos.map((video, i) => (
                <div key={video.id} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                  <span className="text-gray-500 text-sm w-6">{i + 1}.</span>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{video.title}</p>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {Math.floor(video.durationSec / 60)}min {video.durationSec % 60}s
                      </span>
                      {video.isFreePreview && (
                        <span className="text-xs bg-blue-900/50 text-blue-300 px-2 rounded-full">
                          Aperçu gratuit
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleFree(video)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      video.isFreePreview
                        ? 'border-blue-700 text-blue-300 hover:bg-blue-900/30'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {video.isFreePreview ? '🔓 Gratuit' : '🔒 Payant'}
                  </button>
                  <button
                    onClick={() => handleDeleteVideo(video.id)}
                    className="text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-2.5 py-1.5 rounded-lg text-xs transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-800" />

        {/* Upload nouvelle vidéo */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-gray-300">Uploader une vidéo</h4>

          {/* Zone drop fichier */}
          <div
            className="border-2 border-dashed border-gray-700 rounded-xl p-5 text-center cursor-pointer hover:border-gray-500 transition-colors"
            onClick={() => videoRef.current?.click()}
          >
            {selectedFile ? (
              <div>
                <p className="text-white text-sm font-medium">📹 {selectedFile.name}</p>
                <p className="text-gray-500 text-xs mt-1">
                  {(selectedFile.size / 1024 / 1024).toFixed(1)} Mo
                </p>
              </div>
            ) : (
              <div>
                <p className="text-3xl mb-2">🎬</p>
                <p className="text-gray-400 text-sm">Cliquer pour sélectionner une vidéo</p>
                <p className="text-gray-600 text-xs mt-1">MP4, MOV, AVI — max 500 Mo</p>
              </div>
            )}
            <input
              ref={videoRef} type="file"
              accept="video/mp4,video/mov,video/avi,video/*"
              className="hidden"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Infos vidéo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Titre de la vidéo *</label>
              <input
                value={videoForm.title}
                onChange={(e) => setVideoForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Introduction au rasage"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Ordre</label>
              <input
                type="number" min={0} value={videoForm.sortOrder}
                onChange={(e) => setVideoForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-gray-500 text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={videoForm.isFreePreview}
              onChange={(e) => setVideoForm((f) => ({ ...f, isFreePreview: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-300">Vidéo d&apos;aperçu gratuit (visible sans achat)</span>
          </label>

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>Upload en cours...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !videoForm.title}
            className="w-full bg-white text-gray-900 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm disabled:opacity-50 transition-colors"
          >
            {uploading ? `Upload ${progress}%...` : '📤 Uploader la vidéo'}
          </button>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="border border-gray-700 text-gray-300 px-6 py-2.5 rounded-xl hover:bg-gray-800 text-sm">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function AdminFormationsPage() {
  const queryClient = useQueryClient();
  const [modal,        setModal]        = useState<'create' | 'edit' | 'videos' | null>(null);
  const [selected,     setSelected]     = useState<AdminFormation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminFormation | null>(null);

  const { data: formations = [], isLoading } = useQuery({
    queryKey: ['admin-formations'],
    queryFn:  getAdminFormations,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminFormation(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['admin-formations'] });
      setDeleteTarget(null);
    },
  });

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Formations</h1>
          <p className="text-gray-400 mt-1">{formations.length} formation(s) au total</p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="bg-white text-gray-900 px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-100 text-sm"
        >
          + Nouvelle formation
        </button>
      </div>

      {/* Grille formations */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : formations.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          Aucune formation — créez la première !
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {formations.map((formation) => (
            <div
              key={formation.id}
              className={`bg-gray-900 border rounded-2xl overflow-hidden ${
                formation.isPublished ? 'border-gray-800' : 'border-gray-800 opacity-70'
              }`}
            >
              {/* Thumbnail placeholder */}
              <div className="h-32 bg-gray-800 flex items-center justify-center">
                {formation.thumbnailUrl ? (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500 text-sm">
                    🖼️ Miniature
                  </div>
                ) : (
                  <p className="text-gray-600 text-4xl">🎓</p>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Titre + badges */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-sm line-clamp-2">{formation.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      formation.isPublished ? 'bg-green-900/50 text-green-300' : 'bg-gray-800 text-gray-500'
                    }`}>
                      {formation.isPublished ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${levelColors[formation.level] ?? ''}`}>
                      {LEVELS.find((l) => l.value === formation.level)?.label}
                    </span>
                    <span className="text-xs text-gray-500 uppercase">{formation.language}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white font-bold">{formatXOF(Number(formation.price))}</span>
                  <span className="text-gray-500 text-xs">
                    {formation.totalEnrolled} inscrit(s)
                  </span>
                </div>

                {/* Tags */}
                {formation.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formation.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                        #{tag}
                      </span>
                    ))}
                    {formation.tags.length > 3 && (
                      <span className="text-xs text-gray-600">+{formation.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { setSelected(formation); setModal('videos'); }}
                    className="flex-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-900 hover:border-blue-700 py-2 rounded-xl transition-colors"
                  >
                    🎬 Vidéos
                  </button>
                  <button
                    onClick={() => { setSelected(formation); setModal('edit'); }}
                    className="flex-1 text-xs text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 py-2 rounded-xl transition-colors"
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => setDeleteTarget(formation)}
                    className="text-xs text-red-400 hover:text-red-300 border border-red-900 hover:border-red-700 px-3 py-2 rounded-xl transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {(modal === 'create' || modal === 'edit') && (
        <FormationModal
          formation={modal === 'edit' ? selected : null}
          onClose={() => { setModal(null); setSelected(null); }}
        />
      )}

      {modal === 'videos' && selected && (
        <VideosModal
          formation={selected}
          onClose={() => { setModal(null); setSelected(null); }}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center">
              <p className="text-3xl mb-3">🗑️</p>
              <h3 className="text-white font-bold">Archiver la formation ?</h3>
              <p className="text-gray-400 text-sm mt-2">
                <span className="text-white font-medium">{deleteTarget.title}</span> sera dépubliée.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800 text-sm">Annuler</button>
              <button
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-semibold hover:bg-red-700 text-sm disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Archivage...' : 'Archiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}