// .\.\apps\api\src\modules\auth\dto\auth-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class UserProfileDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ enum: UserRole }) role: UserRole;
  @ApiProperty() isVerified: boolean;
  @ApiProperty() createdAt: Date;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token (valable 15 minutes)' })
  accessToken: string;

  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;

  @ApiProperty({ description: 'Refresh token' })
  refreshToken: string;
}

export class RegisterResponseDto {
  @ApiProperty({ example: 'Inscription réussie' })
  message: string;

  @ApiProperty()
  userId: string;
}

export class RefreshResponseDto {
  @ApiProperty({ description: 'Nouveau JWT access token' })
  accessToken: string;
}
