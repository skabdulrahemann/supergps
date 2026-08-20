# SuperGPS Customer App (Flutter)

Flutter customer app for SuperGPS platform.

## Setup

```bash
cd supergps_customer_app
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

// Real Device (same WiFi)
static const String baseUrl = 'http://YOUR_COMPUTER_IP:5000/api';
```

Make sure backend is running on port 5000.

## Screens

1. **Splash** → Auto-checks auth, redirects to login or home
2. **Login** → Email + password
3. **Register** → Name, email, phone, password
4. **Home** → Promo banner, quick actions, how-it-works steps
5. **Shop** → Buy GPS device, quantity selector, sales code toggle, address, total
6. **Orders** → List of all orders with status badges
7. **Order Detail** → Full order info with sections
8. **Vehicles** → Activated vehicles with IMEI, serial, SIM, dealer info
9. **Profile** → Avatar, email, phone, logout

## Features
- Modern Material 3 design
- Provider state management
- SharedPreferences for token persistence
- Pull-to-refresh on orders & vehicles
- Sales code support (dealer referral)
- Responsive bottom navigation

## Tech Stack
- Flutter 3.x
- Provider (state management)
- HTTP (API calls)
- SharedPreferences (local storage)
- Intl (date formatting)
