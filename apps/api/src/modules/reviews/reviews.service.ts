// apps/api/src/modules/reviews/reviews.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review, ReviewStatus } from './entities/review.entity';
import { Pack } from '../packs/entities/pack.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Pack)
    private readonly packRepo: Repository<Pack>,
  ) {}

  // ─── POST /packs/:slug/reviews ───────────────────────
  async create(
    userId: string,
    slug: string,
    dto: CreateReviewDto,
  ): Promise<Review> {
    const pack = await this.packRepo.findOne({ where: { slug, isActive: true } });
    if (!pack) throw new NotFoundException(`Pack introuvable`);

    // 1 avis par user par pack
    const existing = await this.reviewRepo.findOne({
      where: { userId, packId: pack.id },
    });
    if (existing) {
      throw new ConflictException(`Vous avez déjà soumis un avis pour ce pack`);
    }

    const review = this.reviewRepo.create({
      userId,
      packId: pack.id,
      rating: dto.rating,
      comment: dto.comment,
      status: ReviewStatus.PENDING,
    });

    return this.reviewRepo.save(review);
    // Le trigger SQL recalcule avgRating automatiquement à l'approbation
  }

  // ─── GET /packs/:slug/reviews ────────────────────────
  async findByPack(
    slug: string,
    onlyApproved = true,
  ): Promise<{ reviews: Review[]; avgRating: number; reviewCount: number }> {
    const pack = await this.packRepo.findOne({ where: { slug } });
    if (!pack) throw new NotFoundException(`Pack introuvable`);

    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .where('review.packId = :packId', { packId: pack.id })
      .orderBy('review.createdAt', 'DESC');

    if (onlyApproved) {
      qb.andWhere('review.status = :status', { status: ReviewStatus.APPROVED });
    }

    const reviews = await qb.getMany();

    return {
      reviews,
      avgRating: Number(pack.avgRating),
      reviewCount: pack.reviewCount,
    };
  }

  // ─── PATCH /reviews/:id/moderate (admin) ─────────────
  async moderate(id: string, dto: ModerateReviewDto): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Avis introuvable`);

    review.status = dto.status;
    return this.reviewRepo.save(review);
    // Le trigger SQL recalcule avgRating automatiquement
  }

  // ─── GET /reviews (admin) — tous les avis ────────────
  async findAll(status?: ReviewStatus): Promise<Review[]> {
    const qb = this.reviewRepo
      .createQueryBuilder('review')
      .leftJoinAndSelect('review.user', 'user')
      .leftJoinAndSelect('review.pack', 'pack')
      .orderBy('review.createdAt', 'DESC');

    if (status) {
      qb.where('review.status = :status', { status });
    }

    return qb.getMany();
  }

  // ─── Vérifier si l'user a déjà un avis sur ce pack ───
  async getUserReview(userId: string, packId: string): Promise<Review | null> {
    return this.reviewRepo.findOne({ where: { userId, packId } });
  }
}