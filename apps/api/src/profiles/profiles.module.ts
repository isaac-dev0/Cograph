import { Module } from '@nestjs/common';
import { ProfileService } from './profiles.service';
import { PrismaService } from 'src/prisma.service';
import { ProfilesResolver } from './profiles.resolver';

@Module({
  providers: [PrismaService, ProfilesResolver, ProfileService],
})
export class ProfilesModule {}
