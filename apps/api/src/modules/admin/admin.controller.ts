// apps\api\src\modules\admin\admin.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, ParseUUIDPipe,
  UseGuards, UseInterceptors, UploadedFile,
  UploadedFiles, HttpCode, HttpStatus, Res,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiResponse, ApiConsumes, ApiQuery,
} from '@nestjs/swagger';
import {
  IsString, IsOptional, IsNumber, IsBoolean,
  IsEmail, MinLength, IsArray, Min, Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { Response } from 'express';
import {
  AdminService,
  CreateCategoryDto, UpdateCategoryDto,
  CreateProductDto, UpdateProductDto,
  CreatePackAdminDto, UpdatePackAdminDto,
  PackProductDto,
  CreateServiceDto, UpdateServiceDto,
  CreateFormationAdminDto, UpdateFormationAdminDto,
  CreateVideoDto, UpdateVideoDto,
  QueryAuditLogsDto,
} from './admin.service';
import { QueryUsersDto }   from './dto/query-users.dto';
import { UpdateUserDto }   from './dto/update-user.dto';
import { UpdateStockDto }  from './dto/update-stock.dto';
import { QueryCalendarDto } from './dto/query-calendar.dto';
import { QueryExportDto }  from './dto/query-export.dto';
import { JwtAuthGuard }    from '../auth/guards/jwt-auth.guard';
import { RolesGuard }      from '../auth/guards/roles.guard';
import { Roles }           from '../auth/decorators/roles.decorator';
import { CurrentUser }     from '../auth/decorators/current-user.decorator';
import { UserRole }        from '../users/entities/user.entity';

// ─── DTOs locaux ──────────────────────────────────────────

class CreateCategoryBodyDto implements CreateCategoryDto {
  @ApiProperty({ example: 'Rasage' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'rasage' })
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isActive?: boolean;
}

class CreateProductBodyDto implements CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ example: 5000 })
  @IsNumber() @Type(() => Number)
  unitPrice: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional() @IsNumber() @Type(() => Number)
  stockQty?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isActive?: boolean;
}

class CreatePackBodyDto implements CreatePackAdminDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ example: 25000 })
  @IsNumber() @Type(() => Number)
  basePrice: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional() @IsNumber() @Type(() => Number)
  discountPct?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isCustomizable?: boolean;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isActive?: boolean;
}

class PackProductBodyDto implements PackProductDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsNumber() @Min(1) @Type(() => Number)
  quantity?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isOptional?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  sortOrder?: number;
}

class CreateServiceBodyDto implements CreateServiceDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ example: 5000 })
  @IsNumber() @Type(() => Number)
  price: number;

  @ApiProperty({ example: 30 })
  @IsNumber() @Min(5) @Max(480) @Type(() => Number)
  durationMin: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional() @IsNumber() @Type(() => Number)
  depositPct?: number;

  @ApiPropertyOptional({ example: ['Shampoing inclus'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  inclusions?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isActive?: boolean;
}

class CreateFormationBodyDto implements CreateFormationAdminDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiProperty({ example: 15000 })
  @IsNumber() @Type(() => Number)
  price: number;

  @ApiProperty({ example: 'debutant', enum: ['debutant', 'intermediaire', 'avance'] })
  @IsString()
  level: string;

  @ApiPropertyOptional({ example: 'fr' })
  @IsOptional() @IsString()
  language?: string;

  @ApiPropertyOptional({ example: ['coupe', 'rasage'] })
  @IsOptional() @IsArray() @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isPublished?: boolean;
}

class CreateVideoBodyDto implements CreateVideoDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  sortOrder?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional() @IsBoolean() @Type(() => Boolean)
  isFreePreview?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional() @IsNumber() @Type(() => Number)
  durationSec?: number;
}

class CreateCoiffeurBodyDto {
  @ApiProperty({ example: 'coiffeur@barbershop.sn' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  phone?: string;

  @ApiProperty({ minLength: 8 })
  @IsString() @MinLength(8)
  password: string;
}

class QueryAuditBodyDto implements QueryAuditLogsDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  to?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional() @IsNumber() @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional() @IsNumber() @Type(() => Number)
  limit?: number;
}

// ─── Interface AuthUser ───────────────────────────────────
interface AuthUser { id: string; role: UserRole; }

// ─── Controller principal ─────────────────────────────────
@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ════════════════════════════════════════════════════════
  // ─── STATS & DASHBOARD ───────────────────────────────
  // ════════════════════════════════════════════════════════

  @Get('stats')
  @ApiOperation({ summary: 'KPI Dashboard global' })
  getStats() {
    return this.adminService.getStats();
  }

  // ════════════════════════════════════════════════════════
  // ─── USERS ───────────────────────────────────────────
  // ════════════════════════════════════════════════════════

  @Get('users')
  @ApiOperation({ summary: 'Liste utilisateurs paginée' })
  getUsers(@Query() query: QueryUsersDto) {
    return this.adminService.getUserList(query);
  }

