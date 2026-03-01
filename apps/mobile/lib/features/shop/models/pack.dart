// .\.\apps\mobile\lib\features\shop\models\pack.dart
class Pack {
  final String  id;
  final String  name;
  final String  slug;
  final String? description;
  final double  basePrice;
  final double  finalPrice;
  final int     discountPct;
  final bool    isCustomizable;
  final List<String> imageUrls;

  const Pack({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    required this.basePrice,
    required this.finalPrice,
    required this.discountPct,
    required this.isCustomizable,
    required this.imageUrls,
  });

  factory Pack.fromJson(Map<String, dynamic> json) {
    final basePrice   = double.parse(json['basePrice'].toString());
    final discountPct = double.parse(json['discountPct'].toString()).toInt();
    final finalPrice  = double.parse(json['finalPrice'].toString());

    return Pack(
      id:             json['id']             as String,
      name:           json['name']           as String,
      slug:           json['slug']           as String,
      description:    json['description']    as String?,
      basePrice:      basePrice,
      finalPrice:     finalPrice,
      discountPct:    discountPct,
      isCustomizable: json['isCustomizable'] as bool? ?? false,
      imageUrls:      (json['imageUrls'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList() ?? [],
    );
  }

  String get formattedPrice {
    return '${finalPrice.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]} ',
    )} F CFA';
  }

  String get formattedBasePrice {
    return '${basePrice.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]} ',
    )} F CFA';
  }
}