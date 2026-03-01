// .\.\apps\api\src\modules\admin\admin.controller.ts
import {
  Controller, Get, Patch, Body, Param,
  Query, ParseUUIDPipe, UseGuards, Res,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { QueryCalendarDto } from './dto/query-calendar.dto';
import { QueryExportDto } from './dto/query-export.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

interface AuthUser { id: string; role: UserRole; }

@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── GET /admin/stats ─────────────────────────────────
  @Get('stats')
  @ApiOperation({ summary: 'KPI Dashboard global' })
  getStats() {
    return this.adminService.getStats();
  }

  // ─── GET /admin/users ─────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'Liste utilisateurs paginée' })
  getUsers(@Query() query: QueryUsersDto) {
    return this.adminService.getUserList(query);
  }

  // ─── PATCH /admin/users/:id ───────────────────────────
  @Patch('users/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifier rôle/statut utilisateur (super_admin)' })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  // ─── GET /admin/products/stock ────────────────────────
  @Get('products/stock')
  @ApiOperation({ summary: 'Tableau stock avec alertes' })
  getStock() {
    return this.adminService.getStockAlerts();
  }

  // ─── PATCH /admin/products/:id/stock ─────────────────
  @Patch('products/:id/stock')
  @ApiOperation({ summary: 'Mettre à jour le stock + audit log' })
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateStock(id, dto, user.id);
  }

  // ─── GET /admin/bookings/calendar ────────────────────
  @Get('bookings/calendar')
  @ApiOperation({ summary: 'Planning calendrier hebdomadaire' })
  getCalendar(@Query() query: QueryCalendarDto) {
    return this.adminService.getBookingCalendar(query);
  }

  // ─── GET /admin/export/orders ─────────────────────────
  @Get('export/orders')
  @ApiOperation({ summary: 'Export CSV commandes' })
  @ApiResponse({ status: 200, description: 'Fichier CSV téléchargeable' })
  async exportOrders(
    @Query() query: QueryExportDto,
    @Res() res: Response,
  ) {
    const csv = await this.adminService.exportOrdersCsv(query);
    const filename = `commandes-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv); // BOM UTF-8 pour Excel
  }
}