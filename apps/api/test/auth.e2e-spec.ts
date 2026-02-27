import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { AuditModule } from '../src/modules/audit/audit.module';
import { User } from '../src/modules/users/entities/user.entity';
import { RefreshToken } from '../src/modules/auth/entities/refresh-token.entity';
import { AuditLog } from '../src/modules/audit/entities/audit-log.entity';

describe('Auth (E2E)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Config avec variables inline pour les tests
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              JWT_SECRET: 'test_jwt_secret_32_chars_minimum_ok',
              JWT_EXPIRES_IN: '15m',
              JWT_REFRESH_SECRET: 'test_refresh_secret_32_chars_min_ok',
              JWT_REFRESH_EXPIRES_IN: '7d',
              COOKIE_SECRET: 'test_cookie_secret_32_chars_ok',
              DB_HOST: 'localhost',
              DB_PORT: 5432,
              DB_USERNAME: 'barber_user',
              DB_PASSWORD: 'barber_secret_2025',
              DB_NAME: 'barbershop_dev',
            }),
          ],
        }),

        // Base de données de test — même PostgreSQL Docker
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'barber_user',
          password: 'barber_secret_2025',
          database: 'barbershop_dev',
          entities: [User, RefreshToken, AuditLog],
          synchronize: false,
          logging: false,
        }),

        ThrottlerModule.forRoot({
          throttlers: [{ name: 'default', ttl: 60000, limit: 100 }],
        }),

        PassportModule,
        AuthModule,
        UsersModule,
        AuditModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Même config que main.ts
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser('test_cookie_secret_32_chars_ok'));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /auth/register ──────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('✅ 201 — inscription avec données valides', async () => {
      const uniqueEmail = `e2e_${Date.now()}@barbershop.sn`;

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Test@2025!',
          firstName: 'Moussa',
          lastName: 'Diallo',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'Inscription réussie');
      expect(res.body).toHaveProperty('userId');
    });

    it('❌ 409 — email déjà utilisé', async () => {
      const uniqueEmail = `duplicate_${Date.now()}@barbershop.sn`;

      // Premier register
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Test@2025!',
          firstName: 'Moussa',
          lastName: 'Diallo',
        });

      // Deuxième register avec le même email
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Test@2025!',
          firstName: 'Moussa',
          lastName: 'Diallo',
        });

      expect(res.status).toBe(409);
    });

    it('❌ 400 — mot de passe trop faible', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'weak@barbershop.sn',
          password: '123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(res.status).toBe(400);
    });
  });

  // ─── POST /auth/login ─────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    const testEmail = `login_e2e_${Date.now()}@barbershop.sn`;

    beforeAll(async () => {
      // Créer l'utilisateur de test
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'Test@2025!',
          firstName: 'Login',
          lastName: 'Test',
        });
    });

    it('✅ 200 — login réussi + cookie refresh_token présent', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'Test@2025!' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testEmail);

      // Vérifier que le cookie httpOnly est bien présent
        const rawCookies = res.headers['set-cookie'];
        const cookies: string[] = Array.isArray(rawCookies)
        ? rawCookies
        : [rawCookies as string];
        const refreshCookie = cookies.find((c: string) =>
        c.startsWith('refresh_token='),
        );
        expect(refreshCookie).toBeDefined();
        expect(refreshCookie).toContain('HttpOnly');

      // Sauvegarder pour les tests suivants
      accessToken = res.body.accessToken;
    });

    it('❌ 401 — mauvais mot de passe', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testEmail, password: 'WrongPass@999' });

      expect(res.status).toBe(401);
    });

    it('❌ 401 — email inexistant', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@barbershop.sn', password: 'Test@2025!' });

      expect(res.status).toBe(401);
    });
  });

  // ─── GET /auth/profile ────────────────────────────────────

  describe('GET /api/v1/auth/profile', () => {
    it('✅ 200 — profil retourné avec token valide', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('role');
    });

    it('❌ 401 — sans token', async () => {
      const res = await request(app.getHttpServer()).get(
        '/api/v1/auth/profile',
      );

      expect(res.status).toBe(401);
    });

    it('❌ 401 — token invalide', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer token_bidon_invalide');

      expect(res.status).toBe(401);
    });
  });

  // ─── POST /auth/refresh ───────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('✅ 200 — nouveau accessToken avec cookie valide', async () => {
      const refreshEmail = `refresh_e2e_${Date.now()}@barbershop.sn`;

      // Register + Login pour obtenir le cookie
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: refreshEmail,
          password: 'Test@2025!',
          firstName: 'Refresh',
          lastName: 'Test',
        });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: refreshEmail, password: 'Test@2025!' });

      const cookies = loginRes.headers['set-cookie'];

      // Utiliser le cookie pour refresh
        const rawLoginCookies = loginRes.headers['set-cookie'];
        const loginCookies: string[] = Array.isArray(rawLoginCookies)
        ? rawLoginCookies
        : [rawLoginCookies as string];

        // Utiliser le cookie pour refresh
        const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', loginCookies);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('accessToken');
        // On vérifie que le token est bien un JWT valide (format: xxxxx.xxxxx.xxxxx)
        expect(res.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
        // On vérifie qu'un nouveau cookie refresh_token a bien été émis (rotation)
        const newCookies = res.headers['set-cookie'];
        expect(newCookies).toBeDefined();
        const newRawCookies = Array.isArray(newCookies)
        ? newCookies
        : [newCookies as string];
        const newRefreshCookie = newRawCookies.find((c: string) =>
        c.startsWith('refresh_token='),
        );
        expect(newRefreshCookie).toBeDefined();
    });

    it('❌ 401 — sans cookie refresh_token', async () => {
      const res = await request(app.getHttpServer()).post(
        '/api/v1/auth/refresh',
      );

      expect(res.status).toBe(401);
    });
  });
});