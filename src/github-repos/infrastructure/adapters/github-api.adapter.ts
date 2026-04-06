import { Inject, Injectable, InternalServerErrorException, RequestTimeoutException, ServiceUnavailableException } from '@nestjs/common';
import { GitHubPort, PaginatedGitHubRepos } from '../../application/ports/github.port';
import { GitHubRepoFilter } from '../../domain/value-objects/github-repo-filter.vo';
import { GitHubRepo } from '../../domain/entities/github-repo.entity';
import { APP_CONFIG } from '../../../config/app.config';
import type { AppConfig } from '../../../config/app.config';

interface GitHubSearchItem {
  id: number;
  full_name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  html_url: string;
}

interface GitHubSearchResponse {
  total_count: number;
  items: GitHubSearchItem[];
}

/**
 * Infrastructure adapter that implements {@link GitHubPort} by calling the
 * GitHub REST Search API (`GET /search/repositories`).
 *
 * Responsibilities:
 * - Builds the GitHub search query string from a {@link GitHubRepoFilter}
 * - Injects an optional `Authorization` Bearer token to raise the rate limit
 *   from 60 to 5,000 requests/hour (set via the `GITHUB_TOKEN` env var)
 * - Enforces a configurable request timeout via `AbortSignal.timeout()`
 * - Maps raw API items to {@link GitHubRepo} domain entities
 * - Translates HTTP/timeout errors to appropriate NestJS HTTP exceptions
 */
@Injectable()
export class GitHubApiAdapter implements GitHubPort {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': this.config.githubApiVersion,
    };
    if (this.config.githubToken) {
      headers['Authorization'] = `Bearer ${this.config.githubToken}`;
    }
    return headers;
  }

  async search(filter: GitHubRepoFilter): Promise<PaginatedGitHubRepos> {
    const query = this.buildQuery(filter);
    const params = new URLSearchParams({
      q: query,
      page: String(filter.page),
      per_page: String(filter.perPage),
    });

    const url = `${this.config.githubApiBase}/search/repositories?${params}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: this.headers,
        signal: AbortSignal.timeout(this.config.githubApiTimeoutMs),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new RequestTimeoutException('GitHub API request timed out');
      }
      throw new InternalServerErrorException(`GitHub API error: ${String(error)}`);
    }

    if (!response.ok) {
      if (response.status === 403) {
        throw new ServiceUnavailableException('GitHub API rate limit exceeded');
      }
      throw new InternalServerErrorException(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GitHubSearchResponse;

    return {
      items: data.items.map((item) => this.mapToEntity(item)),
      total: data.total_count,
      page: filter.page,
      perPage: filter.perPage,
    };
  }

  private buildQuery(filter: GitHubRepoFilter): string {
    const parts: string[] = [];
    if (filter.language) parts.push(`language:${filter.language}`);
    if (filter.createdAfter) {
      parts.push(`created:>${filter.createdAfter.toISOString().split('T')[0]}`);
    }
    if (parts.length === 0) parts.push('stars:>0');
    return parts.join(' ');
  }

  private mapToEntity(item: GitHubSearchItem): GitHubRepo {
    return new GitHubRepo(
      item.id,
      item.full_name,
      item.description,
      item.language,
      item.stargazers_count,
      item.forks_count,
      new Date(item.created_at),
      new Date(item.updated_at),
      item.html_url,
    );
  }
}
