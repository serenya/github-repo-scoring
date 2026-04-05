import { Inject, Injectable } from '@nestjs/common';
import { GITHUB_REPOSITORY_PORT } from '../ports/github-repository.port';
import type { IGithubRepositoryPort } from '../ports/github-repository.port';
import { SearchRepositoriesInput, SearchRepositoriesOutput } from '../dtos/search-repositories.dto';
import { RepositoryFilter } from '../../domain/value-objects/repository-filter.vo';
import { ScoringService } from '../../domain/services/scoring.service';

@Injectable()
export class SearchRepositoriesUseCase {
  private readonly scoringService = new ScoringService();

  constructor(
    @Inject(GITHUB_REPOSITORY_PORT)
    private readonly repoPort: IGithubRepositoryPort,
  ) {}

  async execute(input: SearchRepositoriesInput): Promise<SearchRepositoriesOutput> {
    const filter = new RepositoryFilter(
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
