import 'package:latlong2/latlong.dart';
import '../models/vehicle_position.dart';
import 'distance_utils.dart';

class GpsFilter {
  static const double minRoutePointMeters = 4;
  static const double maxPlausibleKmhWithoutProof = 180;
  static const double maxStationaryJumpMeters = 300;

  static bool isValidCoordinate(double latitude, double longitude) {
    return latitude.isFinite &&
        longitude.isFinite &&
        latitude != 0 &&
        longitude != 0 &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180;
  }

  static bool isValidPosition(VehiclePosition position) {
    return position.gpsValid &&
        isValidCoordinate(position.latitude, position.longitude);
  }

  static bool shouldAccept({
    required VehiclePosition next,
    VehiclePosition? previous,
  }) {
    if (!isValidPosition(next)) return false;
    if (previous == null || !isValidPosition(previous)) return true;

    final distanceMeters = metersBetween(previous.point, next.point);
    if (distanceMeters < minRoutePointMeters) return false;
    if (next.speedKmh <= 5 && distanceMeters > maxStationaryJumpMeters) {
      return false;
    }

    final fromTime = previous.deviceTime ?? previous.receivedAt;
    final toTime = next.deviceTime ?? next.receivedAt;
    if (fromTime == null || toTime == null) return true;

    final seconds = toTime.difference(fromTime).inMilliseconds / 1000;
    if (seconds <= 0) return false;

    final impliedKmh = (distanceMeters / seconds) * 3.6;
    final reportedSpeed = next.speedKmh;
    if (impliedKmh > maxPlausibleKmhWithoutProof &&
        reportedSpeed < maxPlausibleKmhWithoutProof) {
      return false;
    }

    return true;
  }

  static List<VehiclePosition> cleanRoute(List<VehiclePosition> positions) {
    final accepted = <VehiclePosition>[];
    for (final position in positions) {
      final previous = accepted.isEmpty ? null : accepted.last;
      if (shouldAccept(next: position, previous: previous)) {
        accepted.add(position);
      }
    }
    return accepted;
  }

  static List<LatLng> simplifyForRender(List<LatLng> points) {
    if (points.length <= 5000) return points;
    final step = (points.length / 5000).ceil();
    final sampled = <LatLng>[];
    for (var i = 0; i < points.length; i += step) {
      sampled.add(points[i]);
    }
    if (sampled.last != points.last) sampled.add(points.last);
    return sampled;
  }
}
