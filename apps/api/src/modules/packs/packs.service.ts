// .\.\apps\api\src\modules\packs\packs.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pack } from './entities/pack.entity';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { PackProduct } from './entities/pack-product.entity';
import { CreatePackDto } from './dto/create-pack.dto';
import { UpdatePackDto } from './dto/update-pack.dto';
import { CalculatePackDto } from './dto/calculate-pack.dto';
import { QueryPackDto } from './dto/query-pack.dto';

@Injectable()
export class PacksService {
  constructor(
    @InjectRepository(Pack)
    private readonly packRepository: Repository<Pack>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(PackProduct)
    private readonly packProductRepository: Repository<PackProduct>,
  ) {}

  // ─── GET /packs ───────────────────────────────────────────
  async findAll(query: QueryPackDto): Promise<{
    data: (Pack & { finalPrice: number })[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.packRepository
      .createQueryBuilder('pack')
      .leftJoinAndSelect('pack.category', 'category')
      .leftJoinAndSelect('pack.packProducts', 'packProducts')
      .leftJoinAndSelect('packProducts.product', 'product')
      .where('pack.isActive = :isActive', { isActive: true });

    if (query.category) {
      qb.andWhere('category.slug = :slug', { slug: query.category });
    }

    // ✅ Recherche textuelle
    if (query.search?.trim()) {
      qb.andWhere(
        '(pack.name ILIKE :search OR pack.description ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    // ✅ Tri dynamique
    const sortField =
      query.sortBy === 'price'   ? 'pack.basePrice'  :
      query.sortBy === 'rating'  ? 'pack.avgRating'  :
      'pack.createdAt';

    qb.orderBy(sortField, query.order ?? 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    // ✅ Ajout du finalPrice sur chaque pack
    const dataWithFinalPrice = data.map((pack) => ({
      ...pack,
      finalPrice: this.computeFinalPrice(
        Number(pack.basePrice),
        Number(pack.discountPct),
      ),
    }));

    return { data: dataWithFinalPrice, total, page, limit };
  }

  // ─── GET /packs/:slug ─────────────────────────────────────
  async findBySlug(slug: string): Promise<Pack & { finalPrice: number }> {
    const pack = await this.packRepository.findOne({
      where: { slug, isActive: true },
      relations: ['packProducts', 'packProducts.product', 'category'],
    });

    if (!pack) {
      throw new NotFoundException(`Pack "${slug}" introuvable`);
    }

    const finalPrice = this.computeFinalPrice(
      Number(pack.basePrice),
      Number(pack.discountPct),
    );

    return { ...pack, finalPrice };
  }

  // ─── POST /packs/:id/calculate ────────────────────────────
  async calculatePackPrice(
    packId: string,
    dto: CalculatePackDto,
  ): Promise<{
    basePrice: number;
    totalPrice: number;
    discountAmount: number;
    finalPrice: number;
    breakdown: {
      included: { name: string; unitPrice: number; quantity: number }[];
      added: { name: string; unitPrice: number; quantity: number }[];
      removed: { name: string; unitPrice: number }[];
    };
  }> {
    const pack = await this.packRepository.findOne({
      where: { id: packId, isActive: true },
      relations: ['packProducts', 'packProducts.product'],
    });

    if (!pack) throw new NotFoundException(`Pack introuvable`);

    // Vérifier que les removals sont bien des produits optionnels
    if (dto.removals && dto.removals.length > 0) {
      for (const productId of dto.removals) {
        const pp = pack.packProducts.find((p) => p.productId === productId);
        if (!pp) {
          throw new BadRequestException(
            `Produit ${productId} n'appartient pas à ce pack`,
          );
        }
        if (!pp.isOptional) {
          throw new BadRequestException(
            `Le produit "${pp.product.name}" est obligatoire et ne peut pas être retiré`,
          );
        }
      }
    }

    // Calculer le prix de base des produits inclus (après removals)
    const includedItems: { name: string; unitPrice: number; quantity: number }[] = [];
    let totalPrice = 0;

    for (const pp of pack.packProducts) {
      if (dto.removals?.includes(pp.productId)) continue;
      const itemTotal = Number(pp.product.unitPrice) * pp.quantity;
      totalPrice += itemTotal;
      includedItems.push({
        name: pp.product.name,
        unitPrice: Number(pp.product.unitPrice),
        quantity: pp.quantity,
      });
    }

    // Ajouter les produits additionnels
    const addedItems: { name: string; unitPrice: number; quantity: number }[] = [];
    if (dto.additions && dto.additions.length > 0) {
      const addedProducts = await this.productRepository.findByIds(
        dto.additions,
      );
      for (const product of addedProducts) {
        totalPrice += Number(product.unitPrice);
        addedItems.push({
          name: product.name,
          unitPrice: Number(product.unitPrice),
          quantity: 1,
        });
      }
    }

    // Produits retirés (pour le breakdown)
    const removedItems: { name: string; unitPrice: number }[] = [];
    if (dto.removals) {
      for (const productId of dto.removals) {
        const pp = pack.packProducts.find((p) => p.productId === productId);
        if (pp) {
          removedItems.push({
            name: pp.product.name,
            unitPrice: Number(pp.product.unitPrice),
          });
        }
      }
    }

    const discountAmount = (totalPrice * Number(pack.discountPct)) / 100;
    const finalPrice = Math.round(totalPrice - discountAmount);

    return {
      basePrice: Number(pack.basePrice),
      totalPrice: Math.round(totalPrice),
      discountAmount: Math.round(discountAmount),
      finalPrice,
      breakdown: {
        included: includedItems,
        added: addedItems,
        removed: removedItems,
      },
    };
  }

  // ─── POST /packs (admin) ──────────────────────────────────
  async create(dto: CreatePackDto): Promise<Pack> {
    // Vérifier unicité du slug
    const existing = await this.packRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new BadRequestException(`Le slug "${dto.slug}" est déjà utilisé`);
    }

    const pack = this.packRepository.create({
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      basePrice: dto.basePrice,
      discountPct: dto.discountPct ?? 0,
      isCustomizable: dto.isCustomizable ?? true,
      categoryId: dto.categoryId,
    });

    const savedPack = await this.packRepository.save(pack);

    // Ajouter les produits si fournis
    if (dto.products && dto.products.length > 0) {
      const packProducts = dto.products.map((p, index) =>
        this.packProductRepository.create({
          packId: savedPack.id,
          productId: p.productId,
          quantity: p.quantity,
          isOptional: p.isOptional ?? false,
          sortOrder: index,
        }),
      );
      await this.packProductRepository.save(packProducts);
    }

    return this.packRepository.findOneOrFail({
      where: { id: savedPack.id },
      relations: ['packProducts', 'packProducts.product', 'category'],
    });
  }

  // ─── PATCH /packs/:id (admin) ─────────────────────────────
  async update(id: string, dto: UpdatePackDto): Promise<Pack> {
    const pack = await this.packRepository.findOne({ where: { id } });
    if (!pack) throw new NotFoundException(`Pack introuvable`);

    Object.assign(pack, {
      ...(dto.name && { name: dto.name }),
      ...(dto.slug && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
      ...(dto.discountPct !== undefined && { discountPct: dto.discountPct }),
      ...(dto.isCustomizable !== undefined && {
        isCustomizable: dto.isCustomizable,
      }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
    });

    return this.packRepository.save(pack);
  }

  // ─── GET /products ────────────────────────────────────────
  async findAllProducts(categoryId?: string): Promise<Product[]> {
    const where: Record<string, unknown> = { isActive: true };
    if (categoryId) where['categoryId'] = categoryId;

    return this.productRepository.find({
      where,
      relations: ['category'],
      order: { name: 'ASC' },
    });
  }

  // ─── GET /categories ──────────────────────────────────────
  async findAllCategories(): Promise<Category[]> {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  // ─── Helper : calcul prix final ───────────────────────────
  computeFinalPrice(basePrice: number, discountPct: number): number {
    const discount = (basePrice * discountPct) / 100;
    return Math.round(basePrice - discount);
  }
}