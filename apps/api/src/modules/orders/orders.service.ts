// .\.\apps\api\src\modules\orders\orders.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Order, OrderStatus, ORDER_STATUS_TRANSITIONS } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Pack } from '../packs/entities/pack.entity';
import { Product } from '../packs/entities/product.entity';
import { AuditService } from '../audit/audit.service';
import { CouponsService } from '../coupons/coupons.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Pack)
    private readonly packRepository: Repository<Pack>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly couponsService: CouponsService,
  ) {}

  // ─── POST /orders ─────────────────────────────────────────
  async createOrder(userId: string, dto: CreateOrderDto): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;
      const orderItems: Partial<OrderItem>[] = [];

      for (const item of dto.items) {
        // 1. Charger le pack avec ses produits
        const pack = await manager.findOne(Pack, {
          where: { id: item.packId, isActive: true },
          relations: ['packProducts', 'packProducts.product'],
        });

        if (!pack) {
          throw new NotFoundException(`Pack ${item.packId} introuvable ou inactif`);
        }

        // 2. Vérifier le stock de chaque produit du pack
        for (const pp of pack.packProducts) {
          const neededQty = pp.quantity * item.quantity;
          const product = await manager.findOne(Product, {
            where: { id: pp.productId },
          });

          if (!product) {
            throw new NotFoundException(`Produit ${pp.productId} introuvable`);
          }

          if (product.stockQty < neededQty) {
            throw new BadRequestException(
              `Stock insuffisant pour "${product.name}" : disponible ${product.stockQty}, demandé ${neededQty}`,
            );
          }
        }

        // 3. Calculer le prix de l'item
        const discountAmount =
          (Number(pack.basePrice) * Number(pack.discountPct)) / 100;
        const finalPrice = Math.round(Number(pack.basePrice) - discountAmount);
        const itemTotal  = finalPrice * item.quantity;
        totalAmount += itemTotal;

        // 4. Snapshot immuable du pack
        const packSnapshot = {
          id:        pack.id,
          name:      pack.name,
          slug:      pack.slug,
          basePrice: Number(pack.basePrice),
          discountPct: Number(pack.discountPct),
          finalPrice,
          products: pack.packProducts.map((pp) => ({
            id:        pp.productId,
            name:      pp.product.name,
            unitPrice: Number(pp.product.unitPrice),
            quantity:  pp.quantity,
          })),
        };

        orderItems.push({
          packId:         pack.id,
          packSnapshot,
          quantity:       item.quantity,
          unitPrice:      finalPrice,
          customizations: item.customizations ?? {},
        });

        // 5. Décrémenter le stock
        for (const pp of pack.packProducts) {
          const neededQty = pp.quantity * item.quantity;
          await manager.decrement(
            Product,
            { id: pp.productId },
            'stockQty',
            neededQty,
          );
        }
      }

      // ─── NOUVEAU : Appliquer le coupon ─────────────────
      let couponCode: string | null     = null;
      let couponDiscount                = 0;

      if (dto.couponCode?.trim()) {
        const couponResult = await this.couponsService.applyCoupon(
          dto.couponCode.trim(),
          totalAmount,
        );
        couponDiscount = couponResult.discountAmount;
        couponCode     = dto.couponCode.trim().toUpperCase();
        totalAmount    = couponResult.finalAmount;
      }
      // ──────────────────────────────────────────────────

      // 6. Numéro de commande
      const orderNumber = await this.generateOrderNumber(manager);

      // 7. Créer la commande
      const order = manager.create(Order, {
        userId,
        orderNumber,
        totalAmount,
        currency:        'XOF',
        deliveryAddress: dto.deliveryAddress
          ? (dto.deliveryAddress as unknown as Record<string, unknown>)
          : undefined,
        notes:           dto.notes,
        status:          OrderStatus.PENDING,
        couponCode,
        discountAmount:  couponDiscount,
      });

      const savedOrder = await manager.save(Order, order);

      // 8. Créer les items
      const itemsToSave = orderItems.map((item) => ({
        ...item,
        orderId: savedOrder.id,
      }));
      await manager.save(OrderItem, itemsToSave);

      // 9. Audit log
      this.auditService.log({
        userId,
        action:     'CREATE_ORDER',
        entityType: 'Order',
        entityId:   savedOrder.id,
        metadata: {
          orderNumber,
          totalAmount,
          couponCode,
          discountAmount: couponDiscount,
          itemCount: dto.items.length,
        },
      });

      // 10. Retourner la commande complète
      return manager.findOneOrFail(Order, {
        where: { id: savedOrder.id },
        relations: ['items'],
      });
    });
  }

  // ─── GET /orders ──────────────────────────────────────────
  async findAll(userId: string, userRole: UserRole): Promise<Order[]> {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .orderBy('order.createdAt', 'DESC');

    if (userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      qb.where('order.userId = :userId', { userId });
    }

    return qb.getMany();
  }

  // ─── GET /orders/:id ──────────────────────────────────────
  async findOne(id: string, userId: string, userRole: UserRole): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) throw new NotFoundException(`Commande introuvable`);

    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
    if (!isAdmin && order.userId !== userId) {
      throw new ForbiddenException(`Accès refusé`);
    }

    return order;
  }

  // ─── PATCH /orders/:id/cancel ─────────────────────────────
  async cancelOrder(id: string, userId: string, userRole: UserRole): Promise<Order> {
    const order = await this.findOne(id, userId, userRole);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Impossible d'annuler une commande avec le statut "${order.status}"`,
      );
    }

    order.status = OrderStatus.CANCELLED;
    const saved = await this.orderRepository.save(order);

    this.auditService.log({
      userId,
      action:     'CANCEL_ORDER',
      entityType: 'Order',
      entityId:   id,
    });

    return saved;
  }

  // ─── PATCH /orders/:id/status (admin) ─────────────────────
  async updateStatus(id: string, dto: UpdateOrderStatusDto, userId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Commande introuvable`);

    const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(
        `Transition "${order.status}" → "${dto.status}" non autorisée. ` +
        `Transitions possibles : ${allowedTransitions.join(', ') || 'aucune'}`,
      );
    }

    order.status = dto.status;
    await this.orderRepository.save(order);

    this.auditService.log({
      userId,
      action:     'UPDATE_ORDER_STATUS',
      entityType: 'Order',
      entityId:   id,
      metadata:   { from: order.status, to: dto.status },
    });

    return this.orderRepository.findOneOrFail({
      where:     { id },
      relations: ['items'],
    });
  }

  // ─── Helper : générer order_number ────────────────────────
  private async generateOrderNumber(manager: EntityManager): Promise<string> {
    const year  = new Date().getFullYear();
    const count = await manager
      .createQueryBuilder(Order, 'order')
      .where('EXTRACT(YEAR FROM order.createdAt) = :year', { year })
      .getCount();

    const sequence = String(count + 1).padStart(5, '0');
    return `BS-${year}-${sequence}`;
  }
}