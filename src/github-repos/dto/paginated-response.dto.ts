import { ApiProperty } from '@nestjs/swagger';
import { RepositoryResponseDto } from './repository-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of matching repositories', example: 8 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 10 })
  per_page: number;

  @ApiProperty({ description: 'Total number of pages', example: 1 })
  total_pages: number;
}

export class PaginationLinksDto {
  @ApiProperty({ description: 'URL of the current page' })
  self: string;

  @ApiProperty({ description: 'URL of the first page' })
  first: string;

  @ApiProperty({ description: 'URL of the last page, or null when there are no results', nullable: true })
  last: string | null;

  @ApiProperty({ description: 'URL of the next page, or null when on the last page', nullable: true })
  next: string | null;

  @ApiProperty({ description: 'URL of the previous page, or null when on the first page', nullable: true })
  prev: string | null;
}

export class PaginatedRepositoriesResponseDto {
  @ApiProperty({ type: [RepositoryResponseDto], description: 'Repositories sorted by score descending' })
  items: RepositoryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ type: PaginationLinksDto })
  links: PaginationLinksDto;
}
