// .\.\apps\api\src\modules\formations\dto\track-progress.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TrackProgressDto {
  @ApiProperty({ example: 340, description: 'Secondes regardées' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  watchedSec: number;
}