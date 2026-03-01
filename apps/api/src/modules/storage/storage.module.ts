// .\.\apps\api\src\modules\storage\storage.module.ts
import { Module, Global } from '@nestjs/common';
import { MinioService } from './minio.service';

@Global()
@Module({
  providers: [MinioService],
  exports:   [MinioService],
})
export class StorageModule {}