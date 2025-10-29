import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { ProfilesModule } from 'src/profiles/profiles.module';
import { SupabaseJwtStrategy } from './supabase-jwt.strategy';
import { ProfileService } from 'src/profiles/profiles.service';
import { PrismaService } from 'src/prisma.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'supabase-jwt' }),
    ConfigModule,
    ProfilesModule,
  ],
  providers: [SupabaseJwtStrategy, ProfileService, PrismaService],
  exports: [PassportModule],
})
export class AuthModule {}
