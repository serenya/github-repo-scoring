import { Test, TestingModule } from '@nestjs/testing';
import { SearchRepositoriesUseCase } from './search-repositories.use-case';
import { GITHUB_REPOSITORY_PORT, IGithubRepositoryPort, IPaginatedRepositories } from '../ports/github-repository.port';
import { IRepository, Repository } from '../../domain/entities/repository.entity';

const NOW = new Date('2026-04-05T00:00:00.000Z');

function makeRepo(id: number, stars: number, updatedAt: Date = NOW): IRepository {
  return new Repository(id, `owner/repo${id}`, null, 'TypeScript', stars, 0, new Date('2020-01-01'), updatedAt, `https://github.com/owner/repo${id}`);
}

describe('SearchRepositoriesUseCase', () => {
  let useCase: SearchRepositoriesUseCase;
  let mockPort: jest.Mocked<IGithubRepositoryPort>;

  beforeEach(async () => {
    mockPort = { search: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchRepositoriesUseCase,
        { provide: GITHUB_REPOSITORY_PORT, useValue: mockPort },
      ],
    }).compile();

    useCase = module.get(SearchRepositoriesUseCase);
  });

  it('returns repos sorted by score descending', async () => {
    const repos: IRepository[] = [
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
    const paginatedResult: IPaginatedRepositories = { items: [], total: 42, page: 3, perPage: 5 };
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
