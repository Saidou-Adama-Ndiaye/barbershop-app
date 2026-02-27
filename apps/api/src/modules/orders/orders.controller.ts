import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
}

@ApiTags('Orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ─── POST /orders ─────────────────────────────────────────
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Passer une commande' })
  @ApiResponse({ status: 201, description: 'Commande créée' })
  @ApiResponse({ status: 400, description: 'Stock insuffisant' })
  @ApiResponse({ status: 404, description: 'Pack introuvable' })
  createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.createOrder(user.id, dto);
  }

  // ─── GET /orders ──────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Mes commandes (admin: toutes les commandes)' })
  @ApiResponse({ status: 200, description: 'Liste des commandes' })
  findAll(@CurrentUser() user: AuthUser) {
    return this.ordersService.findAll(user.id, user.role);
  }

  // ─── GET /orders/:id ──────────────────────────────────────
  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une commande' })
  @ApiParam({ name: 'id', description: 'UUID de la commande' })
  @ApiResponse({ status: 200, description: 'Détail commande' })
  @ApiResponse({ status: 403, description: 'Accès refusé' })
  @ApiResponse({ status: 404, description: 'Commande introuvable' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.findOne(id, user.id, user.role);
  }

  // ─── PATCH /orders/:id/cancel ─────────────────────────────
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Annuler une commande (statut pending uniquement)' })
  @ApiParam({ name: 'id', description: 'UUID de la commande' })
  @ApiResponse({ status: 200, description: 'Commande annulée' })
  @ApiResponse({ status: 400, description: 'Impossible d\'annuler' })
  cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.cancelOrder(id, user.id, user.role);
  }

  // ─── PATCH /orders/:id/status (admin) ────────────────────
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  @ApiOperation({ summary: '[Admin] Modifier le statut d\'une commande' })
  @ApiParam({ name: 'id', description: 'UUID de la commande' })
  @ApiResponse({ status: 200, description: 'Statut mis à jour' })
  @ApiResponse({ status: 400, description: 'Transition non autorisée' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.ordersService.updateStatus(id, dto, user.id);
  }
}