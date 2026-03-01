// .\.\apps\mobile\lib\core\api\dio_client.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class DioClient {
  static const String _baseUrl = 'http://192.168.1.7:3000/api/v1';
  // 10.0.2.2 = localhost depuis émulateur Android
  // Pour téléphone physique : remplacer par l'IP locale ex: 192.168.1.x

  static const FlutterSecureStorage _storage = FlutterSecureStorage();

  late final Dio dio;
  late final Dio _refreshDio; // Dio séparé pour le refresh (évite boucle infinie)

  static final DioClient _instance = DioClient._internal();
  factory DioClient() => _instance;

  DioClient._internal() {
    // ─── Dio principal ───────────────────────────────
    dio = Dio(BaseOptions(
      baseUrl:        _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    // ─── Dio séparé pour refresh (pas d'intercepteur) ─
    _refreshDio = Dio(BaseOptions(
      baseUrl:        _baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    // ─── Intercepteur JWT ────────────────────────────
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: 'access_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (error, handler) async {
          // 401 → tenter un refresh
          if (error.response?.statusCode == 401) {
            final refreshed = await _tryRefreshToken();
            if (refreshed) {
              // Rejouer la requête originale avec le nouveau token
              final token = await _storage.read(key: 'access_token');
              final opts  = error.requestOptions;
              opts.headers['Authorization'] = 'Bearer $token';

              try {
                final response = await dio.fetch(opts);
                return handler.resolve(response);
              } catch (e) {
                return handler.next(error);
              }
            } else {
              // Refresh échoué → déconnecter
              await _clearTokens();
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  // ─── Tenter refresh token ─────────────────────────
  Future<bool> _tryRefreshToken() async {
    try {
      final refreshToken = await _storage.read(key: 'refresh_token');
      if (refreshToken == null) return false;

      final response = await _refreshDio.post(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );
      final newAccessToken  = response.data['accessToken']  as String?;
      final newRefreshToken = response.data['refreshToken'] as String?;

      if (newAccessToken != null) {
        await _storage.write(key: 'access_token', value: newAccessToken);
        if (newRefreshToken != null) {
          await _storage.write(key: 'refresh_token', value: newRefreshToken);
        }
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  // ─── Stocker les tokens ───────────────────────────
  static Future<void> saveTokens({
    required String accessToken,
    String? refreshToken,
  }) async {
    await _storage.write(key: 'access_token', value: accessToken);
    if (refreshToken != null) {
      await _storage.write(key: 'refresh_token', value: refreshToken);
    }
  }

  // ─── Supprimer les tokens ─────────────────────────
  static Future<void> _clearTokens() async {
    await _storage.delete(key: 'access_token');
  }

  static Future<void> clearTokens() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }
  // ─── Lire le token ────────────────────────────────
  static Future<String?> getAccessToken() async {
    return _storage.read(key: 'access_token');
  }
}