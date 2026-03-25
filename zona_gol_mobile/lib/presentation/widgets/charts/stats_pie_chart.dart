import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Data point for a pie chart
class PieChartItem {
  final String label;
  final double value;
  final Color color;

  const PieChartItem({
    required this.label,
    required this.value,
    required this.color,
  });
}

/// Reusable pie chart widget with Stadium Nights theme
class StatsPieChart extends StatelessWidget {
  final List<PieChartItem> items;
  final double? height;
  final double? centerSpaceRadius;
  final double? sectionRadius;
  final bool showLegend;

  const StatsPieChart({
    super.key,
    required this.items,
    this.height,
    this.centerSpaceRadius,
    this.sectionRadius,
    this.showLegend = true,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    final total = items.fold<double>(0, (sum, i) => sum + i.value);

    return Column(
      children: [
        SizedBox(
          height: height ?? 180,
          child: PieChart(
            PieChartData(
              sectionsSpace: 3,
              centerSpaceRadius: centerSpaceRadius ?? 40,
              sections: items.map((item) {
                final percentage = total > 0 ? (item.value / total * 100) : 0.0;
                return PieChartSectionData(
                  value: item.value,
                  color: item.color,
                  radius: sectionRadius ?? 50,
                  title: '${percentage.toStringAsFixed(0)}%',
                  titleStyle: GoogleFonts.bebasNeue(
                    fontSize: 14,
                    color: Colors.white,
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        if (showLegend) ...[
          const SizedBox(height: 16),
          Wrap(
            alignment: WrapAlignment.center,
            spacing: 16,
            runSpacing: 8,
            children: items.map((item) {
              return Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: item.color,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    '${item.label} (${item.value.toInt()})',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: const Color(0xFF9CA3AF),
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        ],
      ],
    );
  }
}
