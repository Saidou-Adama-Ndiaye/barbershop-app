// .\.\apps\mobile\lib\features\auth\login_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/auth/auth_service.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey       = GlobalKey<FormState>();
  final _emailCtrl     = TextEditingController();
  final _passwordCtrl  = TextEditingController();
  bool  _obscurePass   = true;
  bool  _isSubmitting  = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
  if (!_formKey.currentState!.validate()) return;

  setState(() {
    _isSubmitting = true;
    _errorMessage = null;
  });

  try {
    await ref.read(authProvider.notifier).login(
      email:    _emailCtrl.text.trim(),
      password: _passwordCtrl.text,
    );
    // GoRouter redirige automatiquement, pas besoin de faire quoi que ce soit
  } catch (_) {
    // ✅ On vérifie que le widget est encore monté avant d'utiliser ref/setState
    if (!mounted) return;

    final error = ref.read(authProvider).error;
    setState(() {
      _errorMessage = error ?? 'Identifiants incorrects';
      _isSubmitting = false;
    });
  }
}

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9FAFB),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 48),

              // ─── Logo ───────────────────────────────
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 80, height: 80,
                      decoration: BoxDecoration(
                        color: const Color(0xFF111827),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Center(
                        child: Text('✂️', style: TextStyle(fontSize: 36)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'BarberShop',
                      style: TextStyle(
                        fontSize: 28, fontWeight: FontWeight.bold,
                        color: Color(0xFF111827),
                      ),
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Connectez-vous à votre compte',
                      style: TextStyle(fontSize: 14, color: Color(0xFF6B7280)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 40),

              // ─── Formulaire ─────────────────────────
              Form(
                key: _formKey,
                child: Column(
                  children: [

                    // Email
                    TextFormField(
                      controller:   _emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      decoration: _inputDecoration(
                        label: 'Email',
                        hint:  'admin@barbershop.local',
                        icon:  Icons.email_outlined,
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Email requis';
                        if (!val.contains('@')) return 'Email invalide';
                        return null;
                      },
                    ),

                    const SizedBox(height: 16),

                    // Mot de passe
                    TextFormField(
                      controller:    _passwordCtrl,
                      obscureText:   _obscurePass,
                      decoration: _inputDecoration(
                        label:  'Mot de passe',
                        hint:   '••••••••',
                        icon:   Icons.lock_outline,
                        suffix: IconButton(
                          icon: Icon(
                            _obscurePass
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                            color: const Color(0xFF6B7280),
                          ),
                          onPressed: () =>
                            setState(() => _obscurePass = !_obscurePass),
                        ),
                      ),
                      validator: (val) {
                        if (val == null || val.isEmpty) return 'Mot de passe requis';
                        if (val.length < 6) return 'Minimum 6 caractères';
                        return null;
                      },
                    ),

                    const SizedBox(height: 24),

                    // Message d'erreur
                    if (_errorMessage != null)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        margin:  const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color:        const Color(0xFFFEF2F2),
                          border:       Border.all(color: const Color(0xFFFCA5A5)),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: const TextStyle(
                            color: Color(0xFFDC2626), fontSize: 13,
                          ),
                        ),
                      ),

                    // Bouton connexion
                    SizedBox(
                      width:  double.infinity,
                      height: 52,
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _handleLogin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF111827),
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: const Color(0xFF374151),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        child: _isSubmitting
                          ? const SizedBox(
                              width: 20, height: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white, strokeWidth: 2,
                              ),
                            )
                          : const Text(
                              'Se connecter',
                              style: TextStyle(
                                fontSize: 16, fontWeight: FontWeight.w600,
                              ),
                            ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 32),

              // ─── Compte de test ──────────────────────
              Container(
                padding:     const EdgeInsets.all(16),
                decoration:  BoxDecoration(
                  color:        const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      '🧪 Compte de test',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF374151),
                      ),
                    ),
                    const SizedBox(height: 8),
                    _testCredential('Email', 'admin@barbershop.local'),
                    _testCredential('Mot de passe', 'Admin@2025!'),
                    const SizedBox(height: 8),
                    GestureDetector(
                      onTap: () {
                        _emailCtrl.text    = 'admin@barbershop.local';
                        _passwordCtrl.text = 'Admin@2025!';
                      },
                      child: const Text(
                        'Remplir automatiquement →',
                        style: TextStyle(
                          color: Color(0xFF2563EB),
                          fontSize: 13,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({
    required String  label,
    required String  hint,
    required IconData icon,
    Widget?  suffix,
  }) => InputDecoration(
    labelText:   label,
    hintText:    hint,
    prefixIcon:  Icon(icon, color: const Color(0xFF6B7280)),
    suffixIcon:  suffix,
    filled:      true,
    fillColor:   Colors.white,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide:   const BorderSide(color: Color(0xFFE5E7EB)),
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide:   const BorderSide(color: Color(0xFFE5E7EB)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide:   const BorderSide(color: Color(0xFF111827), width: 2),
    ),
    errorBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide:   const BorderSide(color: Color(0xFFEF4444)),
    ),
  );

  Widget _testCredential(String label, String value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 2),
    child: RichText(
      text: TextSpan(
        style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
        children: [
          TextSpan(text: '$label : '),
          TextSpan(
            text:  value,
            style: const TextStyle(
              fontWeight: FontWeight.bold, color: Color(0xFF374151),
            ),
          ),
        ],
      ),
    ),
  );
}