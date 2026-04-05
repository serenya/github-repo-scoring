import { GitHubRepo } from '../../domain/entities/github-repo.entity';
import { GitHubRepoFilter } from '../../domain/value-objects/github-repo-filter.vo';

export const GITHUB_PORT = Symbol('GitHubPort');

export interface PaginatedGitHubRepos {
  items: GitHubRepo[];
  total: number;
  page: number;
  perPage: number;
}

export interface GitHubPort {
  search(filter: GitHubRepoFilter): Promise<PaginatedGitHubRepos>;
}
