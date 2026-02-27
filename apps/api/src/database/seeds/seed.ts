import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// ─── Charger .env.local ───────────────────────────────────
dotenv.config({ path: path.resolve(__dirname, '../../../.env.local') });

// ─── Entités ──────────────────────────────────────────────
import { User } from '../../modules/users/entities/user.entity';
import { AuditLog } from '../../modules/audit/entities/audit-log.entity';
import { RefreshToken } from '../../modules/auth/entities/refresh-token.entity';
import { Category } from '../../modules/packs/entities/category.entity';
import { Product } from '../../modules/packs/entities/product.entity';
import { Pack } from '../../modules/packs/entities/pack.entity';
import { PackProduct } from '../../modules/packs/entities/pack-product.entity';
import { Order } from '../../modules/orders/entities/order.entity';
import { OrderItem } from '../../modules/orders/entities/order-item.entity';

// ─── DataSource standalone ───────────────────────────────
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: Number(process.env['DB_PORT'] ?? 5432),
  username: process.env['DB_USERNAME'] ?? 'barber_user',
  password: process.env['DB_PASSWORD'] ?? 'barber_secret_2025',
  database: process.env['DB_NAME'] ?? 'barbershop_dev',
  entities: [
    User,
    AuditLog,
    RefreshToken,
    Category,
    Product,
    Pack,
    PackProduct,
    Order,
    OrderItem,
  ],
  synchronize: false,
  logging: false,
});

