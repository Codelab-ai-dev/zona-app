import 'package:flutter/material.dart';
import '../../../core/config/theme.dart';

/// Dashboard Action Card
/// Reusable card widget for dashboard actions
class DashboardActionCard extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final Color? color;
  final VoidCallback? onTap;
  final Widget? trailing;
  final bool enabled;

  const DashboardActionCard({
    super.key,
    required this.title,
    this.subtitle,
    required this.icon,
    this.color,
    this.onTap,
    this.trailing,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final cardColor = color ?? AppTheme.primary;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              // Icon
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: cardColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  icon,
                  color: enabled ? cardColor : Colors.grey,
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),

              // Title and subtitle
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: enabled ? null : Colors.grey,
                          ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle!,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: enabled ? Colors.grey[600] : Colors.grey,
                            ),
                      ),
                    ],
                  ],
                ),
              ),

              // Trailing widget or arrow
              trailing ??
                  Icon(
                    Icons.arrow_forward_ios,
                    size: 16,
                    color: enabled ? Colors.grey : Colors.grey[300],
                  ),
            ],
          ),
        ),
      ),
    );
  }
}
