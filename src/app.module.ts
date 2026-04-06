import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GitHubReposModule } from './github-repos/github-repos.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [ConfigModule, GitHubReposModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
