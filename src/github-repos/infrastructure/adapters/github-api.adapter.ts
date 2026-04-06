import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GitHubPort, PaginatedGitHubRepos } from '../../application/ports/github.port';
import { GitHubRepoFilter } from '../../domain/value-objects/github-repo-filter.vo';
import { GitHubRepo } from '../../domain/entities/github-repo.entity';

const GITHUB_API_BASE = 'https://api.github.com';

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

@Injectable()
export class GitHubApiAdapter implements GitHubPort {
  private get headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
    };
    return headers;
  }

  async search(filter: GitHubRepoFilter): Promise<PaginatedGitHubRepos> {
    const query = this.buildQuery(filter);
    const params = new URLSearchParams({
      q: query,
      page: String(filter.page),
      per_page: String(filter.perPage),
    });

    const url = `${GITHUB_API_BASE}/search/repositories?${params}`;
    const response = await fetch(url, { headers: this.headers });

    if (!response.ok) {
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
