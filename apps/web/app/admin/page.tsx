'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';

interface AdminStats {
  totalUsers:        number;
  totalOrders:       number;
  totalRevenue:      number;
  totalBookings:     number;
  newUsersThisMonth: number;
  monthlyRevenue:    { month: string; amount: number }[];
  topPacks:          { name: string; totalSold: number; revenue: number }[];
}

const formatXOF = (amount: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency', currency: 'XOF', minimumFractionDigits: 0,
  }).format(amount);

// ─── KPI Card ─────────────────────────────────────────────
function KpiCard({
  icon, label, value, sub, color = 'bg-white',
}: {
  icon: string; label: string; value: string | number;
  sub?: string; color?: string;
}) {
  return (
    <div className={`${color} rounded-2xl p-6 border border-gray-800`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-white text-3xl font-bold mt-1">{value}</p>
          {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn:  async () => {
      const { data } = await api.get<AdminStats>('/admin/stats');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-800 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300">
        Impossible de charger les statistiques.
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Vue d&apos;ensemble du {new Date().toLocaleDateString('fr-SN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon="👥" label="Utilisateurs"
          value={stats?.totalUsers ?? 0}
          sub={`+${stats?.newUsersThisMonth ?? 0} ce mois`}
          color="bg-gray-900"
        />
        <KpiCard
          icon="🛒" label="Commandes"
          value={stats?.totalOrders ?? 0}
          color="bg-gray-900"
        />
        <KpiCard
          icon="💰" label="Chiffre d'affaires"
          value={formatXOF(stats?.totalRevenue ?? 0)}
          color="bg-gray-900"
        />
        <KpiCard
          icon="📅" label="Réservations"
          value={stats?.totalBookings ?? 0}
          color="bg-gray-900"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* CA Mensuel */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">
            📈 CA Mensuel (12 mois)
          </h2>
          {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="month"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border:          '1px solid #374151',
                    borderRadius:    '8px',
                    color:           '#fff',
                  }}
                    formatter={(value: number | undefined) => [formatXOF(Number(value ?? 0)), 'CA']}
                />
                <Line
                  type="monotone" dataKey="amount"
                  stroke="#FFFFFF" strokeWidth={2}
                  dot={{ fill: '#FFFFFF', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Pas encore de données de ventes
            </div>
          )}
        </div>

        {/* Top Packs */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">
            🏆 Top 5 Packs Vendus
          </h2>
          {stats?.topPacks && stats.topPacks.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.topPacks} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category" dataKey="name"
                  stroke="#9CA3AF" tick={{ fontSize: 11 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border:          '1px solid #374151',
                    borderRadius:    '8px',
                    color:           '#fff',
                  }}
                    formatter={(value: number | undefined) => [Number(value ?? 0), 'Vendus']}
                />
                <Bar dataKey="totalSold" fill="#FFFFFF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Pas encore de ventes
            </div>
          )}
        </div>
      </div>
    </div>
  );
}