// .\.\apps\web\app\admin\analytics\page.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AdminStats {
  totalRevenue:   number;
  totalOrders:    number;
  totalUsers:     number;
  monthlyRevenue: { month: string; amount: number }[];
  topPacks:       { name: string; totalSold: number; revenue: number }[];
}

const formatXOF = (amount: number) =>
  new Intl.NumberFormat('fr-SN', {
    style: 'currency', currency: 'XOF', minimumFractionDigits: 0,
  }).format(amount);

export default function AdminAnalyticsPage() {
  const [exportLoading, setExportLoading] = useState(false);
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn:  async () => {
      const { data } = await api.get<AdminStats>('/admin/stats');
      return data;
    },
  });

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const params: Record<string, string> = {};
      if (dateFrom) params.from = dateFrom;
      if (dateTo)   params.to   = dateTo;

      const response = await api.get('/admin/export/orders', {
        params,
        responseType: 'blob',
      });

      const url      = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link     = document.createElement('a');
      link.href      = url;
      link.download  = `commandes-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Erreur lors de l\'export');
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-8 text-white">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-400 mt-1">
            Performance des ventes et statistiques
          </p>
        </div>

        {/* Export CSV */}
        <div className="flex items-center gap-3">
          <input
            type="date" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
          />
          <span className="text-gray-500 text-sm">→</span>
          <input
            type="date" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"
          />
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {exportLoading ? '⏳' : '⬇️'} Export CSV
          </button>
        </div>
      </div>

      {/* KPI résumé */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'CA Total',
            value: formatXOF(stats?.totalRevenue ?? 0),
            icon:  '💰',
          },
          {
            label: 'Commandes',
            value: stats?.totalOrders ?? 0,
            icon:  '🛒',
          },
          {
            label: 'Taux moyen/commande',
            value: stats?.totalOrders
              ? formatXOF((stats.totalRevenue ?? 0) / stats.totalOrders)
              : '—',
            icon:  '📊',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">{kpi.label}</p>
                <p className="text-white text-2xl font-bold mt-1">{kpi.value}</p>
              </div>
              <span className="text-3xl">{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-80 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* CA mensuel */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-6">📈 CA Mensuel</h2>
            {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <YAxis
                    stroke="#9CA3AF" tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px', color: '#fff',
                    }}
                    formatter={(value: number | undefined) => [Number(value ?? 0), 'Vendus']}
                  />
                  <Line
                    type="monotone" dataKey="amount"
                    stroke="#FFFFFF" strokeWidth={2}
                    dot={{ fill: '#FFFFFF', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Pas de données de ventes disponibles
              </div>
            )}
          </div>

          {/* Top packs */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-lg font-semibold mb-6">🏆 Top Packs Vendus</h2>
            {stats?.topPacks && stats.topPacks.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.topPacks} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis type="number" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <YAxis
                      type="category" dataKey="name"
                      stroke="#9CA3AF" tick={{ fontSize: 10 }} width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px', color: '#fff',
                      }}
                    />
                    <Bar dataKey="totalSold" fill="#FFFFFF" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Tableau récap */}
                <div className="mt-4 space-y-2">
                  {stats.topPacks.map((pack, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="text-gray-300">
                        <span className="text-gray-500 mr-2">#{i + 1}</span>
                        {pack.name}
                      </span>
                      <div className="flex gap-4 text-right">
                        <span className="text-gray-400">{pack.totalSold} vendus</span>
                        <span className="font-medium text-white">
                          {formatXOF(pack.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Pas encore de ventes
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}