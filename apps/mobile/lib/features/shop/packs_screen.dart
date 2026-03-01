import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_service.dart';
import 'packs_provider.dart';
import 'widgets/pack_card.dart';

class PacksScreen extends ConsumerWidget {
  const PacksScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final packsState = ref.watch(packsProvider);
    final authState  = ref.watch(authProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),

      // ─── AppBar ─────────────────────────────────────
      appBar: AppBar(
        backgroundColor: const Color(0xFF111827),
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('✂️ ', style: TextStyle(fontSize: 20)),
            Text(
              'BarberShop',
              style: TextStyle(
                color:      Colors.white,
                fontSize:   20,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          // Menu utilisateur
          PopupMenuButton<String>(
            icon:  const Icon(Icons.person_outline, color: Colors.white),
            onSelected: (value) async {
              if (value == 'logout') {
                await ref.read(authProvider.notifier).logout();
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      authState.user?.fullName ?? '',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize:   14,
                      ),
                    ),
                    Text(
                      authState.user?.email ?? '',
                      style: const TextStyle(
                        color:    Color(0xFF6B7280),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18, color: Color(0xFFEF4444)),
                    SizedBox(width: 8),
                    Text(
                      'Déconnexion',
                      style: TextStyle(color: Color(0xFFEF4444)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),

      // ─── Body ────────────────────────────────────────
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [

          // Header section
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Bonjour, ${authState.user?.firstName ?? 'vous'} 👋',
                  style: const TextStyle(
                    fontSize:   22,
                    fontWeight: FontWeight.bold,
                    color:      Color(0xFF111827),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${packsState.total} pack${packsState.total > 1 ? 's' : ''} disponible${packsState.total > 1 ? 's' : ''}',
                  style: const TextStyle(
                    fontSize: 14,
                    color:    Color(0xFF6B7280),
                  ),
                ),
              ],
            ),
          ),

          // ─── Contenu principal ───────────────────────
          Expanded(
            child: _buildContent(context, ref, packsState),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, WidgetRef ref, PacksState state) {

    // Chargement initial
    if (state.isLoading && state.packs.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(
              color: Color(0xFF111827),
              strokeWidth: 3,
            ),
            SizedBox(height: 16),
            Text(
              'Chargement des packs...',
              style: TextStyle(color: Color(0xFF6B7280), fontSize: 14),
            ),
          ],
        ),
      );
    }

    // Erreur
    if (state.error != null && state.packs.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text('😔', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 16),
              Text(
                state.error!,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF6B7280), fontSize: 14,
                ),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => ref.read(packsProvider.notifier).fetchPacks(),
                icon:  const Icon(Icons.refresh),
                label: const Text('Réessayer'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF111827),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    // Liste vide
    if (state.packs.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('📦', style: TextStyle(fontSize: 48)),
            SizedBox(height: 16),
            Text(
              'Aucun pack disponible',
              style: TextStyle(
                fontSize: 16, fontWeight: FontWeight.w600,
                color: Color(0xFF374151),
              ),
            ),
          ],
        ),
      );
    }

    // Liste avec pull-to-refresh
    return RefreshIndicator(
      color:         const Color(0xFF111827),
      onRefresh:     () => ref.read(packsProvider.notifier).fetchPacks(),
      child: ListView.builder(
        padding:     const EdgeInsets.fromLTRB(16, 8, 16, 24),
        itemCount:   state.packs.length + (state.isLoading ? 1 : 0),
        itemBuilder: (context, index) {

          // Loader en bas de liste
          if (index == state.packs.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child:   Center(
                child: CircularProgressIndicator(
                  color:       Color(0xFF111827),
                  strokeWidth: 2,
                ),
              ),
            );
          }

          final pack = state.packs[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: PackCard(
              pack:  pack,
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Pack : ${pack.name}'),
                    duration: const Duration(seconds: 1),
                    backgroundColor: const Color(0xFF111827),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}