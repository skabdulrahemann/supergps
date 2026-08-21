import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/colors.dart';

class HelpScreen extends StatefulWidget {
  const HelpScreen({super.key});

  @override
  State<HelpScreen> createState() => _HelpScreenState();
}

class _HelpScreenState extends State<HelpScreen> {
  final List<Map<String, dynamic>> _faqs = [
    {
      'question': 'How do I place an order?',
      'answer':
          'Go to the Shop tab, select your desired GPS product, choose quantity, enter your shipping address, and tap "Place Order". You can also enter a dealer sales code if referred by one.',
    },
    {
      'question': 'What is a dealer sales code?',
      'answer':
          'A sales code is provided by authorized SuperGPS dealers. When you enter their code during checkout, your order is linked to that dealer who will handle device activation and installation.',
    },
    {
      'question': 'How long does activation take?',
      'answer':
          'Once your dealer receives the device, activation typically takes 1-2 business days. You will see your vehicle in the Vehicles tab once activation is complete.',
    },
    {
      'question': 'Can I track my vehicle in real-time?',
      'answer':
          'Yes! After successful activation, your vehicle will appear in the Vehicles tab with real-time location updates, speed, and route history.',
    },
    {
      'question': 'What payment methods are accepted?',
      'answer':
          'We accept UPI, Credit/Debit cards, Net Banking, and Cash on Delivery. All online payments are secured with industry-standard encryption.',
    },
    {
      'question': 'How do I contact my dealer?',
      'answer':
          'Your dealer details are visible in your order details. You can find their company name, phone number, and address in the Orders section.',
    },
    {
      'question': 'What is the warranty period?',
      'answer':
          'All SuperGPS devices come with a 1-year manufacturer warranty covering hardware defects. Extended warranty plans are available at checkout.',
    },
    {
      'question': 'Can I order Fastag separately?',
      'answer':
          'Yes! Fastag is available as a standalone product in the Shop. It is NHAI approved and can be activated instantly.',
    },
  ];

  int? _expandedIndex;

  Future<void> _makeCall() async {
    final uri = Uri.parse('tel:7378666111');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
              content: Text('Could not launch dialer'),
              backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: AppColors.surface,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text('Help & Support',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontWeight: FontWeight.w800,
                fontFamily: 'Inter')),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Call Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                        color: AppColors.primary.withOpacity(0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8))
                  ],
                ),
                child: Column(
                  children: [
                    const Icon(Icons.headset_mic_rounded,
                        size: 48, color: Colors.white),
                    const SizedBox(height: 14),
                    const Text(
                      'Need Help?',
                      style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          fontFamily: 'Inter'),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Our support team is available 24/7 to assist you with any queries.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 13,
                          color: Colors.white70,
                          fontFamily: 'Inter',
                          height: 1.5),
                    ),
                    const SizedBox(height: 20),
                    GestureDetector(
                      onTap: _makeCall,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 28, vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                                color: Colors.black.withOpacity(0.1),
                                blurRadius: 10,
                                offset: const Offset(0, 4))
                          ],
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.phone_in_talk_rounded,
                                color: AppColors.primary, size: 22),
                            const SizedBox(width: 10),
                            const Text(
                              '7378666111',
                              style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.primary,
                                  fontFamily: 'Inter'),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Tap to call now',
                      style: TextStyle(
                          fontSize: 12,
                          color: Colors.white60,
                          fontFamily: 'Inter'),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),
              const Text('Frequently Asked Questions',
                  style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      fontFamily: 'Inter')),
              const SizedBox(height: 16),
              ...List.generate(_faqs.length, (i) {
                final isExpanded = _expandedIndex == i;
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                        color: isExpanded
                            ? AppColors.primary.withOpacity(0.3)
                            : AppColors.border),
                  ),
                  child: ExpansionTile(
                    title: Text(
                      _faqs[i]['question'],
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isExpanded
                            ? AppColors.primary
                            : AppColors.textPrimary,
                        fontFamily: 'Inter',
                      ),
                    ),
                    trailing: AnimatedRotation(
                      turns: isExpanded ? 0.5 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: Icon(Icons.keyboard_arrow_down,
                          color: isExpanded
                              ? AppColors.primary
                              : AppColors.textMuted),
                    ),
                    onExpansionChanged: (expanded) {
                      setState(() => _expandedIndex = expanded ? i : null);
                    },
                    children: [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                        child: Text(
                          _faqs[i]['answer'],
                          style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              fontFamily: 'Inter',
                              height: 1.6),
                        ),
                      ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
