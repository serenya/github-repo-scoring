import { Inject, Injectable } from '@nestjs/common';
import { GITHUB_PORT } from '../ports/github.port';
import type { GitHubPort } from '../ports/github.port';
import { SearchGitHubReposInput, SearchGitHubReposOutput } from '../dtos/search-github-repos.dto';
import { GitHubRepoFilter } from '../../domain/value-objects/github-repo-filter.vo';
import { ScoringService } from '../../domain/services/scoring.service';

@Injectable()
export class SearchGitHubReposUseCase {
  private readonly scoringService = new ScoringService();

  constructor(
    @Inject(GITHUB_PORT)
    private readonly repoPort: GitHubPort,
  ) {}

  async execute(input: SearchGitHubReposInput): Promise<SearchGitHubReposOutput> {
    const filter = new GitHubRepoFilter(
      input.language,
      input.createdAfter,
      input.page,
      input.perPage,
    );

    const result = await this.repoPort.search(filter);

    const scoredItems = result.items
      .map((repo) => this.scoringService.computeScore(repo))
      .sort((a, b) => b.score - a.score);

    return {
      items: scoredItems,
      total: result.total,
      page: result.page,
      perPage: result.perPage,
    };
  }
}
