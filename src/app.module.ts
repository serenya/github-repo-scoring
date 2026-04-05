import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GitHubReposModule } from './github-repos/github-repos.module';

@Module({
  imports: [GitHubReposModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
