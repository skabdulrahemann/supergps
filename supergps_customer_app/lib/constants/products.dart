class Product {
  final String id;
  final String name;
  final String description;
  final double price;
  final String icon;
  final List<String> features;
  final bool inStock;

  const Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.icon,
    required this.features,
    this.inStock = true,
  });
}

final List<Product> allProducts = [
  Product(
    id: 'gps-basic',
    name: 'SuperGPS Basic',
    description: 'Entry-level GPS tracker with real-time location tracking, geo-fencing alerts, and 6-month data subscription.',
    price: 1999.0,
    icon: 'gps',
    features: ['Real-time Tracking', 'Geo-fencing', 'Speed Alerts', '6 Months Data'],
  ),
  Product(
    id: 'gps-pro',
    name: 'SuperGPS Pro',
    description: 'Advanced tracker with engine cut-off, voice monitoring, SOS button, and 1-year data subscription.',
    price: 3499.0,
    icon: 'gps',
    features: ['Engine Cut-off', 'Voice Monitoring', 'SOS Button', '1 Year Data', 'Tamper Alert'],
  ),
  Product(
    id: 'gps-fleet',
    name: 'SuperGPS Fleet',
    description: 'Fleet management solution with multiple vehicle dashboard, route optimization, and driver behavior analysis.',
    price: 4999.0,
    icon: 'gps',
    features: ['Multi-Vehicle Dashboard', 'Route Optimization', 'Driver Score', 'Fuel Monitoring', '2 Year Data'],
  ),
  Product(
    id: 'fastag',
    name: 'Super Fastag',
    description: 'NHAI approved FASTag with auto-recharge, toll transaction history, and low balance alerts.',
    price: 499.0,
    icon: 'fastag',
    features: ['NHAI Approved', 'Auto Recharge', 'Toll History', 'Low Balance Alert', 'Instant Activation'],
  ),
];
