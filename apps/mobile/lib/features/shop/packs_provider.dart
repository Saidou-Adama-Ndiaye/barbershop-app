import 'package:barbershop_mobile/core/auth/auth_service.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/dio_client.dart';
import 'models/pack.dart';

// ─── State ────────────────────────────────────────────
class PacksState {
  final List<Pack> packs;
  final bool       isLoading;
  final String?    error;
  final int        total;

  const PacksState({
    this.packs     = const [],
    this.isLoading = false,
    this.error,
    this.total     = 0,
  });

  PacksState copyWith({
    List<Pack>? packs,
    bool?       isLoading,
    String?     error,
    int?        total,
    bool        clearError = false,
  }) => PacksState(
    packs:     packs     ?? this.packs,
    isLoading: isLoading ?? this.isLoading,
    error:     clearError ? null : error ?? this.error,
    total:     total     ?? this.total,
  );
}

// ─── Notifier ─────────────────────────────────────────
class PacksNotifier extends StateNotifier<PacksState> {
  final DioClient _client;

  PacksNotifier(this._client) : super(const PacksState()) {
    fetchPacks();
  }

  Future<void> fetchPacks({int page = 1}) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _client.dio.get(
        '/packs',
        queryParameters: {'page': page, 'limit': 10},
      );

      final data  = response.data as Map<String, dynamic>;
      final items = (data['data'] as List<dynamic>)
          .map((e) => Pack.fromJson(e as Map<String, dynamic>))
          .toList();

      state = state.copyWith(
        packs:     items,
        total:     (data['total'] as num?)?.toInt() ?? items.length,
        isLoading: false,
      );
} catch (e) {
  state = state.copyWith(
    isLoading: false,
    error: e.toString(), // ✅ affiche l'erreur réelle
  );
}
  }
}

// ─── Provider ─────────────────────────────────────────
final packsProvider = StateNotifierProvider<PacksNotifier, PacksState>((ref) {
  final client = ref.watch(dioClientProvider);
  return PacksNotifier(client);
});