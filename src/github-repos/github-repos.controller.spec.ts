import { Test, TestingModule } from '@nestjs/testing';
import { GithubReposController } from './github-repos.controller';
import { SearchRepositoriesUseCase } from './application/use-cases/search-repositories.use-case';
import { SearchRepositoriesOutput } from './application/dtos/search-repositories.dto';
import { Repository } from './domain/entities/repository.entity';
import { ScoredRepository } from './domain/entities/scored-repository.entity';
import { ScoreBreakdown } from './domain/value-objects/score-breakdown.vo';
import { SearchQueryDto } from './dto/search-query.dto';

const NOW = new Date('2026-04-05T00:00:00.000Z');

function makeScoredRepo(id: number, score: number): ScoredRepository {
  const repo = new Repository(id, `owner/repo${id}`, 'A description', 'TypeScript', 1000, 100, new Date('2020-01-01'), NOW, `https://github.com/owner/repo${id}`);
  return new ScoredRepository(repo, score, new ScoreBreakdown(50, 40, score));
}

describe('GithubReposController', () => {
  let controller: GithubReposController;
  let mockUseCase: jest.Mocked<SearchRepositoriesUseCase>;

  beforeEach(async () => {
    mockUseCase = { execute: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GithubReposController],
      providers: [{ provide: SearchRepositoriesUseCase, useValue: mockUseCase }],
    }).compile();

    controller = module.get(GithubReposController);
  });

  it('maps query DTO to use-case input correctly', async () => {
    const output: SearchRepositoriesOutput = { items: [], total: 0, page: 1, perPage: 10 };
    mockUseCase.execute.mockResolvedValue(output);

    const query = Object.assign(new SearchQueryDto(), { language: 'TypeScript', created_after: '2020-01-01', page: 2, per_page: 5 });
    await controller.search(query);

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
    await controller.search(query);

    expect(mockUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ language: null, createdAfter: null }),
    );
  });

  it('maps use-case output to response DTO correctly', async () => {
    const scored = makeScoredRepo(1, 75);
    mockUseCase.execute.mockResolvedValue({ items: [scored], total: 1, page: 1, perPage: 10 });

    const query = Object.assign(new SearchQueryDto(), { page: 1, per_page: 10 });
    const response = await controller.search(query);

    expect(response.items).toHaveLength(1);
    expect(response.items[0].id).toBe(1);
    expect(response.items[0].score).toBe(75);
    expect(response.items[0].breakdown.starsScore).toBe(50);
    expect(response.items[0].createdAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('computes totalPages correctly', async () => {
    const items = [makeScoredRepo(1, 80), makeScoredRepo(2, 70)];
    mockUseCase.execute.mockResolvedValue({ items, total: 8, page: 1, perPage: 3 });

    const query = Object.assign(new SearchQueryDto(), { page: 1, per_page: 3 });
    const response = await controller.search(query);

    expect(response.meta.totalPages).toBe(3);
  });

  it('returns totalPages=0 when total is 0', async () => {
    mockUseCase.execute.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10 });

    const query = Object.assign(new SearchQueryDto(), { page: 1, per_page: 10 });
    const response = await controller.search(query);

    expect(response.meta.totalPages).toBe(0);
  });
});
