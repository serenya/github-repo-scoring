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

export class PaginatedRepositoriesResponseDto {
  @ApiProperty({ type: [RepositoryResponseDto], description: 'Repositories sorted by score descending' })
  items: RepositoryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
