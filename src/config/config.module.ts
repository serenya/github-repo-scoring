import { Global, Module } from '@nestjs/common';
import { APP_CONFIG, createAppConfig } from './app.config';

@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: createAppConfig,
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
