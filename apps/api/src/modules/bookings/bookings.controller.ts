import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { PaymentsService } from '../payments/payments.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ─── GET /bookings/availability ───────────────────────
  @Public()
  @Get('availability')
  @ApiOperation({ summary: 'Créneaux disponibles pour un coiffeur à une date' })
  @ApiQuery({ name: 'staffId',   required: true })
  @ApiQuery({ name: 'date',      required: true, example: '2025-08-15' })
  @ApiQuery({ name: 'serviceId', required: true })
  @ApiResponse({ status: 200, description: 'Liste des créneaux avec disponibilité' })
  getAvailability(@Query() query: QueryAvailabilityDto) {
    return this.bookingsService.getAvailableSlots(
      query.staffId,
      query.date,
      query.serviceId,
    );
  }

  // ─── POST /bookings ───────────────────────────────────
  @Post()
  @ApiOperation({ summary: 'Créer une réservation + initier paiement acompte' })
  @ApiResponse({ status: 201, description: 'Réservation créée + URL paiement' })
  @ApiResponse({ status: 409, description: 'Créneau déjà réservé' })
  async createBooking(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.bookingsService.createBooking(user.id, dto);

    // Initier le paiement de l'acompte
    const payment = await this.paymentsService.initiatePayment({
      amount:     result.depositAmount,
      currency:   'XOF',
      provider:   'wave',
      entityType: 'booking',
      entityId:   result.booking.id,
    });

    return {
      booking:       result.booking,
      depositAmount: result.depositAmount,
      payment,
    };
  }

  // ─── GET /bookings ────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Mes réservations (client) ou planning (coiffeur/admin)' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.bookingsService.findAll(user.id, user.role);
  }

  // ─── GET /bookings/:id ────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une réservation' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingsService.findOne(id, user.id, user.role);
  }

  // ─── PATCH /bookings/:id/cancel ───────────────────────
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une réservation (remboursement si > 24h)' })
  @ApiResponse({ status: 200, description: 'Réservation annulée + infos remboursement' })
  cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelBookingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.bookingsService.cancelBooking(id, user.id, user.role, dto);
  }
}