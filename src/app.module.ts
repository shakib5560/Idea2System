import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    /**
     * ConfigModule – loads the .env file and makes ConfigService available
     * globally across all modules without needing to re-import it.
     */
    ConfigModule.forRoot({
      isGlobal: true,   // no need to import ConfigModule in child modules
      envFilePath: '.env',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
