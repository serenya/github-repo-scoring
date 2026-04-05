import { GithubStubAdapter } from './github-stub.adapter';
import { RepositoryFilter } from '../../domain/value-objects/repository-filter.vo';

describe('GithubStubAdapter', () => {
  let adapter: GithubStubAdapter;

  beforeEach(() => {
    adapter = new GithubStubAdapter();
  });

  it('returns all 8 repos when no filters are applied', async () => {
    const result = await adapter.search(new RepositoryFilter(null, null, 1, 100));

    expect(result.total).toBe(8);
    expect(result.items).toHaveLength(8);
  });

  it('filters by language (exact, case-sensitive input)', async () => {
    const result = await adapter.search(new RepositoryFilter('TypeScript', null, 1, 100));

    expect(result.items.every((r) => r.language === 'TypeScript')).toBe(true);
    expect(result.total).toBe(3);
  });

  it('filters by language case-insensitively', async () => {
    const lower = await adapter.search(new RepositoryFilter('typescript', null, 1, 100));
    const upper = await adapter.search(new RepositoryFilter('TypeScript', null, 1, 100));

    expect(lower.total).toBe(upper.total);
    expect(lower.items.map((r) => r.id)).toEqual(upper.items.map((r) => r.id));
  });

  it('filters by created_after date', async () => {
    const createdAfter = new Date('2015-01-01');
    const result = await adapter.search(new RepositoryFilter(null, createdAfter, 1, 100));

    expect(result.items.every((r) => r.createdAt >= createdAfter)).toBe(true);
    // expressjs/express (2009), facebook/react (2013), vuejs/vue (2013), django/django (2012) are excluded
    expect(result.total).toBeLessThan(8);
  });

  it('combines language and created_after filters', async () => {
    const result = await adapter.search(new RepositoryFilter('Python', new Date('2015-01-01'), 1, 100));

    expect(result.items.every((r) => r.language === 'Python')).toBe(true);
    expect(result.items.every((r) => r.createdAt >= new Date('2015-01-01'))).toBe(true);
    // Only tiangolo/fastapi (2018) matches; django/django (2012) is excluded by date
    expect(result.total).toBe(1);
  });

  it('applies pagination: page=1, per_page=2 returns first 2 items', async () => {
    const result = await adapter.search(new RepositoryFilter(null, null, 1, 2));

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(8);
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(2);
  });

  it('applies pagination: page=3, per_page=3 returns items 7-8', async () => {
    const result = await adapter.search(new RepositoryFilter(null, null, 3, 3));

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(8);
  });

  it('returns empty items and total=0 when language has no matches', async () => {
    const result = await adapter.search(new RepositoryFilter('Haskell', null, 1, 10));

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns correct page and perPage in result', async () => {
    const result = await adapter.search(new RepositoryFilter(null, null, 2, 5));

    expect(result.page).toBe(2);
    expect(result.perPage).toBe(5);
  });
});
