import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GithubReposModule } from './github-repos/github-repos.module';

@Module({
  imports: [GithubReposModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
