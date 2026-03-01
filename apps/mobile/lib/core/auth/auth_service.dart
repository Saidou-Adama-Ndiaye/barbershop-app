// .\.\apps\mobile\lib\core\auth\auth_service.dart
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/dio_client.dart';

// ─── Modèle utilisateur ───────────────────────────────
class AuthUser {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;

  const AuthUser({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) => AuthUser(
    id:        json['id']        as String,
    email:     json['email']     as String,
    firstName: json['firstName'] as String,
    lastName:  json['lastName']  as String,
    role:      json['role']      as String,
  );

  String get fullName => '$firstName $lastName';
}

// ─── État d'auth ──────────────────────────────────────
class AuthState {
  final AuthUser? user;
  final bool      isLoading;
  final String?   error;

  const AuthState({
    this.user,
    this.isLoading = false,
    this.error,
  });

  bool get isAuthenticated => user != null;

  AuthState copyWith({
    AuthUser? user,
    bool?     isLoading,
    String?   error,
    bool      clearUser  = false,
    bool      clearError = false,
  }) => AuthState(
    user:      clearUser  ? null : user ?? this.user,
    isLoading: isLoading  ?? this.isLoading,
    error:     clearError ? null : error ?? this.error,
  );
}

// ─── AuthNotifier (Riverpod) ──────────────────────────
class AuthNotifier extends StateNotifier<AuthState> {
  final DioClient _client;

  AuthNotifier(this._client) : super(const AuthState()) {
    _restoreSession();
  }

  // ─── Restaurer la session au démarrage ─────────────
  Future<void> _restoreSession() async {
    state = state.copyWith(isLoading: true);
    final token = await DioClient.getAccessToken();
    if (token != null) {
      try {
        final user = await getProfile();
        state = state.copyWith(user: user, isLoading: false, clearError: true);
      } catch (_) {
        await DioClient.clearTokens();
        state = state.copyWith(isLoading: false, clearUser: true);
      }
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  // ─── Login ─────────────────────────────────────────
  Future<void> login({
    required String email,
    required String password,
  }) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final response = await _client.dio.post(
        '/auth/login',
        data: {'email': email, 'password': password},
      );

      final accessToken  = response.data['accessToken']  as String;
      final refreshToken = response.data['refreshToken'] as String?; // ✅

      await DioClient.saveTokens(
        accessToken:  accessToken,
        refreshToken: refreshToken, // ✅
      );

      final user = AuthUser.fromJson(
        response.data['user'] as Map<String, dynamic>,
      );

      state = state.copyWith(user: user, isLoading: false, clearError: true);
    } on DioException catch (e) {
      final message = e.response?.data?['message'] as String?
          ?? 'Erreur de connexion';
      state = state.copyWith(isLoading: false, error: message);
      rethrow;
    }
  }

  // ─── Logout ────────────────────────────────────────
  Future<void> logout() async {
    try {
      await _client.dio.post('/auth/logout');
    } catch (_) {}
    await DioClient.clearTokens();
    state = const AuthState();
  }

  // ─── Get profile ───────────────────────────────────
  Future<AuthUser> getProfile() async {
    final response = await _client.dio.get('/auth/me');
    return AuthUser.fromJson(response.data as Map<String, dynamic>);
  }
}

// ─── Providers Riverpod ───────────────────────────────
final dioClientProvider = Provider<DioClient>((ref) => DioClient());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final client = ref.watch(dioClientProvider);
  return AuthNotifier(client);
});