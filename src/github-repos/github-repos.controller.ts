import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiBadRequestResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { SearchQueryDto } from './dto/search-query.dto';
import { PaginatedRepositoriesResponseDto, PaginationLinksDto } from './dto/paginated-response.dto';
import { RepositoryResponseDto } from './dto/repository-response.dto';
import { SearchGitHubReposUseCase } from './application/use-cases/search-github-repos.use-case';
import { ScoredGitHubRepo } from './domain/entities/scored-github-repo.entity';

@ApiTags('github-repos')
@Controller('github-repos')
export class GitHubReposController {
  constructor(private readonly searchRepositoriesUseCase: SearchGitHubReposUseCase) {}

  @Get('search')
  @ApiOperation({ summary: 'Search and score GitHub repositories' })
  @ApiOkResponse({ type: PaginatedRepositoriesResponseDto, description: 'Paginated list of scored repositories, sorted by popularity score descending' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async search(@Query() query: SearchQueryDto, @Req() req: Request): Promise<PaginatedRepositoriesResponseDto> {
    const result = await this.searchRepositoriesUseCase.execute({
      language: query.language ?? null,
      createdAfter: query.created_after ? new Date(query.created_after) : null,
      page: query.page ?? 1,
      perPage: query.per_page ?? 10,
    });

    const totalPages = result.total === 0 ? 0 : Math.ceil(result.total / result.perPage);

    return {
      items: result.items.map((scored) => this.toRepositoryResponseDto(scored)),
      meta: {
        total: result.total,
        page: result.page,
        per_page: result.perPage,
        total_pages: totalPages,
      },
      links: this.buildLinks(req, result.page, result.perPage, totalPages),
    };
  }

  private buildLinks(req: Request, page: number, perPage: number, totalPages: number): PaginationLinksDto {
    const base = new URL(`${req.protocol}://${req.get('host')}${req.path}`);
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'page' && key !== 'per_page') {
        base.searchParams.set(key, value as string);
      }
    }
    base.searchParams.set('per_page', String(perPage));

    const pageUrl = (p: number) => {
      base.searchParams.set('page', String(p));
      return base.toString();
    };

    return {
      self: pageUrl(page),
      first: pageUrl(1),
      last: totalPages > 0 ? pageUrl(totalPages) : null,
      next: page < totalPages ? pageUrl(page + 1) : null,
      prev: page > 1 ? pageUrl(page - 1) : null,
    };
  }

  private toRepositoryResponseDto(scored: ScoredGitHubRepo): RepositoryResponseDto {
    const { repository, score } = scored;
    const dto = new RepositoryResponseDto();
    dto.language = repository.language;
    dto.url = repository.htmlUrl;
    dto.score = score;
    dto.created_at = repository.createdAt.toISOString();
    return dto;
  }
}
