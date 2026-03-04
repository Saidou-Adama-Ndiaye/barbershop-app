// apps\web\app\(coiffeur)\coiffeur\disponibilites\page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getAvailability, createAvailability, updateAvailability,
  deleteAvailability, StaffAvailability,
} from '@/lib/coiffeur/api';
import { DAY_NAMES } from '@/lib/types';

// ─── Plage horaire par défaut par jour ────────────────────
const DEFAULT_HOURS = { startTime: '09:00', endTime: '18:00' };

// ─── Composant ligne jour ─────────────────────────────────
function DayRow({
  dayIndex,
  availability,
  onSave,
  onDelete,
  onToggle,
}: {
  dayIndex:     number;
  availability: StaffAvailability | undefined;
  onSave:       (data: { dayOfWeek: number; startTime: string; endTime: string }) => Promise<void>;
  onDelete:     (id: string) => Promise<void>;
  onToggle:     (id: string, isActive: boolean) => Promise<void>;
}) {
  const [start,   setStart]   = useState(availability?.startTime?.slice(0, 5) ?? DEFAULT_HOURS.startTime);
  const [end,     setEnd]     = useState(availability?.endTime?.slice(0, 5)   ?? DEFAULT_HOURS.endTime);
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Synchroniser si la disponibilité change après chargement
  useEffect(() => {
    if (availability) {
      setStart(availability.startTime.slice(0, 5));
      setEnd(availability.endTime.slice(0, 5));
    }
  }, [availability]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave({ dayOfWeek: dayIndex, startTime: start, endTime: end });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!availability) return;
    setLoading(true);
    try {
      await onToggle(availability.id, !availability.isActive);
    } finally {
      setLoading(false);
    }
  };

  const isWeekend = dayIndex === 0 || dayIndex === 6;

  return (
    <div className={`bg-gray-800 border rounded-xl p-4 transition-colors ${
      availability?.isActive
        ? 'border-gray-600'
        : 'border-gray-700 opacity-60'
    }`}>
      <div className="flex items-center gap-4">

        {/* Jour */}
        <div className="w-28 shrink-0">
          <p className="text-white font-medium text-sm">{DAY_NAMES[dayIndex]}</p>
          {isWeekend && (
            <p className="text-gray-500 text-xs">Week-end</p>
          )}
        </div>

        {/* Toggle actif */}
        <button
          onClick={handleToggle}
          disabled={loading || !availability}
          title={availability ? 'Activer/désactiver' : 'Enregistrez d\'abord'}
          className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
            availability?.isActive
              ? 'bg-green-500'
              : 'bg-gray-600'
          } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            availability?.isActive ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </button>

        {/* Heures */}
        <div className="flex items-center gap-2 flex-1">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-gray-500 w-28"
          />
          <span className="text-gray-500 text-sm">→</span>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-gray-500 w-28"
          />
        </div>

        {/* Durée calculée */}
        <div className="w-20 text-center shrink-0">
          {(() => {
            const [sh, sm] = start.split(':').map(Number);
            const [eh, em] = end.split(':').map(Number);
            const total    = (eh * 60 + em) - (sh * 60 + sm);
            if (total <= 0) return null;
            const h = Math.floor(total / 60);
            const m = total % 60;
            return (
              <p className="text-gray-400 text-xs">
                {h > 0 ? `${h}h` : ''}{m > 0 ? `${m}min` : ''}
              </p>
            );
          })()}
        </div>

        {/* Boutons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={loading}
            className="text-xs bg-white text-gray-900 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saved ? '✅' : loading ? '...' : '💾'}
            {saved ? 'Sauvegardé' : 'Sauvegarder'}
          </button>
          {availability && (
            <button
              onClick={() => onDelete(availability.id)}
              disabled={loading}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function DisponibilitesPage() {
  const [availabilities, setAvailabilities] = useState<StaffAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAvailability();
      setAvailabilities(data);
    } catch {
      setError('Impossible de charger les disponibilités');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (data: {
    dayOfWeek: number; startTime: string; endTime: string;
  }) => {
    await createAvailability({ ...data, isActive: true });
    await load();
  };

  const handleDelete = async (id: string) => {
    await deleteAvailability(id);
    await load();
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateAvailability(id, { isActive });
    await load();
  };

  // Mapper les disponibilités par jour
  const byDay = (dayIndex: number) =>
    availabilities.find((a) => a.dayOfWeek === dayIndex);

  // Jours dans l'ordre Lun → Sam → Dim
  const orderedDays = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Disponibilités</h1>
          <p className="text-gray-400 text-sm mt-1">
            Définissez vos horaires de travail par jour de la semaine
          </p>
        </div>
        <button
          onClick={load}
          className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-gray-800"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-3 mb-6">
        <p className="text-blue-300 text-xs">
          ℹ️ Ces horaires définissent quand les clients peuvent vous réserver.
          Cliquez <strong>Sauvegarder</strong> après chaque modification.
          Le toggle active/désactive un jour sans supprimer les horaires.
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-16 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-gray-400">{error}</p>
          <button onClick={load} className="text-white text-sm mt-3 underline">
            Réessayer
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orderedDays.map((dayIndex) => (
            <DayRow
              key={dayIndex}
              dayIndex={dayIndex}
              availability={byDay(dayIndex)}
              onSave={handleSave}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}

      {/* Résumé */}
      {!loading && !error && availabilities.length > 0 && (
        <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-gray-400 text-xs font-medium mb-2">RÉSUMÉ</p>
          <div className="flex flex-wrap gap-2">
            {availabilities
              .filter((a) => a.isActive)
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((a) => (
                <span key={a.id} className="bg-gray-700 text-white text-xs px-2.5 py-1 rounded-full">
                  {DAY_NAMES[a.dayOfWeek]} {a.startTime.slice(0, 5)}–{a.endTime.slice(0, 5)}
                </span>
              ))}
          </div>
          {availabilities.filter((a) => a.isActive).length === 0 && (
            <p className="text-gray-500 text-xs">Aucun jour actif</p>
          )}
        </div>
      )}
    </div>
  );
}