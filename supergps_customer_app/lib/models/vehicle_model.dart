class VehicleModel {
  final String id;
  final String customerId;
  final String? dealerId;
  final String orderId;
  final String imeiNumber;
  final String deviceSerialNumber;
  final String? simNumber;
  final String? vehicleNumber;
  final String vehicleType;
  final String? vehicleBrand;
  final String? vehicleModel;
  final String activationStatus;
  final String? activatedAt;
  final Map<String, dynamic>? customer;
  final Map<String, dynamic>? dealer;
  final Map<String, dynamic>? order;

  // Live tracking fields — populated once the Traccar/GPS live-data API is
  // wired in. Nullable so existing endpoints that don't send them still work.
  final String? liveStatus; // 'online' | 'offline' | 'moving'
  final double? speedKmh;
  final String? lastLocation;
  final String? lastSeen;

  VehicleModel({
    required this.id,
    required this.customerId,
    this.dealerId,
    required this.orderId,
    required this.imeiNumber,
    required this.deviceSerialNumber,
    this.simNumber,
    this.vehicleNumber,
    required this.vehicleType,
    this.vehicleBrand,
    this.vehicleModel,
    required this.activationStatus,
    this.activatedAt,
    this.customer,
    this.dealer,
    this.order,
    this.liveStatus,
    this.speedKmh,
    this.lastLocation,
    this.lastSeen,
  });

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    return VehicleModel(
      id: json['id'] ?? '',
      customerId: json['customerId'] ?? '',
      dealerId: json['dealerId'],
      orderId: json['orderId'] ?? '',
      imeiNumber: json['imeiNumber'] ?? '',
      deviceSerialNumber: json['deviceSerialNumber'] ?? '',
      simNumber: json['simNumber'],
      vehicleNumber: json['vehicleNumber'],
      vehicleType: json['vehicleType'] ?? 'car',
      vehicleBrand: json['vehicleBrand'],
      vehicleModel: json['vehicleModel'],
      activationStatus: json['activationStatus'] ?? 'pending',
      activatedAt: json['activatedAt'],
      customer: json['customer'],
      dealer: json['dealer'],
      order: json['order'],
      liveStatus: json['liveStatus'],
      speedKmh: json['speedKmh'] != null ? double.tryParse(json['speedKmh'].toString()) : null,
      lastLocation: json['lastLocation'],
      lastSeen: json['lastSeen'],
    );
  }
}
