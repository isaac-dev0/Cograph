import { Module } from '@nestjs/common';
import { ProfileService } from './profiles.service';
import { ProfilesResolver } from './profiles.resolver';
import { CryptoService } from 'src/common/crypto/crypto.service';

@Module({
  providers: [ProfilesResolver, ProfileService, CryptoService],
  exports: [CryptoService],
})
export class ProfilesModule {}