async function seed(): Promise<void> {
  console.log('🌱 Démarrage du seeder BarberShop...\n');

  await AppDataSource.initialize();
  console.log('✅ Connexion PostgreSQL établie\n');

  const categoryRepo = AppDataSource.getRepository(Category);
  const productRepo = AppDataSource.getRepository(Product);
  const packRepo = AppDataSource.getRepository(Pack);
  const packProductRepo = AppDataSource.getRepository(PackProduct);

  // ─── Nettoyage dans le bon ordre (FK) ─────────────────
  console.log('🧹 Nettoyage des données existantes...');
    await AppDataSource.query(
    'TRUNCATE TABLE pack_products, packs, products, categories RESTART IDENTITY CASCADE',
    );
  console.log('✅ Nettoyage terminé\n');

  // ═══════════════════════════════════════════════════════
  // 1. CATÉGORIES
  // ═══════════════════════════════════════════════════════
  console.log('📂 Insertion des catégories...');

  const categories = await categoryRepo.save([
    {
      name: 'Rasage',
      slug: 'rasage',
      description: 'Produits et accessoires pour le rasage professionnel',
      sortOrder: 1,
    },
    {
      name: 'Capillaire',
      slug: 'capillaire',
      description: 'Soins et traitements capillaires pour hommes',
      sortOrder: 2,
    },
    {
      name: 'Barbe',
      slug: 'barbe',
      description: 'Entretien et styling de la barbe',
      sortOrder: 3,
    },
  ]);

  const [catRasage, catCapillaire, catBarbe] = categories;
  console.log(`✅ ${categories.length} catégories créées\n`);

  // ═══════════════════════════════════════════════════════
  // 2. PRODUITS (prix en F CFA)
  // ═══════════════════════════════════════════════════════
  console.log('📦 Insertion des produits...');

  const products = await productRepo.save([
    // ─── Rasage ──────────────────────────────────────────
    {
      name: 'Tondeuse Professionnelle Wahl',
      description: 'Tondeuse haute performance pour coupe précise',
      unitPrice: 35000,
      stockQty: 50,
      sku: 'TON-WAHL-001',
      categoryId: catRasage.id,
    },
    {
      name: 'Rasoir Droit Acier Inox',
      description: 'Rasoir droit professionnel avec lame en acier inoxydable',
      unitPrice: 18000,
      stockQty: 30,
      sku: 'RAS-DROIT-001',
      categoryId: catRasage.id,
    },
    {
      name: 'Mousse à Raser Premium',
      description: 'Mousse hydratante pour rasage de près sans irritation',
      unitPrice: 4500,
      stockQty: 100,
      sku: 'MOU-RAS-001',
      categoryId: catRasage.id,
    },
    {
      name: 'Blaireau Poils de Blaireau',
      description: 'Blaireau naturel pour application parfaite de la mousse',
      unitPrice: 8500,
      stockQty: 40,
      sku: 'BLA-NAT-001',
      categoryId: catRasage.id,
    },
    // ─── Capillaire ───────────────────────────────────────
    {
      name: 'Shampoing Homme Anti-Pelliculaire',
      description: 'Shampoing purifiant spécial cuir chevelu sensible',
      unitPrice: 6500,
      stockQty: 80,
      sku: 'SHA-APL-001',
      categoryId: catCapillaire.id,
    },
    {
      name: 'Cire Coiffante Mate',
      description: 'Cire fixante effet mat longue tenue',
      unitPrice: 5500,
      stockQty: 60,
      sku: 'CIR-MAT-001',
      categoryId: catCapillaire.id,
    },
    {
      name: 'Huile de Coco Capillaire',
      description: 'Huile naturelle nourrissante pour cheveux et barbe',
      unitPrice: 7000,
      stockQty: 45,
      sku: 'HUI-COC-001',
      categoryId: catCapillaire.id,
    },
    // ─── Barbe ────────────────────────────────────────────
    {
      name: 'Huile de Barbe Premium',
      description: 'Mélange d\'huiles essentielles pour barbe douce et brillante',
      unitPrice: 9500,
      stockQty: 55,
      sku: 'HUI-BAR-001',
      categoryId: catBarbe.id,
    },
    {
      name: 'Baume à Barbe Hydratant',
      description: 'Baume nourrissant pour barbe longue et domptée',
      unitPrice: 8000,
      stockQty: 70,
      sku: 'BAU-BAR-001',
      categoryId: catBarbe.id,
    },
    {
      name: 'Peigne à Barbe Bois de Santal',
      description: 'Peigne artisanal en bois de santal pour démêler et coiffer',
      unitPrice: 5000,
      stockQty: 35,
      sku: 'PEI-BAR-001',
      categoryId: catBarbe.id,
    },
  ]);

  // Indexer les produits par SKU pour référence facile
  const byName = (name: string): Product => {
    const p = products.find((pr) => pr.name === name);
    if (!p) throw new Error(`Produit "${name}" introuvable`);
    return p;
  };

  console.log(`✅ ${products.length} produits créés\n`);

  // ═══════════════════════════════════════════════════════
  // 3. PACKS
  // ═══════════════════════════════════════════════════════
  console.log('🎁 Insertion des packs...');

  // ─── Pack 1 : Rasage Pro ──────────────────────────────
  const pack1 = await packRepo.save({
    name: 'Pack Rasage Pro',
    slug: 'pack-rasage-pro',
    description: 'Tout le nécessaire pour un rasage professionnel parfait',
    basePrice: 58000,
    discountPct: 10,
    isCustomizable: true,
    categoryId: catRasage.id,
  });

  await packProductRepo.save([
    {
      packId: pack1.id,
      productId: byName('Tondeuse Professionnelle Wahl').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 0,
    },
    {
      packId: pack1.id,
      productId: byName('Rasoir Droit Acier Inox').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 1,
    },
    {
      packId: pack1.id,
      productId: byName('Mousse à Raser Premium').id,
      quantity: 2,
      isOptional: true,
      sortOrder: 2,
    },
    {
      packId: pack1.id,
      productId: byName('Blaireau Poils de Blaireau').id,
      quantity: 1,
      isOptional: true,
      sortOrder: 3,
    },
  ]);

  // ─── Pack 2 : Barbe Complète ──────────────────────────
  const pack2 = await packRepo.save({
    name: 'Pack Barbe Complète',
    slug: 'pack-barbe-complete',
    description: 'Kit complet pour entretenir et sublimer sa barbe',
    basePrice: 25000,
    discountPct: 8,
    isCustomizable: true,
    categoryId: catBarbe.id,
  });

  await packProductRepo.save([
    {
      packId: pack2.id,
      productId: byName('Huile de Barbe Premium').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 0,
    },
    {
      packId: pack2.id,
      productId: byName('Baume à Barbe Hydratant').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 1,
    },
    {
      packId: pack2.id,
      productId: byName('Peigne à Barbe Bois de Santal').id,
      quantity: 1,
      isOptional: true,
      sortOrder: 2,
    },
  ]);

  // ─── Pack 3 : Soin Capillaire ─────────────────────────
  const pack3 = await packRepo.save({
    name: 'Pack Soin Capillaire',
    slug: 'pack-soin-capillaire',
    description: 'Routine capillaire complète pour cheveux en santé',
    basePrice: 19000,
    discountPct: 5,
    isCustomizable: true,
    categoryId: catCapillaire.id,
  });

  await packProductRepo.save([
    {
      packId: pack3.id,
      productId: byName('Shampoing Homme Anti-Pelliculaire').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 0,
    },
    {
      packId: pack3.id,
      productId: byName('Huile de Coco Capillaire').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 1,
    },
    {
      packId: pack3.id,
      productId: byName('Cire Coiffante Mate').id,
      quantity: 1,
      isOptional: true,
      sortOrder: 2,
    },
  ]);

  // ─── Pack 4 : Barbier Débutant ────────────────────────
  const pack4 = await packRepo.save({
    name: 'Pack Barbier Débutant',
    slug: 'pack-barbier-debutant',
    description: 'L\'essentiel pour commencer sa pratique de barbier',
    basePrice: 52000,
    discountPct: 12,
    isCustomizable: true,
    categoryId: catRasage.id,
  });

  await packProductRepo.save([
    {
      packId: pack4.id,
      productId: byName('Tondeuse Professionnelle Wahl').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 0,
    },
    {
      packId: pack4.id,
      productId: byName('Mousse à Raser Premium').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 1,
    },
    {
      packId: pack4.id,
      productId: byName('Huile de Barbe Premium').id,
      quantity: 1,
      isOptional: true,
      sortOrder: 2,
    },
    {
      packId: pack4.id,
      productId: byName('Cire Coiffante Mate').id,
      quantity: 1,
      isOptional: true,
      sortOrder: 3,
    },
  ]);

  // ─── Pack 5 : Look Complet ────────────────────────────
  const pack5 = await packRepo.save({
    name: 'Pack Look Complet',
    slug: 'pack-look-complet',
    description: 'Le pack ultime pour un style impeccable de la tête aux pieds',
    basePrice: 78000,
    discountPct: 15,
    isCustomizable: true,
    categoryId: catCapillaire.id,
  });

  await packProductRepo.save([
    {
      packId: pack5.id,
      productId: byName('Tondeuse Professionnelle Wahl').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 0,
    },
    {
      packId: pack5.id,
      productId: byName('Shampoing Homme Anti-Pelliculaire').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 1,
    },
    {
      packId: pack5.id,
      productId: byName('Huile de Barbe Premium').id,
      quantity: 1,
      isOptional: false,
      sortOrder: 2,
    },
    {
      packId: pack5.id,
      productId: byName('Baume à Barbe Hydratant').id,
      quantity: 1,
      isOptional: true,
      sortOrder: 3,
    },
    {
      packId: pack5.id,
      productId: byName('Cire Coiffante Mate').id,
      quantity: 1,
      isOptional: true,
      sortOrder: 4,
    },
    {
      packId: pack5.id,
      productId: byName('Huile de Coco Capillaire').id,
      quantity: 1,
      isOptional: true,
      sortOrder: 5,
    },
  ]);

  console.log(`✅ 5 packs créés avec leurs produits\n`);

  // ─── Résumé final ─────────────────────────────────────
  console.log('═══════════════════════════════════════════');
  console.log('🎉 Seeder terminé avec succès !');
  console.log('═══════════════════════════════════════════');
  console.log(`📂 Catégories : ${categories.length}`);
  console.log(`📦 Produits   : ${products.length}`);
  console.log(`🎁 Packs      : 5`);
  console.log('═══════════════════════════════════════════');
  console.log('\n📋 Slugs disponibles pour test :');
  console.log('   GET /api/v1/packs/pack-rasage-pro');
  console.log('   GET /api/v1/packs/pack-barbe-complete');
  console.log('   GET /api/v1/packs/pack-soin-capillaire');
  console.log('   GET /api/v1/packs/pack-barbier-debutant');
  console.log('   GET /api/v1/packs/pack-look-complet');

  await AppDataSource.destroy();
  process.exit(0);
}

seed().catch((err: unknown) => {
  console.error('❌ Erreur seeder :', err);
  process.exit(1);
});