import 'package:flutter/material.dart';
import '../constants/colors.dart';
import '../models/vehicle_model.dart';
import '../services/api_service.dart';
import 'gps_feature_screens.dart';

class VehiclesScreen extends StatefulWidget {
  const VehiclesScreen({super.key});

  @override
  State<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends State<VehiclesScreen> {
  List<VehicleModel> _vehicles = [];
  bool _loading = true;
  String _query = '';
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _fetchVehicles();
  }

  Future<void> _fetchVehicles() async {
    try {
      final res = await ApiService.get('/vehicles/my-vehicles');
      final data = res['vehicles'] as List? ?? [];
      setState(() {
        _vehicles = data.map((v) => VehicleModel.fromJson(v)).toList();
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _vehicles.where((v) {
      final text = '${v.vehicleNumber ?? ''} ${v.vehicleBrand ?? ''} ${v.vehicleModel ?? ''}'.toLowerCase();
      final matchesQuery = text.contains(_query.toLowerCase());
      final matchesFilter = _filter == 'all' || v.activationStatus == _filter;
      return matchesQuery && matchesFilter;
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        title: const Text('My Vehicles', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w800, fontFamily: 'Inter')),
        centerTitle: true,
      ),
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
            : RefreshIndicator(
                onRefresh: _fetchVehicles,
                color: AppColors.primary,
                child: _vehicles.isEmpty
                    ? ListView(
                        children: [
                          SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                          const Icon(Icons.directions_car_outlined, size: 64, color: AppColors.textMuted),
                          const SizedBox(height: 16),
                          const Center(child: Text('No vehicles yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: AppColors.textSecondary, fontFamily: 'Inter'))),
                          const SizedBox(height: 8),
                          const Center(child: Text('Vehicles appear after dealer activation', style: TextStyle(fontSize: 14, color: AppColors.textMuted, fontFamily: 'Inter'))),
                        ],
                      )
                    : ListView(
                        padding: const EdgeInsets.all(20),
                        children: [
                          _SearchAndFilters(
                            onQuery: (v) => setState(() => _query = v),
                            filter: _filter,
                            onFilter: (v) => setState(() => _filter = v),
                          ),
                          const SizedBox(height: 16),
                          ...filtered.map((vehicle) => _VehicleCard(vehicle: vehicle)),
                          if (filtered.isEmpty)
                            const Padding(
                              padding: EdgeInsets.only(top: 80),
                              child: Center(child: Text('No matching vehicles', style: TextStyle(color: AppColors.textSecondary, fontFamily: 'Inter'))),
                            ),
                        ],
                      ),
              ),
      ),
    );
  }
}

class _VehicleCard extends StatelessWidget {
  final VehicleModel vehicle;
  const _VehicleCard({required this.vehicle});

  Color _statusColor(String status) {
    switch (status) {
      case 'activated': return AppColors.success;
      case 'in_progress': return AppColors.primary;
      case 'pending': return AppColors.warning;
      default: return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => VehicleDetailsScreen(vehicle: vehicle))),
      borderRadius: BorderRadius.circular(24),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: AppColors.border),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))],
        ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: _statusColor(vehicle.activationStatus).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Icon(Icons.directions_car_rounded, color: _statusColor(vehicle.activationStatus), size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(vehicle.vehicleNumber ?? 'Unnamed Vehicle', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: AppColors.textPrimary, fontFamily: 'Inter')),
                    const SizedBox(height: 2),
                    Text('${vehicle.vehicleBrand ?? ''} ${vehicle.vehicleModel ?? ''}', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, fontFamily: 'Inter')),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: _statusColor(vehicle.activationStatus).withOpacity(0.1), borderRadius: BorderRadius.circular(20)),
                child: Text(vehicle.activationStatus.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: _statusColor(vehicle.activationStatus), fontFamily: 'Inter')),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 12),
          _Detail(icon: Icons.memory_rounded, label: 'IMEI', value: vehicle.imeiNumber),
          const SizedBox(height: 10),
          _Detail(icon: Icons.confirmation_number_rounded, label: 'Serial', value: vehicle.deviceSerialNumber),
          const SizedBox(height: 10),
          _Detail(icon: Icons.sim_card_rounded, label: 'SIM', value: vehicle.simNumber ?? 'N/A'),
          const SizedBox(height: 10),
          _Detail(icon: Icons.storefront_rounded, label: 'Dealer', value: vehicle.dealer?['companyName'] ?? 'Direct Purchase'),
          if (vehicle.activatedAt != null) ...[
            const SizedBox(height: 10),
            _Detail(icon: Icons.calendar_today_rounded, label: 'Activated', value: vehicle.activatedAt!.substring(0, 10)),
          ],
        ],
      ),
      ),
    );
  }
}

class _SearchAndFilters extends StatelessWidget {
  final ValueChanged<String> onQuery;
  final String filter;
  final ValueChanged<String> onFilter;

  const _SearchAndFilters({required this.onQuery, required this.filter, required this.onFilter});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TextField(
          onChanged: onQuery,
          decoration: InputDecoration(
            hintText: 'Search vehicle number',
            prefixIcon: const Icon(Icons.search_rounded),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.border)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: AppColors.border)),
          ),
        ),
        const SizedBox(height: 12),
        Align(
          alignment: Alignment.centerLeft,
          child: Wrap(
            spacing: 8,
            children: [
              ('all', 'All'),
              ('activated', 'Running'),
              ('in_progress', 'Idle'),
              ('pending', 'Offline'),
            ].map((item) {
              final selected = filter == item.$1;
              return ChoiceChip(
                label: Text(item.$2),
                selected: selected,
                onSelected: (_) => onFilter(item.$1),
                selectedColor: AppColors.primary,
                labelStyle: TextStyle(color: selected ? Colors.white : AppColors.textPrimary, fontWeight: FontWeight.w700, fontFamily: 'Inter'),
                side: BorderSide(color: selected ? AppColors.primary : AppColors.border),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _Detail extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _Detail({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AppColors.textMuted),
        const SizedBox(width: 8),
        Text('$label: ', style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontFamily: 'Inter')),
        Expanded(
          child: Text(value, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary, fontFamily: 'Inter'), overflow: TextOverflow.ellipsis),
        ),
      ],
    );
  }
}
