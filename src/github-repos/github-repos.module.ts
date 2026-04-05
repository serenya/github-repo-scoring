import { Module } from '@nestjs/common';
import { GitHubReposController } from './github-repos.controller';
import { SearchGitHubReposUseCase } from './application/use-cases/search-github-repos.use-case';
import { GITHUB_PORT } from './application/ports/github.port';
import { GitHubApiAdapter } from './infrastructure/adapters/github-api.adapter';

@Module({
  controllers: [GitHubReposController],
  providers: [
    SearchGitHubReposUseCase,
    {
      provide: GITHUB_PORT,
      useClass: GitHubApiAdapter,
    },
  ],
})
export class GitHubReposModule {}
