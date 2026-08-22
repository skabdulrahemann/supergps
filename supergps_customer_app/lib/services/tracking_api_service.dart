import '../models/vehicle_position.dart';
import 'api_service.dart';

class TrackingApiService {
  static Future<TrackingSnapshot> loadInitial(String vehicleId) async {
    final latest = await ApiService.get('/tracking/$vehicleId/latest');
    final route = await loadTodayRoute(vehicleId);

    VehiclePosition? latestPosition;
    Map<String, dynamic>? vehicle;
    if (latest is Map) {
      if (latest['vehicle'] is Map) {
        vehicle = Map<String, dynamic>.from(latest['vehicle'] as Map);
      }
      if (latest['position'] is Map) {
        latestPosition = VehiclePosition.fromJson(
            Map<String, dynamic>.from(latest['position'] as Map));
      }
    }

    return TrackingSnapshot(
      vehicle: vehicle,
      latestPosition: latestPosition,
      todayRoute: route,
    );
  }

  static Future<List<VehiclePosition>> loadTodayRoute(String vehicleId) async {
    final res = await ApiService.get('/tracking/$vehicleId/positions/today');
    final list = _extractPositions(res);
    return list;
  }

  static Future<List<VehiclePosition>> loadPositionsSince(
    String vehicleId,
    DateTime from,
  ) async {
    final encoded = Uri.encodeQueryComponent(from.toUtc().toIso8601String());
    final res =
        await ApiService.get('/tracking/$vehicleId/positions?from=$encoded');
    return _extractPositions(res);
  }

  static List<VehiclePosition> _extractPositions(dynamic res) {
    final raw = res is Map ? res['positions'] : res;
    if (raw is! List) return [];
    return raw
        .whereType<Map>()
        .map(
            (item) => VehiclePosition.fromJson(Map<String, dynamic>.from(item)))
        .toList();
  }
}

class TrackingSnapshot {
  final Map<String, dynamic>? vehicle;
  final VehiclePosition? latestPosition;
  final List<VehiclePosition> todayRoute;

  const TrackingSnapshot({
    required this.vehicle,
    required this.latestPosition,
    required this.todayRoute,
  });
}
