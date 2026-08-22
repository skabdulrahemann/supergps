import 'package:flutter/material.dart';
import '../constants/colors.dart';

class BottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const BottomNav({super.key, required this.currentIndex, required this.onTap});

  static const _items = [
    _NavItemData(
        icon: Icons.home_rounded,
        outlineIcon: Icons.home_outlined,
        label: 'Home'),
    _NavItemData(
        icon: Icons.local_shipping_rounded,
        outlineIcon: Icons.local_shipping_outlined,
        label: 'Vehicles'),
    _NavItemData(
        icon: Icons.navigation_rounded,
        outlineIcon: Icons.near_me_outlined,
        label: 'Track',
        emphasized: true),
    _NavItemData(
        icon: Icons.grid_view_rounded,
        outlineIcon: Icons.grid_view_outlined,
        label: 'Services'),
    _NavItemData(
        icon: Icons.person_rounded,
        outlineIcon: Icons.person_outline_rounded,
        label: 'Account'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.border)),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withValues(alpha: 0.06),
              blurRadius: 16,
              offset: const Offset(0, -4)),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 66,
          child: Row(
            children: List.generate(_items.length, (i) {
              final selected = i == currentIndex;
              final item = _items[i];
              final icon = selected ? item.icon : item.outlineIcon;
              if (item.emphasized) {
                return Expanded(
                  child: InkWell(
                    onTap: () => onTap(i),
                    child: Transform.translate(
                      offset: const Offset(0, -4),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: selected
                                  ? AppColors.primary
                                  : AppColors.primary,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.primaryDark
                                      .withValues(alpha: 0.28),
                                  blurRadius: 14,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: Icon(icon,
                                color: selected ? Colors.white : Colors.white,
                                size: 22),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            item.label,
                            style: TextStyle(
                              fontSize: 9,
                              fontFamily: 'Poppins',
                              fontWeight: FontWeight.w600,
                              color: selected
                                  ? AppColors.textPrimary
                                  : AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              return Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(icon,
                          color: selected
                              ? AppColors.primary
                              : AppColors.textMuted,
                          size: 22),
                      const SizedBox(height: 3),
                      Text(
                        item.label,
                        style: TextStyle(
                          fontSize: 10,
                          fontFamily: 'Poppins',
                          fontWeight:
                              selected ? FontWeight.w600 : FontWeight.w600,
                          color: selected
                              ? AppColors.textPrimary
                              : AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 3),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        width: selected ? 18 : 0,
                        height: 3,
                        decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(999)),
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
  final bool emphasized;
  const _NavItemData({
    required this.icon,
    required this.outlineIcon,
    required this.label,
    this.emphasized = false,
  });
}
