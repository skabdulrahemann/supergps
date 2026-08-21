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
  final String? liveStatus;
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
      liveStatus: json['liveStatus'],
      speedKmh: json['speedKmh'] != null
          ? double.tryParse(json['speedKmh'].toString())
          : json['lastSpeedKmh'] != null
              ? double.tryParse(json['lastSpeedKmh'].toString())
              : null,
      lastLocation: json['lastLocation'] ??
          (json['lastLatitude'] != null && json['lastLongitude'] != null
              ? '${json['lastLatitude']}, ${json['lastLongitude']}'
              : null),
      lastSeen: json['lastSeen'] ?? json['lastSeenAt'],
    );
  }
}
