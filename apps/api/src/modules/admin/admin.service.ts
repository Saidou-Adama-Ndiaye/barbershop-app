// apps\api\src\modules\admin\admin.service.ts
import {
  Injectable, Logger, NotFoundException,
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../packs/entities/product.entity';
import { Category } from '../packs/entities/category.entity';
import { Pack } from '../packs/entities/pack.entity';
import { PackProduct } from '../packs/entities/pack-product.entity';
import { Service } from '../services/entities/service.entity';
import { Formation } from '../formations/entities/formation.entity';
import { Video } from '../formations/entities/video.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { MinioService } from '../storage/minio.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { QueryCalendarDto } from './dto/query-calendar.dto';
import { QueryExportDto } from './dto/query-export.dto';

// ─── DTOs inline Admin CRUD ───────────────────────────────
export interface CreateCategoryDto {
  name:        string;
  slug:        string;
  description?: string;
  parentId?:   string;
  sortOrder?:  number;
  isActive?:   boolean;
}

export interface UpdateCategoryDto extends Partial<CreateCategoryDto> {}

export interface CreateProductDto {
  name:        string;
  description?: string;
  unitPrice:   number;
  stockQty?:   number;
  sku?:        string;
  categoryId?: string;
  isActive?:   boolean;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {}

export interface CreatePackAdminDto {
  name:           string;
  slug:           string;
  description?:   string;
  basePrice:      number;
  discountPct?:   number;
  isCustomizable?: boolean;
  categoryId?:    string;
  isActive?:      boolean;
}

export interface UpdatePackAdminDto extends Partial<CreatePackAdminDto> {}

export interface PackProductDto {
  productId:  string;
  quantity?:  number;
  isOptional?: boolean;
  sortOrder?:  number;
}

export interface CreateServiceDto {
  name:        string;
  description?: string;
  price:       number;
  durationMin: number;
  depositPct?: number;
  inclusions?: string[];
  isActive?:   boolean;
}

export interface UpdateServiceDto extends Partial<CreateServiceDto> {}

export interface CreateFormationAdminDto {
  title:        string;
  slug:         string;
  description?: string;
  price:        number;
  level:        string;
  language?:    string;
  tags?:        string[];
  isPublished?: boolean;
}

export interface UpdateFormationAdminDto extends Partial<CreateFormationAdminDto> {}

export interface CreateVideoDto {
  title:          string;
  description?:   string;
  sortOrder?:     number;
  isFreePreview?: boolean;
  durationSec?:   number;
}

export interface UpdateVideoDto extends Partial<CreateVideoDto> {}

export interface QueryAuditLogsDto {
  userId?:     string;
  action?:     string;
  entityType?: string;
  from?:       string;
  to?:         string;
  page?:       number;
  limit?:      number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Pack)
    private readonly packRepo: Repository<Pack>,
    @InjectRepository(PackProduct)
    private readonly packProductRepo: Repository<PackProduct>,
    @InjectRepository(Service)
    private readonly serviceRepo: Repository<Service>,
    @InjectRepository(Formation)
    private readonly formationRepo: Repository<Formation>,
    @InjectRepository(Video)
    private readonly videoRepo: Repository<Video>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly minioService: MinioService,
  ) {}

  // ════════════════════════════════════════════════════════
  // ─── STATS & DASHBOARD ───────────────────────────────
  // ════════════════════════════════════════════════════════

  async getStats(): Promise<{
    totalUsers:     number;
    totalOrders:    number;
    totalRevenue:   number;
    totalBookings:  number;
    newUsersThisMonth: number;
    monthlyRevenue: { month: string; amount: number }[];
    topPacks:       { name: string; totalSold: number; revenue: number }[];
  }> {
    const totalUsers    = await this.userRepo.count();
    const totalOrders   = await this.orderRepo.count();
    const totalBookings = await this.bookingRepo.count();

    const revenueResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status NOT IN (:...excluded)', {
        excluded: [OrderStatus.CANCELLED],
      })
      .getRawOne<{ total: string }>();
    const totalRevenue = Number(revenueResult?.total ?? 0);

    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const newUsersThisMonth = await this.userRepo.count({
      where: { createdAt: Between(firstDayOfMonth, new Date()) },
    });

    const monthlyRevenue = await this.orderRepo
      .createQueryBuilder('order')
      .select("TO_CHAR(order.createdAt, 'YYYY-MM')", 'month')
      .addSelect('SUM(order.totalAmount)', 'amount')
      .where('order.createdAt >= NOW() - INTERVAL \'12 months\'')
      .andWhere('order.status NOT IN (:...excluded)', {
        excluded: [OrderStatus.CANCELLED],
      })
      .groupBy("TO_CHAR(order.createdAt, 'YYYY-MM')")
      .orderBy("TO_CHAR(order.createdAt, 'YYYY-MM')", 'ASC')
      .getRawMany<{ month: string; amount: string }>();

    const topPacks = await this.orderRepo
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .innerJoin('item.pack', 'pack')
      .select('pack.name', 'name')
      .addSelect('SUM(item.quantity)', 'totalSold')
      .addSelect('SUM(item.quantity * item.unitPrice)', 'revenue')
      .where('order.status NOT IN (:...excluded)', {
        excluded: [OrderStatus.CANCELLED],
      })
      .groupBy('pack.name')
      .orderBy('SUM(item.quantity)', 'DESC')
      .limit(5)
      .getRawMany<{ name: string; totalSold: string; revenue: string }>();

    return {
      totalUsers, totalOrders, totalRevenue, totalBookings, newUsersThisMonth,
      monthlyRevenue: monthlyRevenue.map((r) => ({ month: r.month, amount: Number(r.amount) })),
      topPacks: topPacks.map((p) => ({
        name: p.name, totalSold: Number(p.totalSold), revenue: Number(p.revenue),
      })),
    };
  }

  // ════════════════════════════════════════════════════════
  // ─── USERS ───────────────────────────────────────────
  // ════════════════════════════════════════════════════════

  async getUserList(dto: QueryUsersDto): Promise<{ data: User[]; total: number; page: number }> {
    const { search, role, page = 1, limit = 20 } = dto;
    const qb = this.userRepo
      .createQueryBuilder('user')
      .select([
        'user.id', 'user.email', 'user.firstName', 'user.lastName',
        'user.role', 'user.isActive', 'user.createdAt',
      ])
      .orderBy('user.createdAt', 'DESC');

    if (search) {
      qb.andWhere(
        '(user.email ILIKE :search OR user.firstName ILIKE :search OR user.lastName ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (role) qb.andWhere('user.role = :role', { role });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page };
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (dto.role     !== undefined) user.role     = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    return this.userRepo.save(user);
  }

  // ─── Créer un coiffeur ────────────────────────────────
  async createCoiffeur(data: {
    email:     string;
    firstName: string;
    lastName:  string;
    phone?:    string;
    password:  string;
  }): Promise<User> {
    const existing = await this.userRepo.findOne({ where: { email: data.email } });
    if (existing) throw new ConflictException('Email déjà utilisé');

    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const coiffeur = this.userRepo.create({
      email:          data.email,
      firstName:      data.firstName,
      lastName:       data.lastName,
      phone:          data.phone,
      passwordHash:   hashedPassword,
      role:           UserRole.COIFFEUR,
      isActive:       true,
      isVerified:     true,
    });
    return this.userRepo.save(coiffeur);
  }

  // ─── Stats coiffeurs ──────────────────────────────────
  async getCoiffeursStats(): Promise<{
    coiffeurs: {
      id:          string;
      firstName:   string;
      lastName:    string;
      email:       string;
      isActive:    boolean;
      totalRdv:    number;
      completedRdv: number;
      noShowRdv:   number;
      revenue:     number;
    }[];
  }> {
    const coiffeurs = await this.userRepo.find({
      where: { role: UserRole.COIFFEUR },
      select: ['id', 'firstName', 'lastName', 'email', 'isActive'],
      order: { firstName: 'ASC' },
    });

    const enriched = await Promise.all(
      coiffeurs.map(async (c) => {
        const bookings = await this.bookingRepo.find({ where: { staffId: c.id } });
        const completedRdv = bookings.filter((b) => b.status === 'completed').length;
        const noShowRdv    = bookings.filter((b) => b.status === 'no_show').length;
        const revenue      = bookings
          .filter((b) => b.status === 'completed')
          .reduce((sum, b) => sum + Number(b.totalPrice), 0);

        return {
          id:           c.id,
          firstName:    c.firstName,
          lastName:     c.lastName,
          email:        c.email,
          isActive:     c.isActive,
          totalRdv:     bookings.length,
          completedRdv,
          noShowRdv,
          revenue,
        };
      }),
    );

    return { coiffeurs: enriched };
  }

  // ════════════════════════════════════════════════════════
  // ─── CATEGORIES ──────────────────────────────────────
  // ════════════════════════════════════════════════════════

  async findAllCategories(): Promise<Category[]> {
    return this.categoryRepo.find({
      relations: ['parent', 'children'],
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async createCategory(
    dto:    CreateCategoryDto,
    image?: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<Category> {
    const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" déjà utilisé`);

    let imageUrl: string | undefined;
    if (image) {
      const key = this.minioService.generateKey('categories', image.originalname);
      await this.minioService.uploadFile(image.buffer, this.minioService.BUCKET_IMAGES, key, image.mimetype);
      imageUrl = key;
    }

    const category = this.categoryRepo.create({
      name:        dto.name,
      slug:        dto.slug,
      description: dto.description,
      parentId:    dto.parentId,
      sortOrder:   dto.sortOrder ?? 0,
      isActive:    dto.isActive ?? true,
      imageUrl,
    });

    return this.categoryRepo.save(category);
  }

  async updateCategory(
    id:     string,
    dto:    UpdateCategoryDto,
    image?: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Catégorie introuvable');

    if (dto.slug && dto.slug !== category.slug) {
      const existing = await this.categoryRepo.findOne({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException(`Slug "${dto.slug}" déjà utilisé`);
    }

    if (image) {
      // Supprimer l'ancienne image
      if (category.imageUrl) {
        await this.minioService.deleteFile(this.minioService.BUCKET_IMAGES, category.imageUrl).catch(() => {});
      }
      const key = this.minioService.generateKey('categories', image.originalname);
      await this.minioService.uploadFile(image.buffer, this.minioService.BUCKET_IMAGES, key, image.mimetype);
      category.imageUrl = key;
    }

    Object.assign(category, {
      ...(dto.name        !== undefined && { name:        dto.name        }),
      ...(dto.slug        !== undefined && { slug:        dto.slug        }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.parentId    !== undefined && { parentId:    dto.parentId    }),
      ...(dto.sortOrder   !== undefined && { sortOrder:   dto.sortOrder   }),
      ...(dto.isActive    !== undefined && { isActive:    dto.isActive    }),
    });

    return this.categoryRepo.save(category);
  }

  async deleteCategory(id: string): Promise<void> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('Catégorie introuvable');
    // Soft delete via isActive
    await this.categoryRepo.update(id, { isActive: false });
  }

  // ════════════════════════════════════════════════════════
  // ─── PRODUCTS ────────────────────────────────────────
  // ════════════════════════════════════════════════════════

  async findAllProductsAdmin(): Promise<Product[]> {
    return this.productRepo.find({
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  async createProduct(
    dto:    CreateProductDto,
    images?: { buffer: Buffer; mimetype: string; originalname: string }[],
  ): Promise<Product> {
    if (dto.sku) {
      const existing = await this.productRepo.findOne({ where: { sku: dto.sku } });
      if (existing) throw new ConflictException(`SKU "${dto.sku}" déjà utilisé`);
    }

    const imageUrls: string[] = [];
    if (images?.length) {
      for (const img of images) {
        const key = this.minioService.generateKey('products', img.originalname);
        await this.minioService.uploadFile(img.buffer, this.minioService.BUCKET_IMAGES, key, img.mimetype);
        imageUrls.push(key);
      }
    }

    const product = this.productRepo.create({
      name:        dto.name,
      description: dto.description,
      unitPrice:   dto.unitPrice,
      stockQty:    dto.stockQty ?? 0,
      sku:         dto.sku,
      categoryId:  dto.categoryId,
      isActive:    dto.isActive ?? true,
      imageUrls,
    });

    return this.productRepo.save(product);
  }

  async updateProduct(
    id:     string,
    dto:    UpdateProductDto,
    images?: { buffer: Buffer; mimetype: string; originalname: string }[],
  ): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Produit introuvable');

    if (dto.sku && dto.sku !== product.sku) {
      const existing = await this.productRepo.findOne({ where: { sku: dto.sku } });
      if (existing) throw new ConflictException(`SKU "${dto.sku}" déjà utilisé`);
    }

    if (images?.length) {
      const newUrls: string[] = [];
      for (const img of images) {
        const key = this.minioService.generateKey('products', img.originalname);
        await this.minioService.uploadFile(img.buffer, this.minioService.BUCKET_IMAGES, key, img.mimetype);
        newUrls.push(key);
      }
      product.imageUrls = [...(product.imageUrls ?? []), ...newUrls];
    }

    Object.assign(product, {
      ...(dto.name        !== undefined && { name:        dto.name        }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.unitPrice   !== undefined && { unitPrice:   dto.unitPrice   }),
      ...(dto.stockQty    !== undefined && { stockQty:    dto.stockQty    }),
      ...(dto.sku         !== undefined && { sku:         dto.sku         }),
      ...(dto.categoryId  !== undefined && { categoryId:  dto.categoryId  }),
      ...(dto.isActive    !== undefined && { isActive:    dto.isActive    }),
    });

    return this.productRepo.save(product);
  }

  async deleteProduct(id: string): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Produit introuvable');
    await this.productRepo.update(id, { isActive: false });
  }

  // ════════════════════════════════════════════════════════
  // ─── STOCK ───────────────────────────────────────────
  // ════════════════════════════════════════════════════════

  async getStockAlerts(threshold = 10): Promise<{
    products:  (Product & { isLowStock: boolean; isCritical: boolean })[];
    lowCount:  number;
    critCount: number;
  }> {
    const products = await this.productRepo.find({ order: { stockQty: 'ASC' } });
    const enriched = products.map((p) => ({
      ...p,
      isLowStock: p.stockQty < threshold,
      isCritical: p.stockQty < 5,
    }));
    return {
      products:  enriched,
      lowCount:  enriched.filter((p) => p.isLowStock && !p.isCritical).length,
      critCount: enriched.filter((p) => p.isCritical).length,
    };
  }

  async updateStock(productId: string, dto: UpdateStockDto, adminId: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');

    const previousQty = product.stockQty;
    product.stockQty  = dto.quantity;
    const saved        = await this.productRepo.save(product);

    await this.auditRepo.save(this.auditRepo.create({
      userId: adminId, action: 'STOCK_UPDATE', entityType: 'Product', entityId: productId,
      metadata: { previousQty, newQty: dto.quantity, delta: dto.quantity - previousQty, reason: dto.reason ?? 'Non spécifié', productName: product.name },
    }));

    return saved;
  }

  // ════════════════════════════════════════════════════════
  // ─── PACKS ───────────────────────────────────────────
  // ════════════════════════════════════════════════════════

  async findAllPacksAdmin(): Promise<Pack[]> {
    return this.packRepo.find({
      relations: ['category', 'packProducts', 'packProducts.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async createPackAdmin(dto: CreatePackAdminDto): Promise<Pack> {
    const existing = await this.packRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" déjà utilisé`);

    const pack = this.packRepo.create({
      name:           dto.name,
      slug:           dto.slug,
      description:    dto.description,
      basePrice:      dto.basePrice,
      discountPct:    dto.discountPct ?? 0,
      isCustomizable: dto.isCustomizable ?? true,
      categoryId:     dto.categoryId,
      isActive:       dto.isActive ?? true,
    });

    return this.packRepo.save(pack);
  }

  async updatePackAdmin(id: string, dto: UpdatePackAdminDto): Promise<Pack> {
    const pack = await this.packRepo.findOne({ where: { id } });
    if (!pack) throw new NotFoundException('Pack introuvable');

    if (dto.slug && dto.slug !== pack.slug) {
      const existing = await this.packRepo.findOne({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException(`Slug "${dto.slug}" déjà utilisé`);
    }

    Object.assign(pack, {
      ...(dto.name           !== undefined && { name:           dto.name           }),
      ...(dto.slug           !== undefined && { slug:           dto.slug           }),
      ...(dto.description    !== undefined && { description:    dto.description    }),
      ...(dto.basePrice      !== undefined && { basePrice:      dto.basePrice      }),
      ...(dto.discountPct    !== undefined && { discountPct:    dto.discountPct    }),
      ...(dto.isCustomizable !== undefined && { isCustomizable: dto.isCustomizable }),
      ...(dto.categoryId     !== undefined && { categoryId:     dto.categoryId     }),
      ...(dto.isActive       !== undefined && { isActive:       dto.isActive       }),
    });

    return this.packRepo.save(pack);
  }

  async deletePackAdmin(id: string): Promise<void> {
    const pack = await this.packRepo.findOne({ where: { id } });
    if (!pack) throw new NotFoundException('Pack introuvable');
    // Soft delete
    await this.packRepo.update(id, { isActive: false });
  }

  async addProductToPack(packId: string, dto: PackProductDto): Promise<PackProduct> {
    const pack = await this.packRepo.findOne({ where: { id: packId } });
    if (!pack) throw new NotFoundException('Pack introuvable');

    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Produit introuvable');

    const existing = await this.packProductRepo.findOne({
      where: { packId, productId: dto.productId },
    });
    if (existing) {
      // Mettre à jour si déjà présent
      await this.packProductRepo.update(existing.id, {
        quantity:   dto.quantity   ?? existing.quantity,
        isOptional: dto.isOptional ?? existing.isOptional,
        sortOrder:  dto.sortOrder  ?? existing.sortOrder,
      });
      return this.packProductRepo.findOneOrFail({ where: { id: existing.id }, relations: ['product'] });
    }

    const pp = this.packProductRepo.create({
      packId,
      productId:  dto.productId,
      quantity:   dto.quantity   ?? 1,
      isOptional: dto.isOptional ?? false,
      sortOrder:  dto.sortOrder  ?? 0,
    });

    return this.packProductRepo.save(pp);
  }

  async removeProductFromPack(packId: string, productId: string): Promise<void> {
    const pp = await this.packProductRepo.findOne({ where: { packId, productId } });
    if (!pp) throw new NotFoundException('Produit non trouvé dans ce pack');
    await this.packProductRepo.delete(pp.id);
  }

  // ════════════════════════════════════════════════════════
  // ─── SERVICES ────────────────────────────────────────
  // ════════════════════════════════════════════════════════

  async findAllServicesAdmin(): Promise<Service[]> {
    return this.serviceRepo.find({ order: { price: 'ASC' } });
  }

  async createService(dto: CreateServiceDto): Promise<Service> {
    const service = this.serviceRepo.create({
      name:        dto.name,
      description: dto.description,
      price:       dto.price,
      durationMin: dto.durationMin,
      depositPct:  dto.depositPct ?? 30,
      inclusions:  dto.inclusions ?? [],
      isActive:    dto.isActive ?? true,
    });
    return this.serviceRepo.save(service);
  }

  async updateService(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.serviceRepo.findOne({ where: { id } });
    if (!service) throw new NotFoundException('Service introuvable');

    Object.assign(service, {
      ...(dto.name        !== undefined && { name:        dto.name        }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.price       !== undefined && { price:       dto.price       }),
      ...(dto.durationMin !== undefined && { durationMin: dto.durationMin }),
      ...(dto.depositPct  !== undefined && { depositPct:  dto.depositPct  }),
      ...(dto.inclusions  !== undefined && { inclusions:  dto.inclusions  }),
      ...(dto.isActive    !== undefined && { isActive:    dto.isActive    }),
    });

    return this.serviceRepo.save(service);
  }

  async deleteService(id: string): Promise<void> {
    const service = await this.serviceRepo.findOne({ where: { id } });
    if (!service) throw new NotFoundException('Service introuvable');
    await this.serviceRepo.update(id, { isActive: false });
  }

  // ════════════════════════════════════════════════════════
  // ─── FORMATIONS ──────────────────────────────────────
  // ════════════════════════════════════════════════════════

  async findAllFormationsAdmin(): Promise<Formation[]> {
    return this.formationRepo.find({
      relations: ['instructor'],
      order: { createdAt: 'DESC' },
    });
  }

  async createFormationAdmin(
    dto:        CreateFormationAdminDto,
    adminId:    string,
    thumbnail?: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<Formation> {
    const existing = await this.formationRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug "${dto.slug}" déjà utilisé`);

    let thumbnailUrl: string | undefined;
    if (thumbnail) {
      const key = this.minioService.generateKey('formations/thumbnails', thumbnail.originalname);
      await this.minioService.uploadFile(thumbnail.buffer, this.minioService.BUCKET_IMAGES, key, thumbnail.mimetype);
      thumbnailUrl = key;
    }

    const formation = this.formationRepo.create({
      title:        dto.title,
      slug:         dto.slug,
      description:  dto.description,
      price:        dto.price,
      level:        dto.level as any,
      language:     dto.language ?? 'fr',
      tags:         dto.tags ?? [],
      isPublished:  dto.isPublished ?? false,
      instructorId: adminId,
      thumbnailUrl,
    });

    return this.formationRepo.save(formation);
  }

  async updateFormationAdmin(
    id:         string,
    dto:        UpdateFormationAdminDto,
    thumbnail?: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<Formation> {
    const formation = await this.formationRepo.findOne({ where: { id } });
    if (!formation) throw new NotFoundException('Formation introuvable');

    if (dto.slug && dto.slug !== formation.slug) {
      const existing = await this.formationRepo.findOne({ where: { slug: dto.slug } });
      if (existing) throw new ConflictException(`Slug "${dto.slug}" déjà utilisé`);
    }

    if (thumbnail) {
      if (formation.thumbnailUrl) {
        await this.minioService.deleteFile(this.minioService.BUCKET_IMAGES, formation.thumbnailUrl).catch(() => {});
      }
      const key = this.minioService.generateKey('formations/thumbnails', thumbnail.originalname);
      await this.minioService.uploadFile(thumbnail.buffer, this.minioService.BUCKET_IMAGES, key, thumbnail.mimetype);
      formation.thumbnailUrl = key;
    }

    Object.assign(formation, {
      ...(dto.title       !== undefined && { title:       dto.title       }),
      ...(dto.slug        !== undefined && { slug:        dto.slug        }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.price       !== undefined && { price:       dto.price       }),
      ...(dto.level       !== undefined && { level:       dto.level       }),
      ...(dto.language    !== undefined && { language:    dto.language    }),
      ...(dto.tags        !== undefined && { tags:        dto.tags        }),
      ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
    });

    return this.formationRepo.save(formation);
  }

  async deleteFormationAdmin(id: string): Promise<void> {
    const formation = await this.formationRepo.findOne({ where: { id } });
    if (!formation) throw new NotFoundException('Formation introuvable');
    await this.formationRepo.update(id, { isPublished: false });
  }

  // ─── Vidéos ───────────────────────────────────────────

  async getVideos(formationId: string): Promise<Video[]> {
    const formation = await this.formationRepo.findOne({ where: { id: formationId } });
    if (!formation) throw new NotFoundException('Formation introuvable');

    return this.videoRepo.find({
      where:  { formationId },
      order:  { sortOrder: 'ASC' },
    });
  }

  async addVideo(
    formationId: string,
    dto:         CreateVideoDto,
    file:        { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<{ video: Video; videoId: string; durationSec: number }> {
    const formation = await this.formationRepo.findOne({ where: { id: formationId } });
    if (!formation) throw new NotFoundException('Formation introuvable');

    const key = this.minioService.generateKey(`formations/${formationId}/videos`, file.originalname);
    await this.minioService.uploadFile(file.buffer, this.minioService.BUCKET_VIDEOS, key, file.mimetype);

    const video = this.videoRepo.create({
      formationId,
      title:          dto.title,
      description:    dto.description,
      sortOrder:      dto.sortOrder ?? 0,
      isFreePreview:  dto.isFreePreview ?? false,
      durationSec:    dto.durationSec ?? 0,
      storageKey:     key,
    });

    const saved = await this.videoRepo.save(video);
    return { video: saved, videoId: saved.id, durationSec: saved.durationSec };
  }

  async updateVideo(
    formationId: string,
    videoId:     string,
    dto:         UpdateVideoDto,
  ): Promise<Video> {
    const video = await this.videoRepo.findOne({ where: { id: videoId, formationId } });
    if (!video) throw new NotFoundException('Vidéo introuvable');

    Object.assign(video, {
      ...(dto.title         !== undefined && { title:         dto.title         }),
      ...(dto.description   !== undefined && { description:   dto.description   }),
      ...(dto.sortOrder     !== undefined && { sortOrder:     dto.sortOrder     }),
      ...(dto.isFreePreview !== undefined && { isFreePreview: dto.isFreePreview }),
      ...(dto.durationSec   !== undefined && { durationSec:   dto.durationSec   }),
    });

    return this.videoRepo.save(video);
  }

  async deleteVideo(formationId: string, videoId: string): Promise<void> {
    const video = await this.videoRepo
      .createQueryBuilder('video')
      .addSelect('video.storageKey')
      .where('video.id = :videoId AND video.formationId = :formationId', { videoId, formationId })
      .getOne();

    if (!video) throw new NotFoundException('Vidéo introuvable');

    await this.minioService.deleteFile(this.minioService.BUCKET_VIDEOS, video.storageKey).catch(() => {});
    await this.videoRepo.delete(videoId);
  }

  // ════════════════════════════════════════════════════════
  // ─── AUDIT LOGS ──────────────────────────────────────
  // ════════════════════════════════════════════════════════

  async getAuditLogs(dto: QueryAuditLogsDto): Promise<{
    data:  AuditLog[];
    total: number;
    page:  number;
  }> {
    const { userId, action, entityType, from, to, page = 1, limit = 50 } = dto;

    const qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC');

    if (userId)     qb.andWhere('log.userId = :userId',           { userId         });
    if (action)     qb.andWhere('log.action ILIKE :action',       { action: `%${action}%` });
    if (entityType) qb.andWhere('log.entityType = :entityType',   { entityType     });
    if (from)       qb.andWhere('log.createdAt >= :from',         { from: new Date(from) });
    if (to)         qb.andWhere('log.createdAt <= :to',           { to: new Date(`${to}T23:59:59`) });

    const [data, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { data, total, page };
  }

  // ════════════════════════════════════════════════════════
  // ─── CALENDAR & EXPORT (conservés) ───────────────────
  // ════════════════════════════════════════════════════════

  async getBookingCalendar(dto: QueryCalendarDto): Promise<{
    weekStart: string;
    weekEnd:   string;
    days:      { date: string; bookings: Booking[] }[];
  }> {
    const weekStart = dto.weekStart
      ? new Date(dto.weekStart)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - d.getDay() + 1);
          d.setHours(0, 0, 0, 0);
          return d;
        })();

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const qb = this.bookingRepo
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.service', 'service')
      .where('booking.bookedAt BETWEEN :start AND :end', {
        start: weekStart.toISOString(), end: weekEnd.toISOString(),
      })
      .orderBy('booking.bookedAt', 'ASC');

    if (dto.staffId) qb.andWhere('booking.staffId = :staffId', { staffId: dto.staffId });

    const bookings = await qb.getMany();

    const days: { date: string; bookings: Booking[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];
      days.push({
        date:     dateStr,
        bookings: bookings.filter((b) => new Date(b.bookedAt).toISOString().split('T')[0] === dateStr),
      });
    }

    return {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd:   weekEnd.toISOString().split('T')[0],
      days,
    };
  }

  async exportOrdersCsv(dto: QueryExportDto): Promise<string> {
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.pack', 'pack')
      .orderBy('order.createdAt', 'DESC');

    if (dto.from) qb.andWhere('order.createdAt >= :from', { from: new Date(dto.from) });
    if (dto.to)   qb.andWhere('order.createdAt <= :to',   { to: new Date(`${dto.to}T23:59:59`) });

    const orders = await qb.getMany();
    const headers = ['Numéro commande', 'Date', 'Statut', 'Montant total (XOF)', 'Nb articles', 'Client ID'];
    const rows = orders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString('fr-SN'),
      o.status,
      Number(o.totalAmount).toFixed(0),
      o.items?.length ?? 0,
      o.userId,
    ]);

    return [headers.join(';'), ...rows.map((r) => r.map((v) => `"${v}"`).join(';'))].join('\n');
  }
}