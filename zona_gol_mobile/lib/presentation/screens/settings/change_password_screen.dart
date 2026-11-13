import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/di/injection.dart';
import '../../../domain/usecases/change_password_usecase.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';

class _S {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Change Password Screen
class ChangePasswordScreen extends StatefulWidget {
  const ChangePasswordScreen({super.key});

  @override
  State<ChangePasswordScreen> createState() => _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends State<ChangePasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _obscureCurrent = true;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _loading = false;

  bool get _hasMinLength => _passwordController.text.length >= 10 && _passwordController.text.length <= 72;
  bool get _hasUppercase => _passwordController.text.contains(RegExp(r'[A-Z]'));
  bool get _hasLowercase => _passwordController.text.contains(RegExp(r'[a-z]'));
  bool get _hasNumber => _passwordController.text.contains(RegExp(r'[0-9]'));
  bool get _hasSpecial => _passwordController.text.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'));
  bool get _passwordsMatch =>
      _passwordController.text.isNotEmpty &&
      _passwordController.text == _confirmController.text;
  bool get _isValid => _currentController.text.isNotEmpty && _hasMinLength && _hasUppercase && _hasLowercase && _hasNumber && _hasSpecial && _passwordsMatch;

  @override
  void dispose() {
    _currentController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: _S.backgroundDark,
        appBar: AppBar(
          backgroundColor: _S.surfaceDark,
          foregroundColor: _S.textPrimary,
          elevation: 0,
          leading: IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _S.gold.withOpacity(0.2)),
              ),
              child: const Icon(Icons.arrow_back, color: _S.gold, size: 18),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'CAMBIAR CONTRASEÑA',
            style: GoogleFonts.bebasNeue(fontSize: 22, color: _S.textPrimary, letterSpacing: 2),
          ),
          centerTitle: true,
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 16),

                // Current password (the server requires it)
                _buildTextField(
                  controller: _currentController,
                  label: 'Contraseña actual',
                  icon: Icons.key_outlined,
                  obscure: _obscureCurrent,
                  onToggle: () => setState(() => _obscureCurrent = !_obscureCurrent),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 16),

                // Password field
                _buildTextField(
                  controller: _passwordController,
                  label: 'Nueva contraseña',
                  icon: Icons.lock_outline,
                  obscure: _obscurePassword,
                  onToggle: () => setState(() => _obscurePassword = !_obscurePassword),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 16),

                // Validation indicators
                _buildValidationSection(),
                const SizedBox(height: 24),

                // Confirm password field
                _buildTextField(
                  controller: _confirmController,
                  label: 'Confirmar contraseña',
                  icon: Icons.lock,
                  obscure: _obscureConfirm,
                  onToggle: () => setState(() => _obscureConfirm = !_obscureConfirm),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 8),

                if (_confirmController.text.isNotEmpty)
                  Row(
                    children: [
                      Icon(
                        _passwordsMatch ? Icons.check_circle : Icons.cancel,
                        size: 14,
                        color: _passwordsMatch ? _S.success : _S.error,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        _passwordsMatch ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden',
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: _passwordsMatch ? _S.success : _S.error,
                        ),
                      ),
                    ],
                  ),

                const SizedBox(height: 32),

                // Submit button
                GestureDetector(
                  onTap: _isValid && !_loading ? _handleSubmit : null,
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      gradient: _isValid
                          ? const LinearGradient(colors: [_S.gold, Color(0xFFF59E0B)])
                          : null,
                      color: _isValid ? null : _S.cardDark,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: _loading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                              ),
                            )
                          : Text(
                              'CAMBIAR CONTRASEÑA',
                              style: GoogleFonts.bebasNeue(
                                fontSize: 18,
                                color: _isValid ? Colors.black : _S.textMuted,
                                letterSpacing: 2,
                              ),
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    required bool obscure,
    required VoidCallback onToggle,
    required ValueChanged<String> onChanged,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: _S.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _S.gold.withOpacity(0.2)),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscure,
        onChanged: onChanged,
        style: GoogleFonts.outfit(color: _S.textPrimary),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.outfit(color: _S.textMuted),
          prefixIcon: Icon(icon, color: _S.gold, size: 20),
          suffixIcon: IconButton(
            icon: Icon(
              obscure ? Icons.visibility_off : Icons.visibility,
              color: _S.textMuted,
              size: 20,
            ),
            onPressed: onToggle,
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }

  Widget _buildValidationSection() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _S.surfaceDark,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Requisitos:',
            style: GoogleFonts.outfit(fontSize: 12, color: _S.textMuted, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          _buildCheck('Entre 10 y 72 caracteres', _hasMinLength),
          _buildCheck('Una letra mayúscula', _hasUppercase),
          _buildCheck('Una letra minúscula', _hasLowercase),
          _buildCheck('Un número', _hasNumber),
          _buildCheck('Un carácter especial', _hasSpecial),
        ],
      ),
    );
  }

  Widget _buildCheck(String label, bool met) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(
            met ? Icons.check_circle : Icons.radio_button_unchecked,
            size: 14,
            color: met ? _S.success : _S.textMuted,
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: met ? _S.success : _S.textMuted,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleSubmit() async {
    setState(() => _loading = true);

    try {
      final useCase = sl<ChangePasswordUseCase>();
      final result = await useCase(ChangePasswordParams(
        currentPassword: _currentController.text,
        newPassword: _passwordController.text,
      ));

      if (!mounted) return;

      result.fold(
        (failure) {
          setState(() => _loading = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(failure.message),
              backgroundColor: _S.error,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
        },
        (_) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('Contraseña cambiada. Inicia sesión con la nueva contraseña.'),
              backgroundColor: _S.success,
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
          );
          // The server closes every session when the password changes.
          context.read<AuthBloc>().add(const LogoutEvent());
        },
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: $e'),
          backgroundColor: _S.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }
}
