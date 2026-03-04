// apps/api/src/modules/coupons/coupons.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, DiscountType } from './entities/coupon.entity';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto, ValidateCouponResponseDto } from './dto/validate-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectRepository(Coupon)
    private readonly couponRepo: Repository<Coupon>,
  ) {}

  // ─── POST /coupons/validate ───────────────────────────
  async validate(dto: ValidateCouponDto): Promise<ValidateCouponResponseDto> {
    const code = dto.code.trim().toUpperCase();
    const coupon = await this.couponRepo.findOne({
      where: { code, isActive: true },
    });

    // Coupon inexistant
    if (!coupon) {
      return {
        valid: false,
        code,
        discountType: '',
        discountValue: 0,
        discountAmount: 0,
        finalAmount: dto.orderAmount,
        message: 'Code promo invalide ou inactif',
      };
    }

    // Expiré
    if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
      return {
        valid: false,
        code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.value),
        discountAmount: 0,
        finalAmount: dto.orderAmount,
        message: 'Ce code promo a expiré',
      };
    }

    // Quota épuisé
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return {
        valid: false,
        code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.value),
        discountAmount: 0,
        finalAmount: dto.orderAmount,
        message: 'Ce code promo a atteint sa limite d\'utilisation',
      };
    }

    // Montant minimum non atteint
    if (dto.orderAmount < Number(coupon.minOrder)) {
      return {
        valid: false,
        code,
        discountType: coupon.discountType,
        discountValue: Number(coupon.value),
        discountAmount: 0,
        finalAmount: dto.orderAmount,
        message: `Montant minimum requis : ${new Intl.NumberFormat('fr-SN').format(Number(coupon.minOrder))} XOF`,
      };
    }

    // ─── Calcul de la réduction ──────────────────────────
    let discountAmount = 0;

    if (coupon.discountType === DiscountType.PERCENT) {
      discountAmount = Math.round((dto.orderAmount * Number(coupon.value)) / 100);
    } else {
      // FIXED — ne peut pas dépasser le montant total
      discountAmount = Math.min(Number(coupon.value), dto.orderAmount);
    }

    const finalAmount = Math.max(0, dto.orderAmount - discountAmount);

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: Number(coupon.value),
      discountAmount,
      finalAmount,
    };
  }

  // ─── Appliquer un coupon (appelé dans OrdersService) ─
  async applyCoupon(
    code: string,
    orderAmount: number,
  ): Promise<{ discountAmount: number; finalAmount: number }> {
    const result = await this.validate({ code, orderAmount });

    if (!result.valid) {
      throw new BadRequestException(result.message);
    }

    // Incrémenter usedCount
    await this.couponRepo.increment({ code: result.code }, 'usedCount', 1);

    return {
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount,
    };
  }

  // ─── CRUD Admin ───────────────────────────────────────

  async findAll(): Promise<Coupon[]> {
    return this.couponRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Coupon> {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException(`Coupon introuvable`);
    return coupon;
  }

  async create(dto: CreateCouponDto): Promise<Coupon> {
    const code = dto.code.trim().toUpperCase();

    const existing = await this.couponRepo.findOne({ where: { code } });
    if (existing) throw new ConflictException(`Le code "${code}" existe déjà`);

    const coupon = this.couponRepo.create({
      ...dto,
      code,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    return this.couponRepo.save(coupon);
  }

  async update(id: string, dto: UpdateCouponDto): Promise<Coupon> {
    const coupon = await this.findOne(id);

    if (dto.code) dto.code = dto.code.trim().toUpperCase();

    Object.assign(coupon, {
      ...dto,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : coupon.expiresAt,
    });

    return this.couponRepo.save(coupon);
  }

  async remove(id: string): Promise<void> {
    const coupon = await this.findOne(id);
    await this.couponRepo.remove(coupon);
  }
}