  @Patch('users/:id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifier rôle/statut utilisateur (super_admin)' })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(id, dto);
  }

  // ════════════════════════════════════════════════════════
  // ─── COIFFEURS ───────────────────────────────────────
  // ════════════════════════════════════════════════════════

  @Get('coiffeurs')
  @ApiOperation({ summary: 'Liste coiffeurs avec stats activités' })
  getCoiffeurs() {
    return this.adminService.getCoiffeursStats();
  }

  @Post('coiffeurs')
  @ApiOperation({ summary: 'Créer un compte coiffeur' })
  @ApiResponse({ status: 201, description: 'Coiffeur créé' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  createCoiffeur(@Body() dto: CreateCoiffeurBodyDto) {
    return this.adminService.createCoiffeur(dto);
  }

  // ════════════════════════════════════════════════════════
  // ─── CATEGORIES ──────────────────────────────────────
  // ════════════════════════════════════════════════════════

  @Get('categories')
  @ApiOperation({ summary: 'Toutes les catégories (admin)' })
  getCategories() {
    return this.adminService.findAllCategories();
  }

  @Post('categories')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Créer une catégorie avec image optionnelle' })
  @ApiResponse({ status: 201, description: 'Catégorie créée' })
  async createCategory(
    @Body() dto: CreateCategoryBodyDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.adminService.createCategory(
      dto,
      image ? { buffer: image.buffer, mimetype: image.mimetype, originalname: image.originalname } : undefined,
    );
  }

  @Patch('categories/:id')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Modifier une catégorie' })
  async updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @UploadedFile() image?: Express.Multer.File,
  ) {
    return this.adminService.updateCategory(
      id, dto,
      image ? { buffer: image.buffer, mimetype: image.mimetype, originalname: image.originalname } : undefined,
    );
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Désactiver une catégorie (soft delete)' })
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteCategory(id);
  }

  // ════════════════════════════════════════════════════════
  // ─── PRODUCTS ────────────────────────────────────────
  // ════════════════════════════════════════════════════════

  @Get('products')
  @ApiOperation({ summary: 'Tous les produits (admin, incluant inactifs)' })
  getProducts() {
    return this.adminService.findAllProductsAdmin();
  }

  @Post('products')
  @UseInterceptors(FilesInterceptor('images', 5, { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Créer un produit avec images optionnelles' })
  async createProduct(
    @Body() dto: CreateProductBodyDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.adminService.createProduct(
      dto,
      images?.map((img) => ({ buffer: img.buffer, mimetype: img.mimetype, originalname: img.originalname })),
    );
  }

  @Patch('products/:id')
  @UseInterceptors(FilesInterceptor('images', 5, { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Modifier un produit' })
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    return this.adminService.updateProduct(
      id, dto,
      images?.map((img) => ({ buffer: img.buffer, mimetype: img.mimetype, originalname: img.originalname })),
    );
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Désactiver un produit (soft delete)' })
  deleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteProduct(id);
  }

  // ─── Stock ────────────────────────────────────────────
  @Get('products/stock')
  @ApiOperation({ summary: 'Tableau stock avec alertes' })
  getStock() {
    return this.adminService.getStockAlerts();
  }

  @Patch('products/:id/stock')
  @ApiOperation({ summary: 'Mettre à jour le stock + audit log' })
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.adminService.updateStock(id, dto, user.id);
  }

  // ════════════════════════════════════════════════════════
  // ─── PACKS ───────────────────────────────────────────
  // ════════════════════════════════════════════════════════

  @Get('packs')
  @ApiOperation({ summary: 'Tous les packs (admin, incluant inactifs)' })
  getPacks() {
    return this.adminService.findAllPacksAdmin();
  }

  @Post('packs')
  @ApiOperation({ summary: 'Créer un pack' })
  @ApiResponse({ status: 201, description: 'Pack créé' })
  createPack(@Body() dto: CreatePackBodyDto) {
    return this.adminService.createPackAdmin(dto);
  }

  @Patch('packs/:id')
  @ApiOperation({ summary: 'Modifier un pack' })
  updatePack(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackAdminDto,
  ) {
    return this.adminService.updatePackAdmin(id, dto);
  }

  @Delete('packs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Désactiver un pack (soft delete)' })
  deletePack(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deletePackAdmin(id);
  }

  @Post('packs/:id/products')
  @ApiOperation({ summary: 'Ajouter/mettre à jour un produit dans un pack' })
  addProductToPack(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PackProductBodyDto,
  ) {
    return this.adminService.addProductToPack(id, dto);
  }

  @Delete('packs/:id/products/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer un produit d\'un pack' })
  removeProductFromPack(
    @Param('id',        ParseUUIDPipe) id:        string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.adminService.removeProductFromPack(id, productId);
  }

  // ════════════════════════════════════════════════════════
  // ─── SERVICES ────────────────────────────────────────
  // ════════════════════════════════════════════════════════

  @Get('services')
  @ApiOperation({ summary: 'Tous les services coiffure (admin)' })
  getServices() {
    return this.adminService.findAllServicesAdmin();
  }

  @Post('services')
  @ApiOperation({ summary: 'Créer un service coiffure' })
  @ApiResponse({ status: 201, description: 'Service créé' })
  createService(@Body() dto: CreateServiceBodyDto) {
    return this.adminService.createService(dto);
  }

  @Patch('services/:id')
  @ApiOperation({ summary: 'Modifier un service coiffure' })
  updateService(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.adminService.updateService(id, dto);
  }

  @Delete('services/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Désactiver un service (soft delete)' })
  deleteService(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteService(id);
  }

  // ════════════════════════════════════════════════════════
  // ─── FORMATIONS ──────────────────────────────────────
  // ════════════════════════════════════════════════════════

  @Get('formations')
  @ApiOperation({ summary: 'Toutes les formations (admin, publiées + non publiées)' })
  getFormations() {
    return this.adminService.findAllFormationsAdmin();
  }

  @Post('formations')
  @UseInterceptors(FileInterceptor('thumbnail', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Créer une formation avec thumbnail optionnel' })
  async createFormation(
    @Body() dto: CreateFormationBodyDto,
    @CurrentUser() user: AuthUser,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.adminService.createFormationAdmin(
      dto, user.id,
      thumbnail ? { buffer: thumbnail.buffer, mimetype: thumbnail.mimetype, originalname: thumbnail.originalname } : undefined,
    );
  }

  @Patch('formations/:id')
  @UseInterceptors(FileInterceptor('thumbnail', { limits: { fileSize: 5 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Modifier une formation' })
  async updateFormation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormationAdminDto,
    @UploadedFile() thumbnail?: Express.Multer.File,
  ) {
    return this.adminService.updateFormationAdmin(
      id, dto,
      thumbnail ? { buffer: thumbnail.buffer, mimetype: thumbnail.mimetype, originalname: thumbnail.originalname } : undefined,
    );
  }

  @Delete('formations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archiver une formation (isPublished = false)' })
  deleteFormation(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteFormationAdmin(id);
  }

  // ─── Vidéos ───────────────────────────────────────────

  @Get('formations/:id/videos')
  @ApiOperation({ summary: 'Lister les vidéos d\'une formation (admin)' })
  getVideos(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getVideos(id);
  }

  @Post('formations/:id/videos')
  @UseInterceptors(FileInterceptor('video', { limits: { fileSize: 500 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Uploader une vidéo vers MinIO' })
  @ApiResponse({ status: 201, description: '{ videoId, durationSec }' })
  async addVideo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateVideoBodyDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('Fichier vidéo requis');
    return this.adminService.addVideo(
      id, dto,
      { buffer: file.buffer, mimetype: file.mimetype, originalname: file.originalname },
    );
  }

  @Patch('formations/:id/videos/:vid')
  @ApiOperation({ summary: 'Modifier titre, ordre, isFreePreview d\'une vidéo' })
  updateVideo(
    @Param('id',  ParseUUIDPipe) id:  string,
    @Param('vid', ParseUUIDPipe) vid: string,
    @Body() dto: UpdateVideoDto,
  ) {
    return this.adminService.updateVideo(id, vid, dto);
  }

  @Delete('formations/:id/videos/:vid')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une vidéo (MinIO + DB)' })
  deleteVideo(
    @Param('id',  ParseUUIDPipe) id:  string,
    @Param('vid', ParseUUIDPipe) vid: string,
  ) {
    return this.adminService.deleteVideo(id, vid);
  }

  // ════════════════════════════════════════════════════════
  // ─── AUDIT LOGS ──────────────────────────────────────
  // ════════════════════════════════════════════════════════

  @Get('audit-logs')
  @ApiOperation({ summary: 'Audit logs paginés avec filtres' })
  @ApiQuery({ name: 'userId',     required: false })
  @ApiQuery({ name: 'action',     required: false })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'from',       required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'to',         required: false, example: '2025-12-31' })
  @ApiQuery({ name: 'page',       required: false, example: 1  })
  @ApiQuery({ name: 'limit',      required: false, example: 50 })
  getAuditLogs(@Query() query: QueryAuditBodyDto) {
    return this.adminService.getAuditLogs(query);
  }

  // ════════════════════════════════════════════════════════
  // ─── CALENDAR & EXPORT (conservés) ───────────────────
  // ════════════════════════════════════════════════════════

  @Get('bookings/calendar')
  @ApiOperation({ summary: 'Planning calendrier hebdomadaire' })
  getCalendar(@Query() query: QueryCalendarDto) {
    return this.adminService.getBookingCalendar(query);
  }

  @Get('export/orders')
  @ApiOperation({ summary: 'Export CSV commandes' })
  @ApiResponse({ status: 200, description: 'Fichier CSV téléchargeable' })
  async exportOrders(
    @Query() query: QueryExportDto,
    @Res() res: Response,
  ) {
    const csv      = await this.adminService.exportOrdersCsv(query);
    const filename = `commandes-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + csv);
  }
}