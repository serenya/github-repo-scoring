import { ApiProperty } from '@nestjs/swagger';

export class ScoreBreakdownDto {
  @ApiProperty({ description: 'Stars sub-score (log-scaled, 0–100)', example: 71.2 })
  starsScore: number;

  @ApiProperty({ description: 'Forks sub-score (log-scaled, 0–100)', example: 55.8 })
  forksScore: number;

  @ApiProperty({ description: 'Recency sub-score (linear decay over 2 years, 0–100)', example: 98.6 })
  recencyScore: number;
}

export class RepositoryResponseDto {
  @ApiProperty({ description: 'GitHub repository ID', example: 10270250 })
  id: number;

  @ApiProperty({ description: 'Repository full name in owner/name format', example: 'nestjs/nest' })
  fullName: string;

  @ApiProperty({ description: 'Repository description', example: 'A progressive Node.js framework', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Primary programming language', example: 'TypeScript', nullable: true })
  language: string | null;

  @ApiProperty({ description: 'Number of stars', example: 68000 })
  stars: number;

  @ApiProperty({ description: 'Number of forks', example: 7600 })
  forks: number;

  @ApiProperty({ description: 'Repository creation timestamp (ISO 8601)', example: '2017-02-04T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Timestamp of the last push (ISO 8601)', example: '2026-03-30T00:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ description: 'URL to the repository on GitHub', example: 'https://github.com/nestjs/nest' })
  htmlUrl: string;

  @ApiProperty({ description: 'Popularity score (0–100)', example: 82 })
  score: number;

  @ApiProperty({ type: ScoreBreakdownDto })
  breakdown: ScoreBreakdownDto;
}
