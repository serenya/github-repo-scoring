import { ScoredGitHubRepo } from '../../domain/entities/scored-github-repo.entity';

export interface SearchGitHubReposInput {
  language: string | null;
  createdAfter: Date | null;
  page: number;
  perPage: number;
}

export interface SearchGitHubReposOutput {
  items: ScoredGitHubRepo[];
  total: number;
  page: number;
  perPage: number;
}
