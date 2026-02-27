import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'client@barbershop.sn',
    description: 'Adresse email unique',
  })
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @ApiProperty({
    example: 'MonMotDePasse@2025',
    description: 'Minimum 8 caractères, 1 majuscule, 1 chiffre, 1 caractère spécial',
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  @MaxLength(50)
  @Matches(
    /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/,
    { message: 'Le mot de passe doit contenir au moins 1 majuscule, 1 chiffre et 1 caractère spécial (!@#$%^&*)' },
  )
  password: string;

  @ApiProperty({ example: 'Moussa', description: 'Prénom' })
  @IsString()
  @MinLength(2, { message: 'Le prénom doit faire au moins 2 caractères' })
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Diallo', description: 'Nom de famille' })
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({
    example: '+221771234567',
    description: 'Numéro de téléphone (format international)',
  })
  @IsOptional()
  @IsString()
  @Matches(
    /^\+?[1-9]\d{7,14}$/,
    { message: 'Numéro de téléphone invalide' },
  )
  phone?: string;
}