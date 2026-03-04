// apps/api/src/modules/users/wishlist.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { Pack } from '../packs/entities/pack.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepo: Repository<Wishlist>,
    @InjectRepository(Pack)
    private readonly packRepo: Repository<Pack>,
  ) {}

  // ─── GET /users/me/wishlist ──────────────────────────
  async findAll(userId: string): Promise<Wishlist[]> {
    return this.wishlistRepo.find({
      where: { userId },
      relations: ['pack', 'pack.packProducts', 'pack.packProducts.product'],
      order: { createdAt: 'DESC' },
    });
  }

  // ─── POST /users/me/wishlist ─────────────────────────
  async add(userId: string, packId: string): Promise<Wishlist> {
    // Vérifier que le pack existe
    const pack = await this.packRepo.findOne({
      where: { id: packId, isActive: true },
    });
    if (!pack) {
      throw new NotFoundException(`Pack introuvable`);
    }

    // Vérifier doublon
    const existing = await this.wishlistRepo.findOne({
      where: { userId, packId },
    });
    if (existing) {
      throw new ConflictException(`Pack déjà dans la wishlist`);
    }

    const entry = this.wishlistRepo.create({ userId, packId });
    return this.wishlistRepo.save(entry);
  }

  // ─── DELETE /users/me/wishlist/:packId ───────────────
  async remove(userId: string, packId: string): Promise<void> {
    const entry = await this.wishlistRepo.findOne({
      where: { userId, packId },
    });
    if (!entry) {
      throw new NotFoundException(`Pack non trouvé dans la wishlist`);
    }
    await this.wishlistRepo.remove(entry);
  }

  // ─── Toggle (pour le bouton cœur frontend) ───────────
  async toggle(userId: string, packId: string): Promise<{ inWishlist: boolean }> {
    const existing = await this.wishlistRepo.findOne({
      where: { userId, packId },
    });

    if (existing) {
      await this.wishlistRepo.remove(existing);
      return { inWishlist: false };
    }

    // Vérifier pack
    const pack = await this.packRepo.findOne({
      where: { id: packId, isActive: true },
    });
    if (!pack) throw new NotFoundException(`Pack introuvable`);

    const entry = this.wishlistRepo.create({ userId, packId });
    await this.wishlistRepo.save(entry);
    return { inWishlist: true };
  }

  // ─── Vérifier si un pack est dans la wishlist ────────
  async isInWishlist(userId: string, packId: string): Promise<boolean> {
    const entry = await this.wishlistRepo.findOne({
      where: { userId, packId },
    });
    return !!entry;
  }

  // ─── Récupérer les packIds de la wishlist (pour le frontend) ─
  async getPackIds(userId: string): Promise<string[]> {
    const entries = await this.wishlistRepo.find({
      where: { userId },
      select: ['packId'],
    });
    return entries.map((e) => e.packId);
  }
}