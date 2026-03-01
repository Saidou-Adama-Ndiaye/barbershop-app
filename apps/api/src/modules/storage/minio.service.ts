// .\.\apps\api\src\modules\storage\minio.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

export interface UploadResult {
  bucket: string;
  key: string;
  size: number;
  etag: string;
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;

  readonly BUCKET_VIDEOS    = 'videos';
  readonly BUCKET_IMAGES    = 'images';
  readonly BUCKET_DOCUMENTS = 'documents';

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint:  this.configService.get<string>('MINIO_HOST',       'localhost'),
      port:      this.configService.get<number>('MINIO_PORT',       9000),
      useSSL:    this.configService.get<string>('MINIO_USE_SSL',    'false') === 'true',
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY', 'minio_admin'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY', 'minio_secret_2025'),
    });
  }

  async onModuleInit(): Promise<void> {
    const buckets = [this.BUCKET_VIDEOS, this.BUCKET_IMAGES, this.BUCKET_DOCUMENTS];
    for (const bucket of buckets) {
      try {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket, 'us-east-1');
          this.logger.log(`✅ Bucket créé: ${bucket}`);
        }
      } catch (err) {
        this.logger.warn(`⚠️  Bucket ${bucket}: ${(err as Error).message}`);
      }
    }
    this.logger.log('🗄️  MinIO initialisé');
  }

  async uploadFile(
    buffer: Buffer,
    bucket: string,
    key: string,
    contentType: string,
    metadata: Record<string, string> = {},
  ): Promise<UploadResult> {
    const result = await this.client.putObject(
      bucket, key, buffer, buffer.length,
      { 'Content-Type': contentType, ...metadata },
    );
    this.logger.log(`📤 Upload: ${bucket}/${key} (${buffer.length} bytes)`);
    return { bucket, key, size: buffer.length, etag: result.etag };
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    const url = await this.client.presignedGetObject(bucket, key, expiresInSeconds);
    this.logger.log(`🔗 URL signée: ${bucket}/${key} (${expiresInSeconds}s)`);
    return url;
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
    this.logger.log(`🗑️  Supprimé: ${bucket}/${key}`);
  }

  async fileExists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.client.statObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  generateKey(prefix: string, filename: string): string {
    const ext       = filename.split('.').pop() ?? 'bin';
    const timestamp = Date.now();
    const random    = Math.random().toString(36).slice(2, 8);
    return `${prefix}/${timestamp}-${random}.${ext}`;
  }
}