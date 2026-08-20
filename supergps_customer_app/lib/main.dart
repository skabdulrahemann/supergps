import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'constants/colors.dart';
import 'screens/splash_screen.dart';

void main() {
  runApp(const SuperGpsCustomerApp());
}

class SuperGpsCustomerApp extends StatelessWidget {
  const SuperGpsCustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AuthProvider(),
      child: MaterialApp(
        title: 'SuperGPS',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          fontFamily: 'Inter',
          scaffoldBackgroundColor: AppColors.bg,
          colorScheme: ColorScheme.fromSeed(
            seedColor: AppColors.primary,
            primary: AppColors.primary,
            secondary: AppColors.accent,
            surface: AppColors.surface,
            background: AppColors.bg,
          ),
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.surface,
            foregroundColor: AppColors.textPrimary,
            elevation: 0,
            centerTitle: false,
            surfaceTintColor: Colors.transparent,
          ),
        ),
        home: const SplashScreen(),
      ),
    );
  }
}
