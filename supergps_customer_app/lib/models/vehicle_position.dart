import 'package:latlong2/latlong.dart';

class VehiclePosition {
  final String? id;
  final String vehicleId;
  final double latitude;
  final double longitude;
  final double speedKmh;
  final double heading;
  final bool? ignition;
  final bool gpsValid;
  final int? satellites;
  final DateTime? deviceTime;
  final DateTime? receivedAt;

  const VehiclePosition({
    this.id,
    required this.vehicleId,
    required this.latitude,
    required this.longitude,
    this.speedKmh = 0,
    this.heading = 0,
    this.ignition,
    this.gpsValid = true,
    this.satellites,
    this.deviceTime,
    this.receivedAt,
  });

  LatLng get point => LatLng(latitude, longitude);

  factory VehiclePosition.fromJson(Map<String, dynamic> json) {
    final position = json['position'] is Map
        ? Map<String, dynamic>.from(json['position'] as Map)
        : json;
    final vehicle = json['vehicle'] is Map
        ? Map<String, dynamic>.from(json['vehicle'] as Map)
        : const <String, dynamic>{};
    final raw = position['raw'] is Map
        ? Map<String, dynamic>.from(position['raw'] as Map)
        : const <String, dynamic>{};
    final rawIo = raw['io'] is Map
        ? Map<String, dynamic>.from(raw['io'] as Map)
        : const <String, dynamic>{};
    final rawElements = rawIo['elements'] is Map
        ? Map<String, dynamic>.from(rawIo['elements'] as Map)
        : const <String, dynamic>{};

    final lat = _toDouble(position['latitude'] ?? position['lat']);
    final lng = _toDouble(position['longitude'] ?? position['lng']);
    final ignitionValue = position['ignition'] ??
        position['lastIgnition'] ??
        vehicle['lastIgnition'] ??
        raw['ignition'] ??
        rawIo['ignition'] ??
        rawElements['239'];

    return VehiclePosition(
      id: position['id']?.toString(),
      vehicleId: (position['vehicleId'] ?? json['vehicleId'] ?? '').toString(),
      latitude: lat ?? 0,
      longitude: lng ?? 0,
      speedKmh: _toDouble(position['speedKmh'] ??
              position['speed'] ??
              vehicle['lastSpeedKmh']) ??
          0,
      heading: _normalizeHeading(
        _toDouble(position['course'] ??
                position['heading'] ??
                vehicle['lastCourse']) ??
            0,
      ),
      ignition: _toBool(ignitionValue),
      gpsValid: position['gpsValid'] == null
          ? true
          : _toBool(position['gpsValid']) == true,
      satellites: _toInt(position['satellites'] ?? vehicle['lastSatellites']),
      deviceTime: _toDate(position['deviceTimestamp'] ??
          position['timestamp'] ??
          position['deviceTime']),
      receivedAt: _toDate(position['receivedAt'] ??
          position['serverTime'] ??
          position['createdAt']),
    );
  }

  VehiclePosition copyWith({
    double? latitude,
    double? longitude,
    double? speedKmh,
    double? heading,
    bool? ignition,
    bool? gpsValid,
    int? satellites,
    DateTime? deviceTime,
    DateTime? receivedAt,
  }) {
    return VehiclePosition(
      id: id,
      vehicleId: vehicleId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      speedKmh: speedKmh ?? this.speedKmh,
      heading: heading ?? this.heading,
      ignition: ignition ?? this.ignition,
      gpsValid: gpsValid ?? this.gpsValid,
      satellites: satellites ?? this.satellites,
      deviceTime: deviceTime ?? this.deviceTime,
      receivedAt: receivedAt ?? this.receivedAt,
    );
  }
}

double? _toDouble(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  return double.tryParse(value.toString());
}

int? _toInt(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value.toString());
}

bool? _toBool(dynamic value) {
  if (value == null) return null;
  if (value is bool) return value;
  final text = value.toString().toLowerCase();
  if (text == 'true' || text == '1' || text == 'on') return true;
  if (text == 'false' || text == '0' || text == 'off') return false;
  return null;
}

DateTime? _toDate(dynamic value) {
  if (value == null) return null;
  if (value is DateTime) return value;
  return DateTime.tryParse(value.toString());
}

double _normalizeHeading(double heading) {
  final normalized = heading % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}
