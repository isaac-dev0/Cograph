import { Module } from '@nestjs/common';
import { ProfileService } from './profiles.service';
import { ProfilesResolver } from './profiles.resolver';

@Module({
  providers: [ProfilesResolver, ProfileService],
})
export class ProfilesModule {}
