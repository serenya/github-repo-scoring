import { Test, TestingModule } from '@nestjs/testing';
import { GitHubReposController } from './github-repos.controller';
import { SearchGitHubReposUseCase } from './application/use-cases/search-github-repos.use-case';
import { SearchGitHubReposOutput } from './application/dtos/search-github-repos.dto';
import { GitHubRepo } from './domain/entities/github-repo.entity';
import { ScoredGitHubRepo } from './domain/entities/scored-github-repo.entity';
import { ScoreBreakdown } from './domain/value-objects/score-breakdown.vo';
import { SearchQueryDto } from './dto/search-query.dto';

const NOW = new Date('2026-04-05T00:00:00.000Z');

function makeScoredRepo(id: number, score: number): ScoredGitHubRepo {
  const repo = new GitHubRepo(id, `owner/repo${id}`, 'A description', 'TypeScript', 1000, 100, new Date('2020-01-01'), NOW, `https://github.com/owner/repo${id}`);
  return new ScoredGitHubRepo(repo, score, new ScoreBreakdown(50, 40, score));
}

function mockRequest(queryOverrides: Record<string, string> = {}) {
  return {
    protocol: 'http',
    get: (header: string) => (header === 'host' ? 'localhost:3000' : ''),
    path: '/api/v1/github-repos/search',
    query: queryOverrides,
  } as any;
}

describe('GitHubReposController', () => {
  let controller: GitHubReposController;
  let mockUseCase: jest.Mocked<SearchGitHubReposUseCase>;

  beforeEach(async () => {
    mockUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitHubReposController],
      providers: [{ provide: SearchGitHubReposUseCase, useValue: mockUseCase }],
    }).compile();

    controller = module.get(GitHubReposController);
  });

  it('maps query DTO to use-case input correctly', async () => {
    const output: SearchGitHubReposOutput = { items: [], total: 0, page: 1, perPage: 10 };
    mockUseCase.execute.mockResolvedValue(output);

    const query = Object.assign(new SearchQueryDto(), { language: 'TypeScript', created_after: '2020-01-01', page: 2, per_page: 5 });
    await controller.search(query, mockRequest());

    expect(mockUseCase.execute).toHaveBeenCalledWith({
      language: 'TypeScript',
      createdAfter: new Date('2020-01-01'),
      page: 2,
      perPage: 5,
    });
  });

  it('passes null for omitted language and created_after', async () => {
    mockUseCase.execute.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10 });

    const query = Object.assign(new SearchQueryDto(), { page: 1, per_page: 10 });
    await controller.search(query, mockRequest());

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ language: null, createdAfter: null }),
    );
  });

  it('maps use-case output to response DTO correctly', async () => {
    const scored = makeScoredRepo(1, 75);
    mockUseCase.execute.mockResolvedValue({ items: [scored], total: 1, page: 1, perPage: 10 });

    const query = Object.assign(new SearchQueryDto(), { page: 1, per_page: 10 });
    const response = await controller.search(query, mockRequest());

    expect(response.items).toHaveLength(1);
    expect(response.items[0].url).toBe('https://github.com/owner/repo1');
    expect(response.items[0].score).toBe(75);
    expect(response.items[0].language).toBe('TypeScript');
    expect(response.items[0].created_at).toBe('2020-01-01T00:00:00.000Z');
  });

  it('computes total_pages correctly', async () => {
    const items = [makeScoredRepo(1, 80), makeScoredRepo(2, 70)];
    mockUseCase.execute.mockResolvedValue({ items, total: 8, page: 1, perPage: 3 });

    const query = Object.assign(new SearchQueryDto(), { page: 1, per_page: 3 });
    const response = await controller.search(query, mockRequest());

    expect(response.meta.total_pages).toBe(3);
  });

  it('returns total_pages=0 when total is 0', async () => {
    mockUseCase.execute.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10 });

    const query = Object.assign(new SearchQueryDto(), { page: 1, per_page: 10 });
    const response = await controller.search(query, mockRequest());

    expect(response.meta.total_pages).toBe(0);
  });

  describe('links', () => {
    it('self points to the current page', async () => {
      mockUseCase.execute.mockResolvedValue({ items: [], total: 30, page: 2, perPage: 10 });

      const query = Object.assign(new SearchQueryDto(), { page: 2, per_page: 10 });
      const response = await controller.search(query, mockRequest({ page: '2', per_page: '10' }));

      expect(response.links.self).toContain('page=2');
    });

    it('first always points to page 1', async () => {
      mockUseCase.execute.mockResolvedValue({ items: [], total: 30, page: 3, perPage: 10 });

      const query = Object.assign(new SearchQueryDto(), { page: 3, per_page: 10 });
      const response = await controller.search(query, mockRequest({ page: '3', per_page: '10' }));

      expect(response.links.first).toContain('page=1');
    });

    it('last points to the final page', async () => {
      mockUseCase.execute.mockResolvedValue({ items: [], total: 25, page: 1, perPage: 10 });

      const query = Object.assign(new SearchQueryDto(), { page: 1, per_page: 10 });
      const response = await controller.search(query, mockRequest({ page: '1', per_page: '10' }));

      expect(response.links.last).toContain('page=3');
    });

    it('next points to page+1 when not on last page', async () => {
      mockUseCase.execute.mockResolvedValue({ items: [], total: 30, page: 2, perPage: 10 });

      const query = Object.assign(new SearchQueryDto(), { page: 2, per_page: 10 });
      const response = await controller.search(query, mockRequest({ page: '2', per_page: '10' }));

      expect(response.links.next).toContain('page=3');
    });

    it('next is null on the last page', async () => {
      mockUseCase.execute.mockResolvedValue({ items: [], total: 20, page: 2, perPage: 10 });

      const query = Object.assign(new SearchQueryDto(), { page: 2, per_page: 10 });
      const response = await controller.search(query, mockRequest({ page: '2', per_page: '10' }));

      expect(response.links.next).toBeNull();
    });

    it('prev points to page-1 when not on first page', async () => {
      mockUseCase.execute.mockResolvedValue({ items: [], total: 30, page: 3, perPage: 10 });

      const query = Object.assign(new SearchQueryDto(), { page: 3, per_page: 10 });
      const response = await controller.search(query, mockRequest({ page: '3', per_page: '10' }));

      expect(response.links.prev).toContain('page=2');
    });

    it('prev is null on the first page', async () => {
      mockUseCase.execute.mockResolvedValue({ items: [], total: 30, page: 1, perPage: 10 });

      const query = Object.assign(new SearchQueryDto(), { page: 1, per_page: 10 });
      const response = await controller.search(query, mockRequest({ page: '1', per_page: '10' }));

      expect(response.links.prev).toBeNull();
    });

    it('last and next are null when there are no results', async () => {
      mockUseCase.execute.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10 });

      const query = Object.assign(new SearchQueryDto(), { page: 1, per_page: 10 });
      const response = await controller.search(query, mockRequest({ page: '1', per_page: '10' }));

      expect(response.links.last).toBeNull();
      expect(response.links.next).toBeNull();
    });

    it('preserves extra query params (e.g. language) in all links', async () => {
      mockUseCase.execute.mockResolvedValue({ items: [], total: 30, page: 1, perPage: 10 });

      const query = Object.assign(new SearchQueryDto(), { language: 'TypeScript', page: 1, per_page: 10 });
      const response = await controller.search(query, mockRequest({ language: 'TypeScript', page: '1', per_page: '10' }));

      expect(response.links.self).toContain('language=TypeScript');
      expect(response.links.next).toContain('language=TypeScript');
      expect(response.links.last).toContain('language=TypeScript');
    });
  });
});
