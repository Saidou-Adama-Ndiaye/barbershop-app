// .\.\apps\api\test\app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Ce test vérifie que l'application démarre correctement
// et que le préfixe global /api/v1 est bien appliqué
describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / → 404 (aucune route à la racine, préfixe api/v1 actif)', async () => {
    const res = await request(app.getHttpServer()).get('/');
    expect(res.status).toBe(404);
  });
});
