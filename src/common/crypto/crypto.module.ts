import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TokenEncryptionService } from './token-encryption.service';

@Module({
  imports: [ConfigModule],
  providers: [TokenEncryptionService],
  exports: [TokenEncryptionService],
})
export class CryptoModule {}
