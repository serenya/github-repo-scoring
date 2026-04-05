import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiBadRequestResponse, ApiTags } from '@nestjs/swagger';
import { SearchQueryDto } from './dto/search-query.dto';
import { PaginatedRepositoriesResponseDto } from './dto/paginated-response.dto';
import { RepositoryResponseDto, ScoreBreakdownDto } from './dto/repository-response.dto';
import { SearchRepositoriesUseCase } from './application/use-cases/search-repositories.use-case';
import { IScoredRepository } from './domain/entities/scored-repository.entity';

@ApiTags('github-repos')
@Controller('github-repos')
export class GithubReposController {
  constructor(private readonly searchRepositoriesUseCase: SearchRepositoriesUseCase) {}

  @Get('search')
  @ApiOperation({ summary: 'Search and score GitHub repositories' })
  @ApiOkResponse({ type: PaginatedRepositoriesResponseDto, description: 'Paginated list of scored repositories, sorted by popularity score descending' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters' })
  async search(@Query() query: SearchQueryDto): Promise<PaginatedRepositoriesResponseDto> {
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
        perPage: result.perPage,
        totalPages,
      },
    };
  }

  private toRepositoryResponseDto(scored: IScoredRepository): RepositoryResponseDto {
    const { repository, score, breakdown } = scored;
    const dto = new RepositoryResponseDto();
    dto.id = repository.id;
    dto.fullName = repository.fullName;
    dto.description = repository.description;
    dto.language = repository.language;
    dto.stars = repository.stars;
    dto.forks = repository.forks;
    dto.createdAt = repository.createdAt.toISOString();
    dto.updatedAt = repository.updatedAt.toISOString();
    dto.htmlUrl = repository.htmlUrl;
    dto.score = score;
    const breakdownDto = new ScoreBreakdownDto();
    breakdownDto.starsScore = breakdown.starsScore;
    breakdownDto.forksScore = breakdown.forksScore;
    breakdownDto.recencyScore = breakdown.recencyScore;
    dto.breakdown = breakdownDto;
    return dto;
  }
}
