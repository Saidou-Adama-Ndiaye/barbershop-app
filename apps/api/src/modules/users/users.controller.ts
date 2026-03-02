// apps/api/src/modules/users/users.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── GET /users/staff ────────────────────────────────────────────
  // Public — le calendrier de réservation est accessible sans compte
  @Public()
  @Get('staff')
  @ApiOperation({ summary: 'Liste des coiffeurs disponibles pour la réservation' })
  @ApiResponse({
    status: 200,
    description: 'Liste des coiffeurs actifs (id, firstName, lastName, role)',
  })
  getStaff() {
    return this.usersService.findStaff();
  }
}