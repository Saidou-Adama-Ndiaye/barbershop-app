// apps/api/src/modules/users/dto/toggle-wishlist.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ToggleWishlistDto {
  @ApiProperty({ example: 'uuid-du-pack' })
  @IsUUID('all')
  packId: string;
}