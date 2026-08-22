import 'package:latlong2/latlong.dart';

const _distance = Distance();

double metersBetween(LatLng a, LatLng b) =>
    _distance.as(LengthUnit.Meter, a, b);

double kilometersForRoute(List<LatLng> points) {
  if (points.length < 2) return 0;

  var meters = 0.0;
  for (var i = 1; i < points.length; i++) {
    meters += metersBetween(points[i - 1], points[i]);
  }
  return meters / 1000;
}

LatLng lerpLatLng(LatLng a, LatLng b, double t) {
  return LatLng(
    a.latitude + (b.latitude - a.latitude) * t,
    a.longitude + (b.longitude - a.longitude) * t,
  );
}

double lerpHeading(double from, double to, double t) {
  final delta = ((to - from + 540) % 360) - 180;
  final value = (from + delta * t) % 360;
  return value < 0 ? value + 360 : value;
}
