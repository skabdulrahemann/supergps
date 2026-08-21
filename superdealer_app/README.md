# SuperDealer App (Flutter)

Dealer & Technician portal for SuperGPS platform.

## Setup

```bash
cd superdealer_app
flutter pub get
flutter run
```

## Important: Update API Base URL

Edit `lib/services/api_service.dart`:

```dart
// Android Emulator
static const String baseUrl = 'http://10.0.2.2:5000/api';

// iOS Simulator
static const String baseUrl = 'http://127.0.0.1:5000/api';

// AWS backend
static const String baseUrl = 'http://13.211.206.24:5000/api';
```

## Login Credentials (after backend seed)

| Role | Email | Password |
|------|-------|----------|
| Dealer | dealer@supergps.com | dealer123 |
| Technician | tech@supergps.com | tech123 |

## Screens

1. **Splash** → Animated logo with auto-auth check
2. **Login** → Email + password (dealer/technician only)
3. **Dashboard** → Sales code banner, stats grid (orders, pending, vehicles, customers), quick actions
4. **Orders** → All orders placed with dealer's sales code, Activate button
5. **Activation** → Device details form + 6-step activation flow
6. **Vehicles** → All activated vehicles with customer details
7. **Profile** → Dealer info, sales code, company details, logout

## Features
- Dealer & Technician in one app (role-based)
- Sales code display on dashboard
- 6-step device activation
- Customer details on every vehicle
- Purple gradient theme

## Tech Stack
- Flutter 3.x
- Provider (state management)
- HTTP (API calls)
- SharedPreferences (token persistence)
