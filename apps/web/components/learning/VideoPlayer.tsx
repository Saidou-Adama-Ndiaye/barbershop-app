'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import api from '@/lib/api';

interface VideoPlayerProps {
  videoId: string;
  formationId: string;
  title: string;
  durationSec: number;
  onComplete?: () => void;
}

export default function VideoPlayer({
  videoId,
  formationId,
  title,
  durationSec,
  onComplete,
}: VideoPlayerProps) {
  const videoRef        = useRef<HTMLVideoElement>(null);
  const [signedUrl, setSignedUrl]       = useState<string | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [progress, setProgress]         = useState(0);
  const [isCompleted, setIsCompleted]   = useState(false);
  const progressSavedRef                = useRef(0);
  const urlExpiryRef                    = useRef<NodeJS.Timeout | null>(null);

  // ─── Charger URL signée depuis l'API ─────────────────
  const loadSignedUrl = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get<{ url: string; expiresIn: number }>(
        `/formations/${formationId}/videos/${videoId}/stream`,
      );
      setSignedUrl(data.url);

      // Recharger l'URL avant expiration (30s avant)
      if (urlExpiryRef.current) clearTimeout(urlExpiryRef.current);
      urlExpiryRef.current = setTimeout(() => {
        loadSignedUrl();
      }, (data.expiresIn - 30) * 1000);

    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string }; status?: number } };
      if (axiosErr.response?.status === 403) {
        setError('Vous devez acheter cette formation pour accéder à cette vidéo.');
      } else {
        setError('Impossible de charger la vidéo. Réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [videoId, formationId]);

  useEffect(() => {
    loadSignedUrl();
    return () => {
      if (urlExpiryRef.current) clearTimeout(urlExpiryRef.current);
    };
  }, [loadSignedUrl]);

  // ─── Sauvegarder la progression ──────────────────────
  const saveProgress = useCallback(async (watchedSec: number) => {
    // Sauvegarder seulement si on a avancé d'au moins 5 secondes
    if (watchedSec - progressSavedRef.current < 5) return;
    progressSavedRef.current = watchedSec;

    try {
      await api.post(`/videos/${videoId}/progress`, { watchedSec });
    } catch {
      // Silencieux — ne pas interrompre la lecture
    }
  }, [videoId]);

  // ─── Events vidéo ─────────────────────────────────────
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const watched = Math.floor(video.currentTime);
    const pct     = durationSec > 0 ? (watched / durationSec) * 100 : 0;
    setProgress(Math.min(pct, 100));

    // Sauvegarder toutes les 10 secondes
    if (watched % 10 === 0 && watched > 0) {
      saveProgress(watched);
    }

    // Marquer complété à 90%
    if (pct >= 90 && !isCompleted) {
      setIsCompleted(true);
      saveProgress(watched);
      onComplete?.();
    }
  };

  const handleEnded = () => {
    if (videoRef.current) {
      saveProgress(Math.floor(videoRef.current.duration));
    }
  };

  // ─── Rendu ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="aspect-video bg-gray-900 rounded-2xl flex items-center justify-center">
        <div className="text-center text-white space-y-3">
          <span className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin block mx-auto" />
          <p className="text-sm text-gray-400">Chargement de la vidéo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-video bg-gray-900 rounded-2xl flex items-center justify-center">
        <div className="text-center text-white space-y-4 max-w-sm px-6">
          <span className="text-5xl block">🔒</span>
          <p className="text-sm text-gray-300">{error}</p>
          <button
            onClick={loadSignedUrl}
            className="text-xs text-gray-400 underline hover:text-white"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Titre */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {isCompleted && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
            ✓ Complété
          </span>
        )}
      </div>

      {/* Lecteur */}
      <div className="aspect-video bg-black rounded-2xl overflow-hidden">
        {signedUrl && (
          <video
            ref={videoRef}
            src={signedUrl}
            controls
            className="w-full h-full"
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleEnded}
            controlsList="nodownload" // empêche le téléchargement
            onContextMenu={(e) => e.preventDefault()} // désactive clic droit
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        )}
      </div>

      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progression</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}