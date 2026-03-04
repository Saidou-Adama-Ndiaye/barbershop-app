// apps\api\src\modules\users\users.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sharp from 'sharp';
import { User, UserRole } from './entities/user.entity';
import { UserAddress } from './entities/user-address.entity';
import { MinioService } from '../storage/minio.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserAddress)
    private readonly addressRepository: Repository<UserAddress>,
    private readonly minioService: MinioService,
  ) {}

  // ─── Trouver par email AVEC password_hash ─────────────
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  // ─── Trouver par email SANS password_hash ─────────────
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  // ─── Trouver par ID ───────────────────────────────────
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
    });
  }

  // ─── Liste des coiffeurs actifs (calendrier) ──────────
  async findStaff(): Promise<Pick<User, 'id' | 'firstName' | 'lastName' | 'role'>[]> {
    return this.userRepository.find({
      where: {
        role: UserRole.COIFFEUR,
        isActive: true,
      },
      select: ['id', 'firstName', 'lastName', 'role'],
      order: { firstName: 'ASC' },
    });
  }

  // ─── Créer un utilisateur ─────────────────────────────
  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    role?: UserRole;
  }): Promise<User> {
    const existingUser = await this.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const user = this.userRepository.create({
      email:        data.email.toLowerCase(),
      passwordHash: data.password, // hashé par @BeforeInsert
      firstName:    data.firstName,
      lastName:     data.lastName,
      phone:        data.phone,
      role:         data.role ?? UserRole.CLIENT,
    });

    return this.userRepository.save(user);
  }

  // ─── Mettre à jour la date de dernière connexion ──────
  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }

  // ─── Mettre à jour le profil ──────────────────────────
  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    },
  ): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Vérifier unicité du téléphone si fourni
    if (data.phone && data.phone !== user.phone) {
      const existing = await this.userRepository.findOne({
        where: { phone: data.phone },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Ce numéro de téléphone est déjà utilisé');
      }
    }

    await this.userRepository.update(userId, {
      ...(data.firstName !== undefined && { firstName: data.firstName }),
      ...(data.lastName  !== undefined && { lastName:  data.lastName  }),
      ...(data.phone     !== undefined && { phone:     data.phone     }),
    });

    return this.userRepository.findOneOrFail({ where: { id: userId } });
  }

  // ─── Upload avatar → MinIO (resize 200×200) ───────────
  async uploadAvatar(userId: string, fileBuffer: Buffer, mimetype: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Valider le type MIME
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(mimetype)) {
      throw new BadRequestException(
        'Format non supporté. Utilisez JPEG, PNG ou WebP.',
      );
    }

    // Resize 200×200 avec sharp
    const resizedBuffer = await sharp(fileBuffer)
      .resize(200, 200, {
        fit:      'cover',
        position: 'centre',
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Supprimer l'ancien avatar si existant
    if (user.avatarUrl) {
      try {
        // Extraire la clé depuis l'URL signée ou la clé stockée
        const oldKey = user.avatarUrl.startsWith('avatars/')
          ? user.avatarUrl
          : null;
        if (oldKey) {
          await this.minioService.deleteFile(this.minioService.BUCKET_IMAGES, oldKey);
        }
      } catch {
        // Silencieux — on continue même si la suppression échoue
      }
    }

    // Générer une clé unique et uploader
    const key = this.minioService.generateKey('avatars', `${userId}.jpg`);
    await this.minioService.uploadFile(
      resizedBuffer,
      this.minioService.BUCKET_IMAGES,
      key,
      'image/jpeg',
      { userId },
    );

    // Sauvegarder la clé (pas l'URL signée) en base
    await this.userRepository.update(userId, { avatarUrl: key });

    return this.userRepository.findOneOrFail({ where: { id: userId } });
  }

  // ─── GET /users/me/addresses ──────────────────────────
  async getAddresses(userId: string): Promise<UserAddress[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'ASC' },
    });
  }

  // ─── POST /users/me/addresses ─────────────────────────
  async createAddress(
    userId: string,
    data: {
      label:     string;
      street:    string;
      city:      string;
      country?:  string;
      isDefault?: boolean;
    },
  ): Promise<UserAddress> {
    // Si isDefault → retirer le défaut des autres adresses
    if (data.isDefault) {
      await this.addressRepository.update(
        { userId },
        { isDefault: false },
      );
    }

    // Si c'est la première adresse → la mettre par défaut automatiquement
    const count = await this.addressRepository.count({ where: { userId } });
    const isDefault = data.isDefault ?? count === 0;

    const address = this.addressRepository.create({
      userId,
      label:     data.label,
      street:    data.street,
      city:      data.city,
      country:   data.country ?? 'Sénégal',
      isDefault,
    });

    return this.addressRepository.save(address);
  }

  // ─── PATCH /users/me/addresses/:id ────────────────────
  async updateAddress(
    userId: string,
    addressId: string,
    data: {
      label?:     string;
      street?:    string;
      city?:      string;
      country?:   string;
      isDefault?: boolean;
    },
  ): Promise<UserAddress> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Adresse introuvable');

    // Si on passe isDefault à true → retirer le défaut des autres
    if (data.isDefault) {
      await this.addressRepository.update(
        { userId },
        { isDefault: false },
      );
    }

    await this.addressRepository.update(addressId, {
      ...(data.label     !== undefined && { label:     data.label     }),
      ...(data.street    !== undefined && { street:    data.street    }),
      ...(data.city      !== undefined && { city:      data.city      }),
      ...(data.country   !== undefined && { country:   data.country   }),
      ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
    });

    return this.addressRepository.findOneOrFail({
      where: { id: addressId },
    });
  }

  // ─── DELETE /users/me/addresses/:id ───────────────────
  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });
    if (!address) throw new NotFoundException('Adresse introuvable');

    await this.addressRepository.delete(addressId);

    // Si on supprime l'adresse par défaut → mettre la plus ancienne par défaut
    if (address.isDefault) {
      const oldest = await this.addressRepository.findOne({
        where: { userId },
        order: { createdAt: 'ASC' },
      });
      if (oldest) {
        await this.addressRepository.update(oldest.id, { isDefault: true });
      }
    }
  }

  // ─── Trouver par verification token ───────────────────
  async findByVerificationToken(token: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.verificationToken')
      .where('user.verificationToken = :token', { token })
      .getOne();
  }

  // ─── Trouver par reset password token ─────────────────
  async findByResetToken(token: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.resetPasswordToken')
      .addSelect('user.resetPasswordExpiresAt')
      .where('user.resetPasswordToken = :token', { token })
      .getOne();
  }

  // ─── Définir le token de vérification email ───────────
  async setVerificationToken(userId: string, token: string): Promise<void> {
    await this.userRepository.update(userId, {
      verificationToken: token,
    });
  }

  // ─── Marquer l'email comme vérifié ────────────────────
  async markEmailVerified(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      isVerified:        true,
      verifiedAt:        new Date(),
      verificationToken: null,
    });
  }

  // ─── Définir le token de reset password ───────────────
  async setResetPasswordToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.userRepository.update(userId, {
      resetPasswordToken:      token,
      resetPasswordExpiresAt:  expiresAt,
    });
  }

  // ─── Mettre à jour le mot de passe (déjà hashé) ───────
  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepository
      .createQueryBuilder()
      .update()
      .set({ passwordHash: hashedPassword, resetPasswordToken: null, resetPasswordExpiresAt: null })
      .where('id = :id', { id: userId })
      .execute();
  }

  // ─── Générer URL signée pour l'avatar ─────────────────
  async getAvatarSignedUrl(avatarKey: string): Promise<string> {
    return this.minioService.getSignedUrl(
      this.minioService.BUCKET_IMAGES,
      avatarKey,
      900, // 15 minutes
    );
  }

  // ─── Changer le mot de passe (depuis le profil) ───────
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    // Charger l'utilisateur AVEC le hash du mot de passe
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Vérifier l'ancien mot de passe
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    // Hasher et sauvegarder le nouveau
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepository
      .createQueryBuilder()
      .update()
      .set({ passwordHash: hashed })
      .where('id = :id', { id: userId })
      .execute();
  }
}