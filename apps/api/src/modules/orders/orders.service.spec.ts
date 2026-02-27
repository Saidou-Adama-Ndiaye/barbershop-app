import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Pack } from '../packs/entities/pack.entity';
import { Product } from '../packs/entities/product.entity';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

// ─── Données de test ──────────────────────────────────────

const mockPack = {
  id: 'pack-001',
  name: 'Pack Rasage Pro',
  slug: 'pack-rasage-pro',
  basePrice: 45000,
  discountPct: 10,
  isActive: true,
  packProducts: [
    {
      productId: 'prod-001',
      quantity: 1,
      product: { id: 'prod-001', name: 'Tondeuse Pro', unitPrice: 35000, stockQty: 5 },
    },
  ],
};

const mockPackNoStock = {
  ...mockPack,
  packProducts: [
    {
      productId: 'prod-001',
      quantity: 1,
      product: { id: 'prod-001', name: 'Tondeuse Pro', unitPrice: 35000, stockQty: 0 },
    },
  ],
};

const mockOrder = {
  id: 'order-001',
  userId: 'user-001',
  orderNumber: 'BS-2025-00001',
  status: OrderStatus.PENDING,
  totalAmount: 40500,
  currency: 'XOF',
  items: [],
  createdAt: new Date(),
};

// ─── Mocks ────────────────────────────────────────────────

const mockOrderRepository = {
  findOne: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockOrderItemRepository = {};

const mockPackRepository = {};

const mockProductRepository = {};

const mockAuditService = {
  log: jest.fn(),
};

// Mock du DataSource avec transaction
const mockQueryBuilder = {
  where: jest.fn().mockReturnThis(),
  getCount: jest.fn().mockResolvedValue(0),
};

const mockEntityManager = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  decrement: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  findOneOrFail: jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb) => cb(mockEntityManager)),
};

// ─── Tests ────────────────────────────────────────────────

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: mockOrderRepository },
        { provide: getRepositoryToken(OrderItem), useValue: mockOrderItemRepository },
        { provide: getRepositoryToken(Pack), useValue: mockPackRepository },
        { provide: getRepositoryToken(Product), useValue: mockProductRepository },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  // ─── createOrder() ────────────────────────────────────────

  describe('createOrder()', () => {
    it('✅ doit créer une commande et décrémenter le stock', async () => {
      // Setup manager mocks
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockPack)       // findOne(Pack)
        .mockResolvedValueOnce({ id: 'prod-001', stockQty: 5 }); // findOne(Product)
      mockEntityManager.create.mockReturnValue(mockOrder);
      mockEntityManager.save
        .mockResolvedValueOnce(mockOrder)      // save(Order)
        .mockResolvedValueOnce([]);            // save(OrderItem[])
      mockEntityManager.findOneOrFail.mockResolvedValue({
        ...mockOrder,
        items: [],
      });

      const result = await service.createOrder('user-001', {
        items: [{ packId: 'pack-001', quantity: 1 }],
      });

      expect(result.orderNumber).toBe('BS-2025-00001');
      expect(mockEntityManager.decrement).toHaveBeenCalledWith(
        Product,
        { id: 'prod-001' },
        'stockQty',
        1,
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_ORDER' }),
      );
    });

    it('❌ doit lever BadRequestException si stock insuffisant', async () => {
      mockEntityManager.findOne
        .mockResolvedValueOnce(mockPackNoStock)    // findOne(Pack) — stock = 0
        .mockResolvedValueOnce({ id: 'prod-001', stockQty: 0 }); // findOne(Product)

      await expect(
        service.createOrder('user-001', {
          items: [{ packId: 'pack-001', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);

      // Le stock ne doit pas avoir été décrémenté
      expect(mockEntityManager.decrement).not.toHaveBeenCalled();
    });

    it('❌ doit lever NotFoundException si pack introuvable', async () => {
      mockEntityManager.findOne.mockResolvedValueOnce(null); // Pack non trouvé

      await expect(
        service.createOrder('user-001', {
          items: [{ packId: 'pack-inexistant', quantity: 1 }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── cancelOrder() ────────────────────────────────────────

  describe('cancelOrder()', () => {
    it('❌ doit lever BadRequestException si statut != pending', async () => {
      const confirmedOrder = {
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      };
      mockOrderRepository.findOne.mockResolvedValue(confirmedOrder);

      await expect(
        service.cancelOrder('order-001', 'user-001', UserRole.CLIENT),
      ).rejects.toThrow(BadRequestException);
    });

    it('✅ doit annuler une commande en statut pending', async () => {
      mockOrderRepository.findOne.mockResolvedValue({ ...mockOrder });
      mockOrderRepository.save.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CANCELLED,
      });

      const result = await service.cancelOrder(
        'order-001',
        'user-001',
        UserRole.CLIENT,
      );

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CANCEL_ORDER' }),
      );
    });
  });
});