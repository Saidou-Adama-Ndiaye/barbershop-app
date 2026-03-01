// .\.\apps\web\app\admin\utilisateurs\page.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/lib/store/auth.store';
import Badge from '@/components/ui/Badge';

interface User {
  id:        string;
  email:     string;
  firstName: string;
  lastName:  string;
  role:      string;
  isActive:  boolean;
  createdAt: string;
}

interface UsersResponse {
  data:  User[];
  total: number;
  page:  number;
}

const roleColors: Record<string, 'green' | 'blue' | 'orange' | 'red' | 'gray'> = {
  client:      'gray',
  coiffeur:    'blue',
  admin:       'orange',
  super_admin: 'red',
};

const ROLES = ['client', 'coiffeur', 'admin', 'super_admin'];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuthStore();
  const queryClient            = useQueryClient();
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage]       = useState(1);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [newRole, setNewRole]  = useState('');
  const isSuperAdmin           = currentUser?.role === 'super_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter, page],
    queryFn:  async () => {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search)     params.search = search;
      if (roleFilter) params.role   = roleFilter;
      const { data } = await api.get<UsersResponse>('/admin/users', { params });
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, role, isActive }: {
      id: string; role?: string; isActive?: boolean;
    }) => {
      await api.patch(`/admin/users/${id}`, { role, isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setEditUser(null);
    },
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  return (
    <div className="space-y-6 text-white">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <p className="text-gray-400 mt-1">
          {data?.total ?? 0} utilisateur(s) au total
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" value={search} placeholder="Rechercher email / nom..."
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-gray-500 flex-1 min-w-48"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white outline-none"
        >
          <option value="">Tous les rôles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Tableau */}
      {isLoading ? (
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
                {['Utilisateur', 'Rôle', 'Statut', 'Inscrit le', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-6 py-4 text-gray-400 text-sm font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.data.map((user) => (
                <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={roleColors[user.role] ?? 'gray'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      user.isActive
                        ? 'bg-green-900/50 text-green-300'
                        : 'bg-gray-800 text-gray-400'
                    }`}>
                      {user.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(user.createdAt).toLocaleDateString('fr-SN')}
                  </td>
                  <td className="px-6 py-4">
                    {isSuperAdmin && user.id !== currentUser?.id && (
                      <button
                        onClick={() => {
                          setEditUser(user);
                          setNewRole(user.role);
                        }}
                        className="text-sm text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        ✏️ Modifier
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data?.data.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Aucun utilisateur trouvé
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
          <span className="px-4 py-2 text-sm text-gray-400">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-700 rounded-lg text-sm text-gray-300 disabled:opacity-40 hover:bg-gray-800"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* Modal modification utilisateur */}
      {editUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-5">
            <h3 className="text-lg font-bold text-white">
              Modifier — {editUser.firstName} {editUser.lastName}
            </h3>
            <p className="text-sm text-gray-400">{editUser.email}</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-2">Rôle</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white outline-none"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-800 rounded-xl">
                <span className="text-sm text-gray-300">Compte actif</span>
                <button
                  onClick={() =>
                    updateMutation.mutate({
                      id:       editUser.id,
                      isActive: !editUser.isActive,
                    })
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    editUser.isActive ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    editUser.isActive ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 border border-gray-700 text-gray-300 py-2.5 rounded-xl hover:bg-gray-800"
              >
                Annuler
              </button>
              <button
                onClick={() => updateMutation.mutate({ id: editUser.id, role: newRole })}
                disabled={updateMutation.isPending || newRole === editUser.role}
                className="flex-1 bg-white text-gray-900 py-2.5 rounded-xl font-semibold hover:bg-gray-100 disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Mise à jour...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}