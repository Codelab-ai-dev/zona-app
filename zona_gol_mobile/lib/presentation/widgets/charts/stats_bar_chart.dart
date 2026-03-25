import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Data point for a bar chart
class BarChartItem {
  final String label;
  final double value;

  const BarChartItem({required this.label, required this.value});
}

/// Reusable bar chart widget with Stadium Nights theme
class StatsBarChart extends StatelessWidget {
  final List<BarChartItem> items;
  final Color barColor;
  final Color? barColorEnd;
  final String? tooltipSuffix;
  final double? height;

  const StatsBarChart({
    super.key,
    required this.items,
    this.barColor = const Color(0xFF00FF7F),
    this.barColorEnd,
    this.tooltipSuffix,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    final maxVal = items.fold<double>(0, (max, i) => i.value > max ? i.value : max);

    return SizedBox(
      height: height ?? 200,
      child: BarChart(
        BarChartData(
          alignment: BarChartAlignment.spaceAround,
          maxY: maxVal + (maxVal * 0.2).clamp(1, double.infinity),
          barTouchData: BarTouchData(
            enabled: true,
            touchTooltipData: BarTouchTooltipData(
              tooltipRoundedRadius: 8,
              getTooltipColor: (_) => const Color(0xFF12121A),
              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                final label = items[group.x].label;
                final suffix = tooltipSuffix ?? '';
                return BarTooltipItem(
                  '$label\n${rod.toY.toInt()} $suffix',
                  GoogleFonts.outfit(color: barColor, fontSize: 12),
                );
              },
            ),
          ),
          titlesData: FlTitlesData(
            show: true,
            bottomTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                getTitlesWidget: (value, meta) {
                  final index = value.toInt();
                  if (index < 0 || index >= items.length) {
                    return const SizedBox.shrink();
                  }
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      items[index].label,
                      style: GoogleFonts.outfit(
                        color: const Color(0xFF6B7280),
                        fontSize: 10,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  );
                },
              ),
            ),
            leftTitles: AxisTitles(
              sideTitles: SideTitles(
                showTitles: true,
                reservedSize: 28,
                getTitlesWidget: (value, meta) {
                  if (value == value.roundToDouble() && value >= 0) {
                    return Text(
                      '${value.toInt()}',
                      style: GoogleFonts.outfit(
                        color: const Color(0xFF6B7280),
                        fontSize: 10,
                      ),
                    );
                  }
                  return const SizedBox.shrink();
                },
              ),
            ),
            topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          ),
          gridData: FlGridData(
            show: true,
            drawVerticalLine: false,
            horizontalInterval: 1,
            getDrawingHorizontalLine: (value) => FlLine(
              color: Colors.white.withOpacity(0.05),
              strokeWidth: 1,
            ),
          ),
          borderData: FlBorderData(show: false),
          barGroups: items.asMap().entries.map((entry) {
            return BarChartGroupData(
              x: entry.key,
              barRods: [
                BarChartRodData(
                  toY: entry.value.value,
                  width: items.length <= 5 ? 24 : 16,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      barColor.withOpacity(0.6),
                      barColorEnd ?? barColor,
                    ],
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}
