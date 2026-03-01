// .\.\apps\mobile\lib\features\shop\widgets\pack_card.dart
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/pack.dart';

class PackCard extends StatelessWidget {
  final Pack pack;
  final VoidCallback? onTap;

  const PackCard({super.key, required this.pack, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color:        Colors.white,
          borderRadius: BorderRadius.circular(16),
          border:       Border.all(color: const Color(0xFFE5E7EB)),
          boxShadow: [
            BoxShadow(
              color:       Colors.black.withOpacity(0.05),
              blurRadius:  8,
              offset:      const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [

            // ─── Image ──────────────────────────────
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(16),
                  ),
                  child: pack.imageUrls.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl:   pack.imageUrls.first,
                        height:     160,
                        width:      double.infinity,
                        fit:        BoxFit.cover,
                        placeholder: (_, __) => _imagePlaceholder(),
                        errorWidget: (_, __, ___) => _imagePlaceholder(),
                      )
                    : _imagePlaceholder(),
                ),

                // Badge remise
                if (pack.discountPct > 0)
                  Positioned(
                    top: 10, left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color:        const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '-${pack.discountPct}%',
                        style: const TextStyle(
                          color:      Colors.white,
                          fontSize:   12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),

                // Badge personnalisable
                if (pack.isCustomizable)
                  Positioned(
                    top: 10, right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color:        const Color(0xFF2563EB),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text(
                        'Personnalisable',
                        style: TextStyle(
                          color:    Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
              ],
            ),

            // ─── Infos ──────────────────────────────
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [

                  // Nom
                  Text(
                    pack.name,
                    style: const TextStyle(
                      fontSize:   16,
                      fontWeight: FontWeight.bold,
                      color:      Color(0xFF111827),
                    ),
                    maxLines:  2,
                    overflow:  TextOverflow.ellipsis,
                  ),

                  // Description
                  if (pack.description != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      pack.description!,
                      style: const TextStyle(
                        fontSize: 13,
                        color:    Color(0xFF6B7280),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],

                  const SizedBox(height: 12),

                  // Prix
                  Row(
                    children: [
                      Text(
                        pack.formattedPrice,
                        style: const TextStyle(
                          fontSize:   17,
                          fontWeight: FontWeight.bold,
                          color:      Color(0xFF111827),
                        ),
                      ),
                      if (pack.discountPct > 0) ...[
                        const SizedBox(width: 8),
                        Text(
                          pack.formattedBasePrice,
                          style: const TextStyle(
                            fontSize:      13,
                            color:         Color(0xFF9CA3AF),
                            decoration:    TextDecoration.lineThrough,
                          ),
                        ),
                      ],
                    ],
                  ),

                  const SizedBox(height: 12),

                  // Bouton
                  SizedBox(
                    width:  double.infinity,
                    height: 40,
                    child:  ElevatedButton(
                      onPressed: onTap,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF111827),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        'Voir le pack',
                        style: TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _imagePlaceholder() => Container(
    height: 160,
    width:  double.infinity,
    color:  const Color(0xFF1F2937),
    child:  const Center(
      child: Text('✂️', style: TextStyle(fontSize: 48)),
    ),
  );
}