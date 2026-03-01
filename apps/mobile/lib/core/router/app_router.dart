import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/auth_service.dart';
import '../../features/auth/login_screen.dart';
import '../../features/shop/packs_screen.dart';

// ─── Provider GoRouter ────────────────────────────────
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/packs',
    redirect: (context, state) {
      final isAuthenticated = authState.isAuthenticated;
      final isLoading       = authState.isLoading;
      final isLoginRoute    = state.matchedLocation == '/login';

      // Pendant le chargement → ne pas rediriger
      if (isLoading) return null;

      // Non authentifié → /login
      if (!isAuthenticated && !isLoginRoute) return '/login';

      // Déjà authentifié sur /login → /packs
      if (isAuthenticated && isLoginRoute) return '/packs';

      return null;
    },
    routes: [
      GoRoute(
        path:    '/login',
        name:    'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path:    '/packs',
        name:    'packs',
        builder: (context, state) => const PacksScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text('Page introuvable', style: TextStyle(fontSize: 18)),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () => context.go('/packs'),
              child: const Text('Retour à l\'accueil'),
            ),
          ],
        ),
      ),
    ),
  );
});