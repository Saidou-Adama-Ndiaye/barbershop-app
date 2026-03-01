// .\.\apps\api\src\modules\packs\packs.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PacksService } from './packs.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Pack } from './entities/pack.entity';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { PackProduct } from './entities/pack-product.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

// ─── Données de test ──────────────────────────────────────

const mockProduct1 = {
  id: 'prod-001',
  name: 'Tondeuse Pro',
  unitPrice: 35000,
  stockQty: 50,
  isActive: true,
};

const mockProduct2 = {
  id: 'prod-002',
  name: 'Mousse à Raser',
  unitPrice: 4500,
  stockQty: 100,
  isActive: true,
};

const mockPackProduct1 = {
  id: 'pp-001',
  packId: 'pack-001',
  productId: 'prod-001',
  quantity: 1,
  isOptional: false,
  sortOrder: 0,
  product: mockProduct1,
};

const mockPackProduct2 = {
  id: 'pp-002',
  packId: 'pack-001',
  productId: 'prod-002',
  quantity: 2,
  isOptional: true,  // retirable par le client
  sortOrder: 1,
  product: mockProduct2,
};

const mockPack = {
  id: 'pack-001',
  name: 'Pack Rasage Pro',
  slug: 'pack-rasage-pro',
  basePrice: 45000,
  discountPct: 10,
  isActive: true,
  isCustomizable: true,
  packProducts: [mockPackProduct1, mockPackProduct2],
};

// ─── Mocks des repositories ───────────────────────────────

const mockPackRepository = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

const mockProductRepository = {
  find: jest.fn(),
  findByIds: jest.fn(),
};

const mockCategoryRepository = {
  find: jest.fn(),
};

const mockPackProductRepository = {
  create: jest.fn(),
  save: jest.fn(),
};

// ─── Tests ────────────────────────────────────────────────

describe('PacksService', () => {
  let service: PacksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PacksService,
        { provide: getRepositoryToken(Pack), useValue: mockPackRepository },
        { provide: getRepositoryToken(Product), useValue: mockProductRepository },
        { provide: getRepositoryToken(Category), useValue: mockCategoryRepository },
        { provide: getRepositoryToken(PackProduct), useValue: mockPackProductRepository },
      ],
    }).compile();

    service = module.get<PacksService>(PacksService);
    jest.clearAllMocks();
  });

  // ─── findAll() ────────────────────────────────────────────

  describe('findAll()', () => {
    it('✅ doit retourner une liste paginée de packs', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPack], 1]),
      };
      mockPackRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('✅ doit filtrer par catégorie si query.category fourni', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockPack], 1]),
      };
      mockPackRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ page: 1, limit: 10, category: 'rasage' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'category.slug = :slug',
        { slug: 'rasage' },
      );
    });
  });

  // ─── findBySlug() ─────────────────────────────────────────

  describe('findBySlug()', () => {
    it('✅ doit retourner un pack avec finalPrice calculé', async () => {
      mockPackRepository.findOne.mockResolvedValue(mockPack);

      const result = await service.findBySlug('pack-rasage-pro');

      expect(result.slug).toBe('pack-rasage-pro');
      // finalPrice = 45000 - (45000 * 10 / 100) = 40500
      expect(result.finalPrice).toBe(40500);
    });

    it('❌ doit lever NotFoundException si slug inconnu', async () => {
      mockPackRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySlug('pack-inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── calculatePackPrice() ─────────────────────────────────

  describe('calculatePackPrice()', () => {
    it('✅ doit calculer le prix avec additions valides', async () => {
      mockPackRepository.findOne.mockResolvedValue(mockPack);
      mockProductRepository.findByIds.mockResolvedValue([
        { id: 'prod-003', name: 'Huile Barbe', unitPrice: 9500 },
      ]);

      const result = await service.calculatePackPrice('pack-001', {
        additions: ['prod-003'],
        removals: [],
      });

      // Base : prod-001 (35000*1) + prod-002 (4500*2) = 44000
      // + addition prod-003 (9500) = 53500
      // discount 10% → 53500 - 5350 = 48150
      expect(result.finalPrice).toBe(48150);
      expect(result.breakdown.added).toHaveLength(1);
      expect(result.breakdown.added[0].name).toBe('Huile Barbe');
    });

    it('✅ doit appliquer correctement le discount_pct', async () => {
      mockPackRepository.findOne.mockResolvedValue(mockPack);
      mockProductRepository.findByIds.mockResolvedValue([]);

      const result = await service.calculatePackPrice('pack-001', {});

      // Base : 35000 + 9000 = 44000
      // discount 10% = 4400
      // finalPrice = 39600
      expect(result.discountAmount).toBe(4400);
      expect(result.finalPrice).toBe(39600);
    });

    it('❌ doit lever BadRequestException si removal sur produit obligatoire', async () => {
      mockPackRepository.findOne.mockResolvedValue(mockPack);

      // mockPackProduct1.isOptional = false → ne peut pas être retiré
      await expect(
        service.calculatePackPrice('pack-001', {
          removals: ['prod-001'], // prod-001 est isOptional: false
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('❌ doit lever NotFoundException si pack introuvable', async () => {
      mockPackRepository.findOne.mockResolvedValue(null);

      await expect(
        service.calculatePackPrice('pack-inexistant', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── computeFinalPrice() ──────────────────────────────────

  describe('computeFinalPrice()', () => {
    it('✅ doit calculer correctement le prix final avec discount', () => {
      // 45000 - 10% = 40500
      expect(service.computeFinalPrice(45000, 10)).toBe(40500);
      // 25000 - 0% = 25000
      expect(service.computeFinalPrice(25000, 0)).toBe(25000);
      // 78000 - 15% = 66300
      expect(service.computeFinalPrice(78000, 15)).toBe(66300);
    });
  });
});