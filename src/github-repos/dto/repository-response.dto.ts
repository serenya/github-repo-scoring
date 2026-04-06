import { ApiProperty } from '@nestjs/swagger';

export class RepositoryResponseDto {
  @ApiProperty({ description: 'Primary programming language', example: 'TypeScript', nullable: true })
  language: string | null;

  @ApiProperty({ description: 'URL to the repository on GitHub', example: 'https://github.com/nestjs/nest' })
  url: string;

  @ApiProperty({ description: 'Popularity score (0–100)', example: 82 })
  score: number;

  @ApiProperty({ description: 'Repository creation timestamp (ISO 8601)', example: '2017-02-04T00:00:00.000Z' })
  created_at: string;
}
