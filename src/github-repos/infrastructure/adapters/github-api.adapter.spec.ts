import { Test } from '@nestjs/testing';
import { InternalServerErrorException, RequestTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import { GitHubApiAdapter } from './github-api.adapter';
import { GitHubRepoFilter } from '../../domain/value-objects/github-repo-filter.vo';
import { APP_CONFIG } from '../../../config/app.config';

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockConfig = {
  githubApiBase: 'https://api.github.com',
  githubApiVersion: '2026-03-10',
  githubToken: undefined,
  githubApiTimeoutMs: 5000,
};

function makeGitHubItem(overrides: Partial<{
  id: number; full_name: string; description: string | null; language: string | null;
  stargazers_count: number; forks_count: number; created_at: string; updated_at: string; html_url: string;
}> = {}) {
  return {
    id: overrides.id ?? 1,
    full_name: overrides.full_name ?? 'owner/repo',
    description: overrides.description ?? null,
    language: overrides.language ?? 'TypeScript',
    stargazers_count: overrides.stargazers_count ?? 1000,
    forks_count: overrides.forks_count ?? 100,
    created_at: overrides.created_at ?? '2020-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
    html_url: overrides.html_url ?? 'https://github.com/owner/repo',
  };
}

function mockResponse(totalCount: number, items: ReturnType<typeof makeGitHubItem>[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: jest.fn().mockResolvedValueOnce({ total_count: totalCount, items }),
  });
}

describe('GitHubApiAdapter', () => {
  let adapter: GitHubApiAdapter;

  beforeEach(async () => {
    mockFetch.mockClear();
    const module = await Test.createTestingModule({
      providers: [
        GitHubApiAdapter,
        { provide: APP_CONFIG, useValue: mockConfig },
      ],
    }).compile();
    adapter = module.get(GitHubApiAdapter);
  });

  describe('search', () => {
    it('maps GitHub API response to GitHubRepository correctly', async () => {
      const item = makeGitHubItem({ id: 42, full_name: 'nestjs/nest', language: 'TypeScript', stargazers_count: 68000, forks_count: 7600 });
      mockResponse(1, [item]);

      const result = await adapter.search(new GitHubRepoFilter(null, null, 1, 10));

      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      const repo = result.items[0];
      expect(repo.id).toBe(42);
      expect(repo.fullName).toBe('nestjs/nest');
      expect(repo.language).toBe('TypeScript');
      expect(repo.stars).toBe(68000);
      expect(repo.forks).toBe(7600);
      expect(repo.createdAt).toBeInstanceOf(Date);
      expect(repo.updatedAt).toBeInstanceOf(Date);
    });

    it('builds query with language filter', async () => {
      mockResponse(0, []);

      await adapter.search(new GitHubRepoFilter('TypeScript', null, 1, 10));

      const url: string = mockFetch.mock.calls[0][0];
      expect(url).toContain('q=language%3ATypeScript');
    });

    it('builds query with created_after filter', async () => {
      mockResponse(0, []);

      await adapter.search(new GitHubRepoFilter(null, new Date('2020-06-15'), 1, 10));

      const url: string = mockFetch.mock.calls[0][0];
      expect(url).toContain('created%3A%3E2020-06-15');
    });

    it('builds query with both language and created_after filters', async () => {
      mockResponse(0, []);

      await adapter.search(new GitHubRepoFilter('Python', new Date('2019-01-01'), 1, 10));

      const url: string = mockFetch.mock.calls[0][0];
      expect(url).toContain('language%3APython');
      expect(url).toContain('created%3A%3E2019-01-01');
    });

    it('falls back to stars:>0 when no filters are provided', async () => {
      mockResponse(0, []);

      await adapter.search(new GitHubRepoFilter(null, null, 1, 10));

      const url: string = mockFetch.mock.calls[0][0];
      expect(url).toContain('stars%3A%3E0');
    });

    it('passes page and per_page to the API', async () => {
      mockResponse(0, []);

      await adapter.search(new GitHubRepoFilter(null, null, 3, 25));

      const url: string = mockFetch.mock.calls[0][0];
      expect(url).toContain('page=3');
      expect(url).toContain('per_page=25');
    });

    it('passes pagination metadata through from the API response', async () => {
      mockResponse(150, []);

      const result = await adapter.search(new GitHubRepoFilter(null, null, 2, 10));

      expect(result.total).toBe(150);
      expect(result.page).toBe(2);
      expect(result.perPage).toBe(10);
    });

    it('adds Authorization header when githubToken is configured', async () => {
      const module = await Test.createTestingModule({
        providers: [
          GitHubApiAdapter,
          { provide: APP_CONFIG, useValue: { ...mockConfig, githubToken: 'ghp_test123' } },
        ],
      }).compile();
      const authenticatedAdapter = module.get(GitHubApiAdapter);
      mockResponse(0, []);

      await authenticatedAdapter.search(new GitHubRepoFilter(null, null, 1, 10));

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBe('Bearer ghp_test123');
    });

    it('omits Authorization header when githubToken is not configured', async () => {
      mockResponse(0, []);

      await adapter.search(new GitHubRepoFilter(null, null, 1, 10));

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBeUndefined();
    });

    it('throws RequestTimeoutException on timeout', async () => {
      const timeoutError = new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      mockFetch.mockRejectedValueOnce(timeoutError);

      await expect(adapter.search(new GitHubRepoFilter(null, null, 1, 10))).rejects.toThrow(
        RequestTimeoutException,
      );
    });

    it('throws ServiceUnavailableException on 403 rate limit', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 403, statusText: 'Forbidden' });

      await expect(adapter.search(new GitHubRepoFilter(null, null, 1, 10))).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws InternalServerErrorException on other non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' });

      await expect(adapter.search(new GitHubRepoFilter(null, null, 1, 10))).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
