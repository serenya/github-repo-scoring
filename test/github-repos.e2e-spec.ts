import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('GithubReposController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /github-repos/search', () => {
    it('returns 200 with all repos when no filters applied', async () => {
      const res = await request(app.getHttpServer()).get('/github-repos/search').expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBe(8);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.perPage).toBe(10);
    });

    it('returns repos sorted by score descending', async () => {
      const res = await request(app.getHttpServer()).get('/github-repos/search').expect(200);

      const scores: number[] = res.body.items.map((i: any) => i.score);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    });

    it('each item has expected fields', async () => {
      const res = await request(app.getHttpServer()).get('/github-repos/search').expect(200);

      const item = res.body.items[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('fullName');
      expect(item).toHaveProperty('language');
      expect(item).toHaveProperty('stars');
      expect(item).toHaveProperty('forks');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('updatedAt');
      expect(item).toHaveProperty('htmlUrl');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('breakdown');
      expect(item.breakdown).toHaveProperty('starsScore');
      expect(item.breakdown).toHaveProperty('forksScore');
      expect(item.breakdown).toHaveProperty('recencyScore');
    });

    it('filters by language', async () => {
      const res = await request(app.getHttpServer())
        .get('/github-repos/search?language=TypeScript')
        .expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items.every((i: any) => i.language === 'TypeScript')).toBe(true);
    });

    it('filters by language case-insensitively', async () => {
      const lower = await request(app.getHttpServer()).get('/github-repos/search?language=typescript').expect(200);
      const upper = await request(app.getHttpServer()).get('/github-repos/search?language=TypeScript').expect(200);

      expect(lower.body.meta.total).toBe(upper.body.meta.total);
    });

    it('filters by created_after date', async () => {
      const res = await request(app.getHttpServer())
        .get('/github-repos/search?created_after=2015-01-01')
        .expect(200);

      expect(res.body.items.every((i: any) => new Date(i.createdAt) >= new Date('2015-01-01'))).toBe(true);
      expect(res.body.meta.total).toBeLessThan(8);
    });

    it('applies pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/github-repos/search?page=1&per_page=3')
        .expect(200);

      expect(res.body.items).toHaveLength(3);
      expect(res.body.meta.total).toBe(8);
      expect(res.body.meta.perPage).toBe(3);
      expect(res.body.meta.totalPages).toBe(3);
    });

    it('returns empty items for a language with no matches', async () => {
      const res = await request(app.getHttpServer())
        .get('/github-repos/search?language=Haskell')
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
      expect(res.body.meta.totalPages).toBe(0);
    });

    it('returns 400 when page is less than 1', async () => {
      await request(app.getHttpServer()).get('/github-repos/search?page=0').expect(400);
    });

    it('returns 400 when per_page exceeds 100', async () => {
      await request(app.getHttpServer()).get('/github-repos/search?per_page=200').expect(400);
    });

    it('returns 400 for an invalid created_after date', async () => {
      await request(app.getHttpServer()).get('/github-repos/search?created_after=not-a-date').expect(400);
    });
  });
});
