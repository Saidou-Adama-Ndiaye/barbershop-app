// .\.\apps\api\src\modules\formations\formations.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Formation }     from './entities/formation.entity';
import { Video }         from './entities/video.entity';
import { Enrollment }    from './entities/enrollment.entity';
import { VideoProgress } from './entities/video-progress.entity';
import { FormationsService }     from './formations.service';
import {
  FormationsController,
  VideosController,
  MyFormationsController,
} from './formations.controller';
import { AuditModule }    from '../audit/audit.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Formation, Video, Enrollment, VideoProgress]),
    AuditModule,
    PaymentsModule,
  ],
  providers:   [FormationsService],
  controllers: [FormationsController, VideosController, MyFormationsController],
  exports:     [FormationsService],
})
export class FormationsModule {}