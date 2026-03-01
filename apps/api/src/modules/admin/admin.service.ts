// .\.\apps\api\src\modules\admin\admin.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../packs/entities/product.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { QueryCalendarDto } from './dto/query-calendar.dto';
import { QueryExportDto } from './dto/query-export.dto';

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
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  // ─── GET /admin/stats ─────────────────────────────────
  async getStats(): Promise<{
    totalUsers:     number;
    totalOrders:    number;
    totalRevenue:   number;
    totalBookings:  number;
    newUsersThisMonth: number;
    monthlyRevenue: { month: string; amount: number }[];
    topPacks:       { name: string; totalSold: number; revenue: number }[];
  }> {
    // Totaux simples
    const totalUsers    = await this.userRepo.count();
    const totalOrders   = await this.orderRepo.count();
    const totalBookings = await this.bookingRepo.count();

    // Revenu total (commandes livrées ou traitées)
    const revenueResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.totalAmount)', 'total')
      .where('order.status NOT IN (:...excluded)', {
        excluded: [OrderStatus.CANCELLED],
      })
      .getRawOne<{ total: string }>();
    const totalRevenue = Number(revenueResult?.total ?? 0);

    // Nouveaux utilisateurs ce mois
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    firstDayOfMonth.setHours(0, 0, 0, 0);
    const newUsersThisMonth = await this.userRepo.count({
      where: { createdAt: Between(firstDayOfMonth, new Date()) },
    });

    // CA mensuel sur 12 derniers mois
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

    // Top 5 packs vendus
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
      totalUsers,
      totalOrders,
      totalRevenue,
      totalBookings,
      newUsersThisMonth,
      monthlyRevenue: monthlyRevenue.map((r) => ({
        month:  r.month,
        amount: Number(r.amount),
      })),
      topPacks: topPacks.map((p) => ({
        name:      p.name,
        totalSold: Number(p.totalSold),
        revenue:   Number(p.revenue),
      })),
    };
  }

  // ─── GET /admin/users ─────────────────────────────────
  async getUserList(dto: QueryUsersDto): Promise<{
    data:  User[];
    total: number;
    page:  number;
  }> {
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

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page };
  }

  // ─── PATCH /admin/users/:id ───────────────────────────
  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    if (dto.role     !== undefined) user.role     = dto.role;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;

    const saved = await this.userRepo.save(user);
    this.logger.log(`✏️  User ${id} mis à jour: ${JSON.stringify(dto)}`);
    return saved;
  }

  // ─── GET /admin/products/stock ────────────────────────
  async getStockAlerts(threshold = 10): Promise<{
    products:   (Product & { isLowStock: boolean; isCritical: boolean })[];
    lowCount:   number;
    critCount:  number;
  }> {
    const products = await this.productRepo.find({
      order: { stockQty: 'ASC' },
    });

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

  // ─── PATCH /admin/products/:id/stock ─────────────────
  async updateStock(
    productId: string,
    dto:       UpdateStockDto,
    adminId:   string,
  ): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException('Produit introuvable');

    const previousQty = product.stockQty;
    product.stockQty  = dto.quantity;
    const saved        = await this.productRepo.save(product);

    // Audit log
    await this.auditRepo.save(
      this.auditRepo.create({
        userId:     adminId,
        action:     'STOCK_UPDATE',
        entityType: 'Product',
        entityId:   productId,
        metadata:   {
          previousQty,
          newQty:    dto.quantity,
          delta:     dto.quantity - previousQty,
          reason:    dto.reason ?? 'Non spécifié',
          productName: product.name,
        },
      }),
    );

    this.logger.log(
      `📦 Stock ${product.name}: ${previousQty} → ${dto.quantity} (${dto.reason ?? 'N/A'})`,
    );

    return saved;
  }

  // ─── GET /admin/bookings/calendar ────────────────────
  async getBookingCalendar(dto: QueryCalendarDto): Promise<{
    weekStart: string;
    weekEnd:   string;
    days:      {
      date:     string;
      bookings: Booking[];
    }[];
  }> {
    const weekStart = dto.weekStart
      ? new Date(dto.weekStart)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() - d.getDay() + 1); // Lundi
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
        start: weekStart.toISOString(),
        end:   weekEnd.toISOString(),
      })
      .orderBy('booking.bookedAt', 'ASC');

    if (dto.staffId) {
      qb.andWhere('booking.staffId = :staffId', { staffId: dto.staffId });
    }

    const bookings = await qb.getMany();

    // Grouper par jour
    const days: { date: string; bookings: Booking[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(day.getDate() + i);
      const dateStr = day.toISOString().split('T')[0];

      const dayBookings = bookings.filter((b) => {
        return new Date(b.bookedAt).toISOString().split('T')[0] === dateStr;
      });

      days.push({ date: dateStr, bookings: dayBookings });
    }

    return {
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd:   weekEnd.toISOString().split('T')[0],
      days,
    };
  }

  // ─── GET /admin/export/orders ─────────────────────────
  async exportOrdersCsv(dto: QueryExportDto): Promise<string> {
    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.pack', 'pack')
      .orderBy('order.createdAt', 'DESC');

    if (dto.from) {
      qb.andWhere('order.createdAt >= :from', { from: new Date(dto.from) });
    }
    if (dto.to) {
      qb.andWhere('order.createdAt <= :to', { to: new Date(`${dto.to}T23:59:59`) });
    }

    const orders = await qb.getMany();

    // Construire CSV manuellement (compatible sans dépendance externe)
    const headers = [
      'Numéro commande', 'Date', 'Statut', 'Montant total (XOF)',
      'Nb articles', 'Client ID',
    ];

    const rows = orders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toLocaleDateString('fr-SN'),
      o.status,
      Number(o.totalAmount).toFixed(0),
      o.items?.length ?? 0,
      o.userId,
    ]);

    const csvLines = [
      headers.join(';'),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(';')),
    ];

    return csvLines.join('\n');
  }
}