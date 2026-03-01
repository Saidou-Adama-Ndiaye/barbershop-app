// .\.\apps\mobile\lib\main.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router/app_router.dart';

void main() {
  runApp(
    const ProviderScope(
      child: BarberShopApp(),
    ),
  );
}

class BarberShopApp extends ConsumerWidget {
  const BarberShopApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title:            'BarberShop',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor:   const Color(0xFF111827),
          brightness:  Brightness.light,
        ),
        useMaterial3:     true,
        fontFamily:       'Roboto',
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF111827),
          foregroundColor: Colors.white,
          elevation:       0,
          centerTitle:     true,
        ),
      ),
      routerConfig: router,
    );
  }
}