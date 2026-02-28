import {
  Injectable, NotFoundException,
  ConflictException, ForbiddenException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation } from './entities/formation.entity';
import { Video } from './entities/video.entity';
import { Enrollment } from './entities/enrollment.entity';
import { VideoProgress } from './entities/video-progress.entity';
import { MinioService } from '../storage/minio.service';
import { AuditService } from '../audit/audit.service';
import { PaymentsService } from '../payments/payments.service';
import { QueryFormationDto } from './dto/query-formation.dto';
import { TrackProgressDto } from './dto/track-progress.dto';
import { CreateFormationDto } from './dto/create-formation.dto';

@Injectable()
export class FormationsService {
  private readonly logger = new Logger(FormationsService.name);

  constructor(
    @InjectRepository(Formation)
    private readonly formationRepo: Repository<Formation>,
    @InjectRepository(Video)
    private readonly videoRepo: Repository<Video>,
    @InjectRepository(Enrollment)
    private readonly enrollmentRepo: Repository<Enrollment>,
    @InjectRepository(VideoProgress)
    private readonly progressRepo: Repository<VideoProgress>,
    private readonly minioService: MinioService,
    private readonly auditService: AuditService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ─── GET /formations ──────────────────────────────────
  async findAll(query: QueryFormationDto): Promise<{
    data: Formation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { level, maxPrice, language, page = 1, limit = 10 } = query;

    const qb = this.formationRepo
      .createQueryBuilder('formation')
      .leftJoinAndSelect('formation.instructor', 'instructor')
      .where('formation.isPublished = :published', { published: true })
      .orderBy('formation.createdAt', 'DESC');

    if (level)    qb.andWhere('formation.level = :level',        { level });
    if (maxPrice) qb.andWhere('formation.price <= :maxPrice',    { maxPrice });
    if (language) qb.andWhere('formation.language = :language',  { language });

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  // ─── GET /formations/:slug ────────────────────────────
  async findBySlug(slug: string): Promise<Formation & { videos: Omit<Video, 'storageKey'>[] }> {
    const formation = await this.formationRepo.findOne({
      where: { slug, isPublished: true },
      relations: ['instructor'],
    });

    if (!formation) throw new NotFoundException('Formation introuvable');

    // Charger les vidéos SANS storage_key (sécurité anti-hotlink)
    const videos = await this.videoRepo
      .createQueryBuilder('video')
      .select([
        'video.id', 'video.title', 'video.description',
        'video.durationSec', 'video.sortOrder', 'video.isFreePreview',
        'video.formationId', 'video.createdAt',
      ])
      .where('video.formationId = :formationId', { formationId: formation.id })
      .orderBy('video.sortOrder', 'ASC')
      .getMany();

    return { ...formation, videos };
  }

  // ─── POST /formations (admin) ─────────────────────────
  async create(dto: CreateFormationDto, instructorId: string): Promise<Formation> {
    const existing = await this.formationRepo.findOne({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Ce slug existe déjà');

    const formation = this.formationRepo.create({ ...dto, instructorId });
    return this.formationRepo.save(formation);
  }

  // ─── POST /formations/:id/enroll ─────────────────────
  async enroll(
    formationId: string,
    userId: string,
  ): Promise<{ payment: { redirectUrl: string; paymentId: string; amount: number } }> {
    // 1. Vérifier que la formation existe
    const formation = await this.formationRepo.findOne({
      where: { id: formationId, isPublished: true },
    });
    if (!formation) throw new NotFoundException('Formation introuvable');

    // 2. Vérifier non déjà inscrit
    const existing = await this.enrollmentRepo.findOne({
      where: { userId, formationId },
    });
    if (existing) throw new ConflictException('Vous êtes déjà inscrit à cette formation');

    // 3. Initier paiement Wave
    const payment = await this.paymentsService.initiatePayment({
      amount:     Number(formation.price),
      currency:   'XOF',
      provider:   'wave',
      entityType: 'formation',
      entityId:   formationId,
    });

    // 4. Créer enrollment en statut pending (sera activé via webhook)
    const enrollment = this.enrollmentRepo.create({
      userId,
      formationId,
      paymentId: payment.paymentId,
    });
    await this.enrollmentRepo.save(enrollment);

    this.auditService.log({
      userId,
      action:     'ENROLL_FORMATION',
      entityType: 'Formation',
      entityId:   formationId,
      metadata:   { price: formation.price, paymentId: payment.paymentId },
    });

    return { payment };
  }

  // ─── GET /formations/:id/videos/:videoId/stream ───────
  async getSignedVideoUrl(
    formationId: string,
    videoId: string,
    userId: string,
  ): Promise<{ url: string; expiresIn: number }> {
    // 1. Vérifier enrollment actif
    const enrollment = await this.enrollmentRepo.findOne({
      where: { userId, formationId },
    });

    // Chercher aussi si la vidéo est free preview
    const video = await this.videoRepo
      .createQueryBuilder('video')
      .addSelect('video.storageKey')
      .where('video.id = :videoId AND video.formationId = :formationId', {
        videoId, formationId,
      })
      .getOne();

    if (!video) throw new NotFoundException('Vidéo introuvable');

    // Si pas enrolled et pas free preview → 403
    if (!enrollment && !video.isFreePreview) {
      throw new ForbiddenException(
        'Vous devez acheter cette formation pour accéder à cette vidéo',
      );
    }

    // 2. Générer URL signée MinIO (15 minutes)
    const signedUrl = await this.minioService.getSignedUrl(
      this.minioService.BUCKET_VIDEOS,
      video.storageKey,
      900, // 15 minutes
    );

    // 3. Audit log
    this.auditService.log({
      userId,
      action:     'VIDEO_STREAM',
      entityType: 'Video',
      entityId:   videoId,
      metadata:   { formationId, isFreePreview: video.isFreePreview },
    });

    return { url: signedUrl, expiresIn: 900 };
  }

  // ─── POST /videos/:id/progress ────────────────────────
  async trackProgress(
    videoId: string,
    userId: string,
    dto: TrackProgressDto,
  ): Promise<VideoProgress> {
    // Vérifier que la vidéo existe
    const video = await this.videoRepo.findOne({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Vidéo introuvable');

    // Vérifier enrollment
    const enrollment = await this.enrollmentRepo.findOne({
      where: { userId, formationId: video.formationId },
    });
    if (!enrollment && !video.isFreePreview) {
      throw new ForbiddenException('Accès non autorisé');
    }

    // Marquer completed si >= 90% regardé
    const isCompleted = video.durationSec > 0
      ? dto.watchedSec >= video.durationSec * 0.9
      : false;

    // Upsert progression
    const existing = await this.progressRepo.findOne({
      where: { userId, videoId },
    });

    if (existing) {
      // Mettre à jour seulement si on a avancé
      if (dto.watchedSec > existing.watchedSec) {
        await this.progressRepo.update(existing.id, {
          watchedSec:  dto.watchedSec,
          isCompleted: isCompleted || existing.isCompleted,
          lastWatched: new Date(),
        });
      }
      return this.progressRepo.findOne({ where: { id: existing.id } }) as Promise<VideoProgress>;
    }

    const progress = this.progressRepo.create({
      userId,
      videoId,
      watchedSec:  dto.watchedSec,
      isCompleted,
      lastWatched: new Date(),
    });

    return this.progressRepo.save(progress);
  }

  // ─── GET /my-formations ───────────────────────────────
  async getMyFormations(userId: string): Promise<{
    formation: Formation;
    enrolledAt: Date;
    completedAt: Date;
    progressPct: number;
    videosProgress: { videoId: string; title: string; isCompleted: boolean; watchedSec: number }[];
  }[]> {
    const enrollments = await this.enrollmentRepo.find({
      where: { userId },
      relations: ['formation'],
      order: { enrolledAt: 'DESC' },
    });

    const results = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Charger les vidéos de la formation
        const videos = await this.videoRepo.find({
          where: { formationId: enrollment.formationId },
          order: { sortOrder: 'ASC' },
        });

        // Charger la progression de chaque vidéo
        const progressList = await this.progressRepo.find({
          where: { userId },
        });

        const progressMap = new Map(
          progressList.map((p) => [p.videoId, p]),
        );

        const videosProgress = videos.map((v) => {
          const prog = progressMap.get(v.id);
          return {
            videoId:     v.id,
            title:       v.title,
            isCompleted: prog?.isCompleted ?? false,
            watchedSec:  prog?.watchedSec ?? 0,
          };
        });

        const completedCount = videosProgress.filter((v) => v.isCompleted).length;
        const progressPct    = videos.length > 0
          ? Math.round((completedCount / videos.length) * 100)
          : 0;

        return {
          formation:      enrollment.formation,
          enrolledAt:     enrollment.enrolledAt,
          completedAt:    enrollment.completedAt,
          progressPct,
          videosProgress,
        };
      }),
    );

    return results;
  }

  // ─── Activer enrollment après paiement (appelé par webhook) ──
  async activateEnrollment(formationId: string, paymentId: string): Promise<void> {
    const enrollment = await this.enrollmentRepo.findOne({
      where: { formationId, paymentId },
    });

    if (!enrollment) {
      this.logger.warn(`Enrollment non trouvé pour payment ${paymentId}`);
      return;
    }

    // Incrémenter total_enrolled
    await this.formationRepo.increment(
      { id: formationId },
      'totalEnrolled',
      1,
    );

    this.logger.log(`✅ Enrollment activé: formation ${formationId}`);
  }
}