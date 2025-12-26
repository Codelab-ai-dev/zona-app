import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../core/config/theme.dart';
import '../../../main.dart';
import '../../bloc/auth/auth_bloc.dart';
import '../../bloc/auth/auth_event.dart';
import '../../bloc/auth/auth_state.dart';

/// Login Screen - "Noche de Partido" Design
/// An immersive stadium-night experience for football fans
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  // Animation controllers
  late AnimationController _logoController;
  late AnimationController _staggerController;
  late AnimationController _lightsController;

  // Animations
  late Animation<double> _logoScale;
  late Animation<double> _logoGlow;
  late Animation<double> _lightsAnimation;

  // Focus nodes for input effects
  final _emailFocus = FocusNode();
  final _passwordFocus = FocusNode();
  bool _emailHasFocus = false;
  bool _passwordHasFocus = false;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
    _setupFocusListeners();

    // Set status bar style for dark background
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
      ),
    );
  }

  void _setupAnimations() {
    // Logo pulsing animation
    _logoController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    )..repeat(reverse: true);

    _logoScale = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _logoController, curve: Curves.easeInOut),
    );

    _logoGlow = Tween<double>(begin: 0.3, end: 0.8).animate(
      CurvedAnimation(parent: _logoController, curve: Curves.easeInOut),
    );

    // Staggered entrance animation
    _staggerController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    )..forward();

    // Stadium lights floating animation
    _lightsController = AnimationController(
      duration: const Duration(milliseconds: 8000),
      vsync: this,
    )..repeat();

    _lightsAnimation = Tween<double>(begin: 0, end: 2 * math.pi).animate(
      _lightsController,
    );
  }

  void _setupFocusListeners() {
    _emailFocus.addListener(() {
      setState(() => _emailHasFocus = _emailFocus.hasFocus);
    });
    _passwordFocus.addListener(() {
      setState(() => _passwordHasFocus = _passwordFocus.hasFocus);
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _logoController.dispose();
    _staggerController.dispose();
    _lightsController.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  void _handleLogin() {
    if (_formKey.currentState!.validate()) {
      HapticFeedback.mediumImpact();
      context.read<AuthBloc>().add(
            LoginWithEmailEvent(
              email: _emailController.text.trim(),
              password: _passwordController.text,
            ),
          );
    }
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;

    return Scaffold(
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthError) {
            HapticFeedback.heavyImpact();
            _showErrorSnackbar(state.message);
          } else if (state is Authenticated) {
            HapticFeedback.lightImpact();
            Navigator.of(context).pushReplacement(
              PageRouteBuilder(
                pageBuilder: (context, animation, secondaryAnimation) =>
                    const HomeScreen(),
                transitionsBuilder:
                    (context, animation, secondaryAnimation, child) {
                  return FadeTransition(opacity: animation, child: child);
                },
                transitionDuration: const Duration(milliseconds: 500),
              ),
            );
          }
        },
        builder: (context, state) {
          final isLoading = state is AuthLoading;

          return Stack(
            children: [
              // Background gradient
              _buildBackground(size),

              // Stadium light effects
              _buildStadiumLights(size),

              // Field lines decoration
              _buildFieldLines(size),

              // Main content
              SafeArea(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Spacer(flex: 2),

                        // Animated logo
                        _buildAnimatedLogo(),
                        const SizedBox(height: 8),

                        // Welcome text
                        _buildWelcomeText(),
                        const SizedBox(height: 28),

                        // Email field
                        _buildEmailField(isLoading),
                        const SizedBox(height: 12),

                        // Password field
                        _buildPasswordField(isLoading),
                        const SizedBox(height: 4),

                        // Forgot password
                        _buildForgotPassword(isLoading),
                        const SizedBox(height: 16),

                        // Login button
                        _buildLoginButton(isLoading),
                        const SizedBox(height: 20),

                        // Divider
                        _buildDivider(),
                        const SizedBox(height: 16),

                        // Social buttons
                        _buildSocialButtons(isLoading),
                        const SizedBox(height: 16),

                        // Sign up link
                        _buildSignUpLink(isLoading),

                        const Spacer(flex: 1),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildBackground(Size size) {
    return Container(
      width: size.width,
      height: size.height,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF0A0E1A), // Deep night
            Color(0xFF0D1B2A), // Dark blue
            Color(0xFF1B2838), // Stadium shadow
          ],
          stops: [0.0, 0.5, 1.0],
        ),
      ),
    );
  }

  Widget _buildStadiumLights(Size size) {
    return AnimatedBuilder(
      animation: _lightsAnimation,
      builder: (context, child) {
        return Stack(
          children: [
            // Top left light
            Positioned(
              top: -100 + math.sin(_lightsAnimation.value) * 20,
              left: -80 + math.cos(_lightsAnimation.value) * 15,
              child: _buildLightOrb(
                color: const Color(0xFF3B82F6).withOpacity(0.15),
                size: 300,
              ),
            ),
            // Top right light
            Positioned(
              top: -50 + math.cos(_lightsAnimation.value + 1) * 25,
              right: -100 + math.sin(_lightsAnimation.value + 1) * 20,
              child: _buildLightOrb(
                color: const Color(0xFF10B981).withOpacity(0.12),
                size: 350,
              ),
            ),
            // Bottom accent
            Positioned(
              bottom: -150 + math.sin(_lightsAnimation.value + 2) * 15,
              left: size.width * 0.3,
              child: _buildLightOrb(
                color: const Color(0xFF1E40AF).withOpacity(0.2),
                size: 400,
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildLightOrb({required Color color, required double size}) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: RadialGradient(
          colors: [color, color.withOpacity(0)],
        ),
      ),
    );
  }

  Widget _buildFieldLines(Size size) {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: CustomPaint(
        size: Size(size.width, 200),
        painter: FieldLinesPainter(
          color: Colors.white.withOpacity(0.03),
        ),
      ),
    );
  }

  Widget _buildAnimatedLogo() {
    return _buildStaggeredAnimation(
      delay: 0.0,
      child: AnimatedBuilder(
        animation: _logoController,
        builder: (context, child) {
          return Transform.scale(
            scale: _logoScale.value,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF10B981).withOpacity(_logoGlow.value * 0.5),
                    blurRadius: 50,
                    spreadRadius: 15,
                  ),
                  BoxShadow(
                    color: const Color(0xFF3B82F6).withOpacity(_logoGlow.value * 0.3),
                    blurRadius: 60,
                    spreadRadius: 20,
                  ),
                ],
              ),
              child: Image.asset(
                'assets/images/zona-gol.png',
                fit: BoxFit.contain,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildWelcomeText() {
    return _buildStaggeredAnimation(
      delay: 0.1,
      child: Text(
        'Vive la pasión del fútbol',
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w300,
          letterSpacing: 2,
          color: Colors.white.withOpacity(0.6),
        ),
      ),
    );
  }

  Widget _buildEmailField(bool isLoading) {
    return _buildStaggeredAnimation(
      delay: 0.2,
      child: _buildGlassInput(
        controller: _emailController,
        focusNode: _emailFocus,
        hasFocus: _emailHasFocus,
        enabled: !isLoading,
        hintText: 'Correo electrónico',
        prefixIcon: Icons.alternate_email_rounded,
        keyboardType: TextInputType.emailAddress,
        validator: (value) {
          if (value == null || value.isEmpty) {
            return 'Ingresa tu correo';
          }
          if (!value.contains('@')) {
            return 'Correo inválido';
          }
          return null;
        },
      ),
    );
  }

  Widget _buildPasswordField(bool isLoading) {
    return _buildStaggeredAnimation(
      delay: 0.25,
      child: _buildGlassInput(
        controller: _passwordController,
        focusNode: _passwordFocus,
        hasFocus: _passwordHasFocus,
        enabled: !isLoading,
        hintText: 'Contraseña',
        prefixIcon: Icons.lock_outline_rounded,
        obscureText: _obscurePassword,
        suffixIcon: GestureDetector(
          onTap: () {
            HapticFeedback.selectionClick();
            setState(() => _obscurePassword = !_obscurePassword);
          },
          child: Container(
            padding: const EdgeInsets.all(12),
            child: Icon(
              _obscurePassword
                  ? Icons.visibility_outlined
                  : Icons.visibility_off_outlined,
              color: _passwordHasFocus
                  ? const Color(0xFF10B981)
                  : Colors.white.withOpacity(0.7),
              size: 24,
            ),
          ),
        ),
        validator: (value) {
          if (value == null || value.isEmpty) {
            return 'Ingresa tu contraseña';
          }
          if (value.length < 6) {
            return 'Mínimo 6 caracteres';
          }
          return null;
        },
      ),
    );
  }

  Widget _buildGlassInput({
    required TextEditingController controller,
    required FocusNode focusNode,
    required bool hasFocus,
    required bool enabled,
    required String hintText,
    required IconData prefixIcon,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
  }) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        color: hasFocus
            ? const Color(0xFF1E293B)
            : const Color(0xFF0F172A),
        border: Border.all(
          color: hasFocus
              ? const Color(0xFF10B981)
              : const Color(0xFF334155),
          width: hasFocus ? 2 : 1.5,
        ),
        boxShadow: hasFocus
            ? [
                BoxShadow(
                  color: const Color(0xFF10B981).withOpacity(0.25),
                  blurRadius: 12,
                  spreadRadius: 0,
                ),
              ]
            : null,
      ),
      child: TextFormField(
        controller: controller,
        focusNode: focusNode,
        enabled: enabled,
        keyboardType: keyboardType,
        obscureText: obscureText,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.3,
        ),
        cursorColor: const Color(0xFF10B981),
        cursorWidth: 2,
        decoration: InputDecoration(
          filled: false,
          fillColor: Colors.transparent,
          hintText: hintText,
          hintStyle: TextStyle(
            color: Colors.white.withOpacity(0.35),
            fontWeight: FontWeight.w400,
            fontSize: 15,
          ),
          prefixIcon: Padding(
            padding: const EdgeInsets.only(left: 16, right: 12),
            child: Icon(
              prefixIcon,
              color: hasFocus
                  ? const Color(0xFF10B981)
                  : Colors.white.withOpacity(0.6),
              size: 22,
            ),
          ),
          prefixIconConstraints: const BoxConstraints(minWidth: 54),
          suffixIcon: suffixIcon,
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          errorBorder: InputBorder.none,
          focusedErrorBorder: InputBorder.none,
          disabledBorder: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
          errorStyle: const TextStyle(
            color: Color(0xFFEF4444),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
        validator: validator,
      ),
    );
  }

  Widget _buildForgotPassword(bool isLoading) {
    return _buildStaggeredAnimation(
      delay: 0.3,
      child: Align(
        alignment: Alignment.centerRight,
        child: TextButton(
          onPressed: isLoading
              ? null
              : () {
                  HapticFeedback.selectionClick();
                  ScaffoldMessenger.of(context).showSnackBar(
                    _buildSnackBar('Próximamente disponible', isError: false),
                  );
                },
          style: TextButton.styleFrom(
            foregroundColor: Colors.white.withOpacity(0.6),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          ),
          child: const Text(
            '¿Olvidaste tu contraseña?',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w400,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoginButton(bool isLoading) {
    return _buildStaggeredAnimation(
      delay: 0.35,
      child: GestureDetector(
        onTap: isLoading ? null : _handleLogin,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: double.infinity,
          height: 50,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: isLoading
                  ? [
                      const Color(0xFF10B981).withOpacity(0.5),
                      const Color(0xFF059669).withOpacity(0.5),
                    ]
                  : [
                      const Color(0xFF10B981),
                      const Color(0xFF059669),
                    ],
            ),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF10B981).withOpacity(0.4),
                blurRadius: 15,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Center(
            child: isLoading
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'ENTRAR',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.5,
                        ),
                      ),
                      SizedBox(width: 8),
                      Icon(
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return _buildStaggeredAnimation(
      delay: 0.4,
      child: Row(
        children: [
          Expanded(
            child: Container(
              height: 1,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    Colors.white.withOpacity(0.15),
                  ],
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Text(
              'o continúa con',
              style: TextStyle(
                color: Colors.white.withOpacity(0.4),
                fontSize: 11,
                fontWeight: FontWeight.w400,
              ),
            ),
          ),
          Expanded(
            child: Container(
              height: 1,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.white.withOpacity(0.15),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSocialButtons(bool isLoading) {
    return _buildStaggeredAnimation(
      delay: 0.45,
      child: Row(
        children: [
          Expanded(
            child: _buildSocialButton(
              icon: Icons.g_mobiledata_rounded,
              label: 'Google',
              iconSize: 24,
              onTap: () {
                HapticFeedback.selectionClick();
                ScaffoldMessenger.of(context).showSnackBar(
                  _buildSnackBar('Próximamente disponible', isError: false),
                );
              },
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _buildSocialButton(
              icon: Icons.apple_rounded,
              label: 'Apple',
              iconSize: 22,
              onTap: () {
                HapticFeedback.selectionClick();
                ScaffoldMessenger.of(context).showSnackBar(
                  _buildSnackBar('Próximamente disponible', isError: false),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSocialButton({
    required IconData icon,
    required String label,
    required double iconSize,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 46,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Colors.white.withOpacity(0.15),
          ),
          color: Colors.white.withOpacity(0.05),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              color: Colors.white.withOpacity(0.8),
              size: iconSize,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                color: Colors.white.withOpacity(0.8),
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSignUpLink(bool isLoading) {
    return _buildStaggeredAnimation(
      delay: 0.5,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '¿Nuevo en Zona Gol?',
            style: TextStyle(
              color: Colors.white.withOpacity(0.5),
              fontSize: 13,
            ),
          ),
          TextButton(
            onPressed: isLoading
                ? null
                : () {
                    HapticFeedback.selectionClick();
                    ScaffoldMessenger.of(context).showSnackBar(
                      _buildSnackBar('Próximamente disponible', isError: false),
                    );
                  },
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF10B981),
              padding: const EdgeInsets.symmetric(horizontal: 6),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text(
              'Únete al equipo',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStaggeredAnimation({
    required double delay,
    required Widget child,
  }) {
    return AnimatedBuilder(
      animation: _staggerController,
      builder: (context, _) {
        final animationValue = Curves.easeOutCubic.transform(
          ((_staggerController.value - delay) / (1 - delay)).clamp(0.0, 1.0),
        );

        return Opacity(
          opacity: animationValue,
          child: Transform.translate(
            offset: Offset(0, 30 * (1 - animationValue)),
            child: child,
          ),
        );
      },
    );
  }

  void _showErrorSnackbar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      _buildSnackBar(message, isError: true),
    );
  }

  SnackBar _buildSnackBar(String message, {required bool isError}) {
    return SnackBar(
      content: Row(
        children: [
          Icon(
            isError ? Icons.error_outline_rounded : Icons.info_outline_rounded,
            color: Colors.white,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
      backgroundColor: isError
          ? const Color(0xFFDC2626)
          : const Color(0xFF1E40AF),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.all(16),
      duration: const Duration(seconds: 3),
    );
  }
}

/// Custom painter for field lines decoration
class FieldLinesPainter extends CustomPainter {
  final Color color;

  FieldLinesPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    // Center circle
    canvas.drawCircle(
      Offset(size.width / 2, size.height + 80),
      120,
      paint,
    );

    // Horizontal line
    canvas.drawLine(
      Offset(0, size.height - 50),
      Offset(size.width, size.height - 50),
      paint,
    );

    // Penalty arc hint
    final arcPath = Path()
      ..addArc(
        Rect.fromCircle(
          center: Offset(size.width / 2, size.height + 150),
          radius: 200,
        ),
        math.pi * 1.1,
        math.pi * 0.8,
      );
    canvas.drawPath(arcPath, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Custom painter for soccer ball pattern
class SoccerBallPainter extends CustomPainter {
  final Color color;

  SoccerBallPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 5;

    // Outer circle
    canvas.drawCircle(center, radius, paint);

    // Pentagon in center (simplified soccer ball)
    final pentagonRadius = radius * 0.4;
    final path = Path();

    for (int i = 0; i < 5; i++) {
      final angle = (i * 72 - 90) * math.pi / 180;
      final x = center.dx + pentagonRadius * math.cos(angle);
      final y = center.dy + pentagonRadius * math.sin(angle);

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();

    final fillPaint = Paint()
      ..color = color.withOpacity(0.2)
      ..style = PaintingStyle.fill;

    canvas.drawPath(path, fillPaint);
    canvas.drawPath(path, paint);

    // Lines from pentagon vertices to outer circle
    for (int i = 0; i < 5; i++) {
      final innerAngle = (i * 72 - 90) * math.pi / 180;
      final outerAngle = (i * 72 - 90 + 36) * math.pi / 180;

      final innerX = center.dx + pentagonRadius * math.cos(innerAngle);
      final innerY = center.dy + pentagonRadius * math.sin(innerAngle);
      final outerX = center.dx + radius * math.cos(outerAngle);
      final outerY = center.dy + radius * math.sin(outerAngle);

      canvas.drawLine(
        Offset(innerX, innerY),
        Offset(outerX, outerY),
        paint..strokeWidth = 1.5,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
