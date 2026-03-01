// .\.\apps\api\src\modules\audit\audit.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  log(data: {
    userId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }): void {
    const log = this.auditLogRepository.create(data);
    void this.auditLogRepository.save(log).catch((err: unknown) => {
      console.error('AuditLog save error:', err);
    });
  }
}
