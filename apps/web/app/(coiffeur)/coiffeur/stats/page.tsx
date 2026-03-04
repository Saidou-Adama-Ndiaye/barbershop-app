// apps\web\app\(coiffeur)\coiffeur\stats\page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { getCoiffeurStats, CoiffeurStats } from '@/lib/coiffeur/api';
import { BOOKING_STATUS_LABELS, BookingStatus } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────
function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-SN').format(n) + ' F CFA';
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1).toLocaleDateString('fr-SN', {
    month: 'short', year: '2-digit',
  });
}

// ─── Couleurs graphiques ──────────────────────────────────
const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const STATUS_PIE_COLORS: Partial<Record<BookingStatus, string>> = {
  [BookingStatus.COMPLETED]:   '#10b981',
  [BookingStatus.CONFIRMED]:   '#3b82f6',
  [BookingStatus.IN_PROGRESS]: '#f59e0b',
  [BookingStatus.CANCELLED]:   '#ef4444',
  [BookingStatus.NO_SHOW]:     '#f97316',
  [BookingStatus.PENDING]:     '#6b7280',
  [BookingStatus.DEPOSIT_PAID]:'#8b5cf6',
};

// ─── Tooltip personnalisé ─────────────────────────────────
function CustomTooltip({ active, payload, label }: {
  active?:  boolean;
  payload?: { value: number; name: string }[];
  label?:   string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-sm">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-white font-medium">
          {p.name === 'revenue'
            ? formatCurrency(p.value)
            : `${p.value} RDV`}
        </p>
      ))}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────
export default function StatsPage() {
  const [stats,   setStats]   = useState<CoiffeurStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCoiffeurStats();
      setStats(data);
    } catch {
      setError('Impossible de charger les statistiques');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-8 w-48 bg-gray-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-gray-800 rounded-2xl animate-pulse" />
        <div className="h-64 bg-gray-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <p className="text-white font-medium mb-2">Erreur de chargement</p>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button
          onClick={load}
          className="bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-medium"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Préparer les données graphiques
  const chartData = stats.monthly.map((m) => ({
    month:   formatMonth(m.month),
    revenue: m.revenue,
    count:   m.count,
  }));

  const totalRevenue = stats.monthly.reduce((sum, m) => sum + m.revenue, 0);
  const totalRdv     = stats.monthly.reduce((sum, m) => sum + m.count, 0);

  // Données camembert statuts
  const pieData = Object.entries(stats.byStatus)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name:  BOOKING_STATUS_LABELS[status as BookingStatus] ?? status,
      value: count,
      color: STATUS_PIE_COLORS[status as BookingStatus] ?? '#6b7280',
    }));

  return (
    <div className="max-w-5xl space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Statistiques</h1>
          <p className="text-gray-400 text-sm mt-1">6 derniers mois</p>
        </div>
        <button
          onClick={load}
          className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-gray-800"
        >
          🔄 Actualiser
        </button>
      </div>

      {/* ─── KPI cards ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <p className="text-gray-400 text-xs mb-2">CA total (6 mois)</p>
          <p className="text-white text-xl font-bold">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <p className="text-gray-400 text-xs mb-2">RDV terminés (6 mois)</p>
          <p className="text-white text-xl font-bold">{totalRdv}</p>
        </div>
        <div className={`border rounded-2xl p-5 ${
          stats.noShowRate > 15
            ? 'bg-red-900/20 border-red-700/30'
            : 'bg-gray-800 border-gray-700'
        }`}>
          <p className="text-gray-400 text-xs mb-2">Taux no-show</p>
          <p className={`text-xl font-bold ${
            stats.noShowRate > 15 ? 'text-red-400' : 'text-white'
          }`}>
            {stats.noShowRate}%
          </p>
          {stats.noShowRate > 15 && (
            <p className="text-red-400 text-xs mt-1">⚠️ Élevé</p>
          )}
        </div>
      </div>

      {/* ─── Graphique CA mensuel ────────────────────── */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-5">CA mensuel (F CFA)</h2>
        {chartData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">Pas encore de données</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9ca3af', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => new Intl.NumberFormat('fr-SN', { notation: 'compact' }).format(v)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="revenue"
                name="revenue"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ─── Graphique nb RDV + répartition statuts ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Line chart nb RDV */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <h2 className="text-white font-bold mb-5">RDV terminés / mois</h2>
          {chartData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">Pas encore de données</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pie chart statuts */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <h2 className="text-white font-bold mb-5">Répartition par statut</h2>
          {pieData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">Pas encore de données</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: 12,
                  }}
                  labelStyle={{ color: '#9ca3af' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── Top clients ─────────────────────────────── */}
      {stats.topClients.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5">
          <h2 className="text-white font-bold mb-4">Top 5 clients</h2>
          <div className="space-y-3">
            {stats.topClients.map((client, idx) => (
              <div
                key={client.clientId}
                className="flex items-center gap-3"
              >
                <span className="text-gray-500 text-sm w-5 text-right">{idx + 1}</span>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {client.firstName[0]}{client.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {client.firstName} {client.lastName}
                  </p>
                  <p className="text-gray-500 text-xs">{client.email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-white text-sm font-bold">{client.totalRdv} RDV</p>
                  {client.isRecurrent && (
                    <p className="text-amber-400 text-xs">⭐ récurrent</p>
                  )}
                </div>
                {/* Barre de progression relative */}
                <div className="w-20 bg-gray-700 rounded-full h-1.5 shrink-0">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(100, (client.totalRdv / (stats.topClients[0]?.totalRdv || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}