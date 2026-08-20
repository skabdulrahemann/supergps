import 'package:flutter/material.dart';
import '../constants/colors.dart';

class BottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const BottomNav({super.key, required this.currentIndex, required this.onTap});

  static const _items = [
    _NavItemData(icon: Icons.home_rounded, outlineIcon: Icons.home_outlined, label: 'Home'),
    _NavItemData(icon: Icons.directions_car_rounded, outlineIcon: Icons.directions_car_outlined, label: 'Vehicles'),
    _NavItemData(icon: Icons.notifications_rounded, outlineIcon: Icons.notifications_outlined, label: 'Alerts'),
    _NavItemData(icon: Icons.grid_view_rounded, outlineIcon: Icons.grid_view_outlined, label: 'More'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 16, offset: const Offset(0, -4)),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: List.generate(_items.length, (i) {
              final selected = i == currentIndex;
              final item = _items[i];
              return Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        selected ? item.icon : item.outlineIcon,
                        color: selected ? AppColors.primary : AppColors.textMuted,
                        size: 24,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.label,
                        style: TextStyle(
                          fontSize: 11,
                          fontFamily: 'Inter',
                          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                          color: selected ? AppColors.primary : AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavItemData {
  final IconData icon;
  final IconData outlineIcon;
  final String label;
  const _NavItemData({required this.icon, required this.outlineIcon, required this.label});
}
