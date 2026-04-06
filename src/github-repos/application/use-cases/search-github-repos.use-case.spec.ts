import { Test, TestingModule } from '@nestjs/testing';
import { SearchGitHubReposUseCase } from './search-github-repos.use-case';
import { GITHUB_PORT, GitHubPort, PaginatedGitHubRepos } from '../ports/github.port';
import { GitHubRepo } from '../../domain/entities/github-repo.entity';

const NOW = new Date('2026-04-05T00:00:00.000Z');

function makeRepo(id: number, stars: number, updatedAt: Date = NOW): GitHubRepo {
  return new GitHubRepo(id, `owner/repo${id}`, null, 'TypeScript', stars, 0, new Date('2020-01-01'), updatedAt, `https://github.com/owner/repo${id}`);
}

describe('SearchGitHubReposUseCase', () => {
  let useCase: SearchGitHubReposUseCase;
  let mockPort: jest.Mocked<GitHubPort>;

  beforeEach(async () => {
    mockPort = { search: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchGitHubReposUseCase,
        { provide: GITHUB_PORT, useValue: mockPort },
      ],
    }).compile();

    useCase = module.get(SearchGitHubReposUseCase);
  });

  it('returns repos sorted by score descending', async () => {
    const repos: GitHubRepo[] = [
      makeRepo(1, 100),    // lower stars
      makeRepo(2, 50_000), // higher stars
      makeRepo(3, 1_000),  // mid stars
    ];
    mockPort.search.mockResolvedValue({ items: repos, total: 3, page: 1, perPage: 10 });

    const result = await useCase.execute({ language: null, createdAfter: null, page: 1, perPage: 10 });

    expect(result.items[0].repository.id).toBe(2);
    expect(result.items[1].repository.id).toBe(3);
    expect(result.items[2].repository.id).toBe(1);
  });

  it('passes filter values correctly to the port', async () => {
    mockPort.search.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10 });
    const createdAfter = new Date('2020-01-01');

    await useCase.execute({ language: 'TypeScript', createdAfter, page: 2, perPage: 5 });

    const filter = mockPort.search.mock.calls[0][0];
    expect(filter.language).toBe('TypeScript');
    expect(filter.createdAfter).toBe(createdAfter);
    expect(filter.page).toBe(2);
    expect(filter.perPage).toBe(5);
  });

  it('passes through pagination metadata from the port', async () => {
    const paginatedResult: PaginatedGitHubRepos = { items: [], total: 42, page: 3, perPage: 5 };
    mockPort.search.mockResolvedValue(paginatedResult);

    const result = await useCase.execute({ language: null, createdAfter: null, page: 3, perPage: 5 });

    expect(result.total).toBe(42);
    expect(result.page).toBe(3);
    expect(result.perPage).toBe(5);
  });

  it('returns empty items when port returns no results', async () => {
    mockPort.search.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10 });

    const result = await useCase.execute({ language: null, createdAfter: null, page: 1, perPage: 10 });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
