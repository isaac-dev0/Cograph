import { Module } from '@nestjs/common';
import { ProfileService } from './profiles.service';
import { ProfilesResolver } from './profiles.resolver';
import { ProfileDataLoader } from './profile.data-loader';

@Module({
  providers: [ProfilesResolver, ProfileDataLoader, ProfileService],
  exports: [ProfileDataLoader],
})
export class ProfilesModule {}
