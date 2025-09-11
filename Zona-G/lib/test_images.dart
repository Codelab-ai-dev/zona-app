import 'package:flutter/material.dart';

class TestImagesScreen extends StatelessWidget {
  const TestImagesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Test Images')),
      body: Column(
        children: [
          const Text('Testing fondo.png:'),
          Container(
            width: 200,
            height: 100,
            child: Image.asset(
              'assets/images/fondo.png',
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  color: Colors.red,
                  child: const Text('Error loading fondo.png'),
                );
              },
            ),
          ),
          const SizedBox(height: 20),
          const Text('Testing zona-gol-final.webp:'),
          Container(
            width: 100,
            height: 100,
            child: Image.asset(
              'assets/images/zona-gol-final.webp',
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  color: Colors.red,
                  child: const Text('Error loading logo'),
                );
              },
            ),
          ),
          const SizedBox(height: 20),
          const Text('Testing logo.png:'),
          Container(
            width: 100,
            height: 100,
            child: Image.asset(
              'assets/images/logo.png',
              fit: BoxFit.contain,
              errorBuilder: (context, error, stackTrace) {
                return Container(
                  color: Colors.red,
                  child: const Text('Error loading logo.png'),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
