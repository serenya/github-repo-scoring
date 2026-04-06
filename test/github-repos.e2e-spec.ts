import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { GITHUB_PORT, GitHubPort, PaginatedGitHubRepos } from '../src/github-repos/application/ports/github.port';
import { GitHubRepoFilter } from '../src/github-repos/domain/value-objects/github-repo-filter.vo';
import { GitHubRepo } from '../src/github-repos/domain/entities/github-repo.entity';

// In-memory test double that mirrors the original stub data
const STUB_REPOS = [
  new GitHubRepo(1, 'nestjs/nest', 'NestJS framework', 'TypeScript', 68000, 7600, new Date('2017-02-04'), new Date('2026-03-30'), 'https://github.com/nestjs/nest'),
  new GitHubRepo(2, 'facebook/react', 'React library', 'TypeScript', 225000, 46000, new Date('2013-05-24'), new Date('2026-03-28'), 'https://github.com/facebook/react'),
  new GitHubRepo(3, 'microsoft/TypeScript', 'TypeScript language', 'TypeScript', 101000, 12500, new Date('2014-06-19'), new Date('2026-04-01'), 'https://github.com/microsoft/TypeScript'),
  new GitHubRepo(4, 'vuejs/vue', 'Vue.js framework', 'JavaScript', 207000, 33500, new Date('2013-07-29'), new Date('2026-02-10'), 'https://github.com/vuejs/vue'),
  new GitHubRepo(5, 'expressjs/express', 'Express framework', 'JavaScript', 65000, 15000, new Date('2009-06-26'), new Date('2024-11-01'), 'https://github.com/expressjs/express'),
  new GitHubRepo(6, 'django/django', 'Django framework', 'Python', 81000, 31500, new Date('2012-04-28'), new Date('2026-03-25'), 'https://github.com/django/django'),
  new GitHubRepo(7, 'tiangolo/fastapi', 'FastAPI framework', 'Python', 79000, 6700, new Date('2018-12-08'), new Date('2026-03-15'), 'https://github.com/tiangolo/fastapi'),
  new GitHubRepo(8, 'golang/go', 'Go language', 'Go', 125000, 17800, new Date('2014-08-19'), new Date('2026-04-02'), 'https://github.com/golang/go'),
];

class E2EGitHubRepositoryAdapter implements GitHubPort {
  async search(filter: GitHubRepoFilter): Promise<PaginatedGitHubRepos> {
    let results = [...STUB_REPOS];

    if (filter.language) {
      const lang = filter.language.toLowerCase();
      results = results.filter((r) => r.language?.toLowerCase() === lang);
    }
    if (filter.createdAfter) {
      results = results.filter((r) => r.createdAt >= filter.createdAfter!);
    }

    const total = results.length;
    const start = (filter.page - 1) * filter.perPage;
    return { items: results.slice(start, start + filter.perPage), total, page: filter.page, perPage: filter.perPage };
  }
}

describe('GitHubReposController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GITHUB_PORT)
      .useClass(E2EGitHubRepositoryAdapter)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/github-repos/search', () => {
    it('returns 200 with all repos when no filters applied', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/github-repos/search').expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.meta.total).toBe(8);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.per_page).toBe(10);
    });

    it('returns repos sorted by score descending', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/github-repos/search').expect(200);

      const scores: number[] = res.body.items.map((i: any) => i.score);
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    });

    it('each item has expected fields', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/github-repos/search').expect(200);

      const item = res.body.items[0];
      expect(item).toHaveProperty('language');
      expect(item).toHaveProperty('url');
      expect(item).toHaveProperty('score');
      expect(item).toHaveProperty('created_at');
      expect(Object.keys(item)).toHaveLength(4);
    });

    it('filters by language', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/github-repos/search?language=TypeScript')
        .expect(200);

      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items.every((i: any) => i.language === 'TypeScript')).toBe(true);
    });

    it('filters by language case-insensitively', async () => {
      const lower = await request(app.getHttpServer()).get('/api/v1/github-repos/search?language=typescript').expect(200);
      const upper = await request(app.getHttpServer()).get('/api/v1/github-repos/search?language=TypeScript').expect(200);

      expect(lower.body.meta.total).toBe(upper.body.meta.total);
    });

    it('filters by created_after date', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/github-repos/search?created_after=2015-01-01')
        .expect(200);

      expect(res.body.items.every((i: any) => new Date(i.created_at) >= new Date('2015-01-01'))).toBe(true);
      expect(res.body.meta.total).toBeLessThan(8);
    });

    it('applies pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/github-repos/search?page=1&per_page=3')
        .expect(200);

      expect(res.body.items).toHaveLength(3);
      expect(res.body.meta.total).toBe(8);
      expect(res.body.meta.per_page).toBe(3);
      expect(res.body.meta.total_pages).toBe(3);
    });

    it('returns empty items for a language with no matches', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/github-repos/search?language=Haskell')
        .expect(200);

      expect(res.body.items).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
      expect(res.body.meta.total_pages).toBe(0);
    });

    it('returns 400 when page is less than 1', async () => {
      await request(app.getHttpServer()).get('/api/v1/github-repos/search?page=0').expect(400);
    });

    it('returns 400 when per_page exceeds 100', async () => {
      await request(app.getHttpServer()).get('/api/v1/github-repos/search?per_page=200').expect(400);
    });

    it('returns 400 for an invalid created_after date', async () => {
      await request(app.getHttpServer()).get('/api/v1/github-repos/search?created_after=not-a-date').expect(400);
    });
  });
});
