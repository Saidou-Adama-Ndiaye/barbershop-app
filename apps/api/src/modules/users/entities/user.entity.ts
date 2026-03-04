// apps\api\src\modules\users\entities\user.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import * as bcrypt from 'bcrypt';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  COIFFEUR = 'coiffeur_professionnel',
  CLIENT = 'client',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ unique: true, length: 20, nullable: true })
  phone: string;

  @Column({ name: 'password_hash', nullable: true, select: false })
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Index()
  @Column({ type: 'enum', enum: UserRole, default: UserRole.CLIENT })
  role: UserRole;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  // ─── Vérification email ───────────────────────────────
  @Column({ name: 'verification_token', type: 'text', nullable: true, select: false })
  verificationToken: string | null;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  // ─── Réinitialisation mot de passe ────────────────────
  @Column({ name: 'reset_password_token', type: 'text', nullable: true, select: false })
  resetPasswordToken: string | null;

  @Column({ name: 'reset_password_expires_at', type: 'timestamptz', nullable: true })
  resetPasswordExpiresAt: Date | null;

  // ─── OAuth ────────────────────────────────────────────
  @Column({ name: 'oauth_provider', length: 50, nullable: true })
  oauthProvider: string;

  @Column({ name: 'oauth_id', length: 255, nullable: true })
  oauthId: string;

  @Column({ name: 'last_login_at', nullable: true, type: 'timestamptz' })
  lastLoginAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  async hashPasswordBeforeInsert() {
    if (this.passwordHash) {
      this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    }
  }

  async comparePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }

  toSafeObject(): Omit<User, 'passwordHash' | 'comparePassword' | 'toSafeObject' | 'hashPasswordBeforeInsert'> {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...safe } = this;
      return safe as Omit<User, 'passwordHash' | 'comparePassword' | 'toSafeObject' | 'hashPasswordBeforeInsert'>;
  }
}