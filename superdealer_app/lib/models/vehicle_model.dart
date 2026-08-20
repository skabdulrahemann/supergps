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
    );
  }
}
