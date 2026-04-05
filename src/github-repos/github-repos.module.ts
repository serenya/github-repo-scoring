import { Module } from '@nestjs/common';
import { GithubReposController } from './github-repos.controller';
import { SearchRepositoriesUseCase } from './application/use-cases/search-repositories.use-case';
import { GITHUB_REPOSITORY_PORT } from './application/ports/github-repository.port';
import { GithubStubAdapter } from './infrastructure/adapters/github-stub.adapter';

@Module({
  controllers: [GithubReposController],
  providers: [
    SearchRepositoriesUseCase,
    {
      provide: GITHUB_REPOSITORY_PORT,
      useClass: GithubStubAdapter,
    },
  ],
})
export class GithubReposModule {}
