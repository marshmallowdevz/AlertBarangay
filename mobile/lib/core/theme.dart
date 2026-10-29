import 'package:flutter/material.dart';

class AppColors {
  static const maroon = Color(0xFF5A0F24);
  static const maroonDark = Color(0xFF470A1B);
  static const maroonSoft = Color(0xFF7A1F38);
  static const gold = Color(0xFFC9A227);
  static const goldSoft = Color(0xFFF6E9BD);
  static const cream = Color(0xFFFBF5EC);
  static const card = Color(0xFFFFFDF9);
  static const ink = Color(0xFF3A0A17);
  static const muted = Color(0xFF7D6A6F);
  static const line = Color(0xFFEFE4D6);
}

ThemeData buildTheme() => ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: AppColors.cream,
      colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.maroon,
          primary: AppColors.maroon,
          secondary: AppColors.gold,
          surface: AppColors.card),
      fontFamily: 'sans-serif',
      appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.cream,
          foregroundColor: AppColors.maroon,
          elevation: 0),
      inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.line)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: AppColors.line))),
    );
