import { ExtractJwt, JwtFromRequestFunction, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ProfileService } from 'src/profiles/profiles.service';
import { Profile as ProfileModel } from 'src/profiles/profile.model';

interface SupabaseJwtPayload {
  sub: string;
  email: string;
  email_confirmed: boolean;
  role: string;
  aud: string;
  exp: number;
  iat: number;
  app_metadata?: {
    provider: string;
  };
  user_metadata?: {
    display_name?: string;
  };
}

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(
  Strategy,
  'supabase-jwt',
) {
  constructor(
    private configService: ConfigService,
    private profileService: ProfileService,
  ) {
    const secret = configService.get<string>('SUPABASE_JWT_SECRET');

    if (!secret) {
      throw new Error(
        'SUPABASE_JWT_SECRET is not defined in the configuration.',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<ProfileModel> {
    const userId = payload.sub;
    const email = payload.email;
    const displayName = payload.user_metadata?.display_name || 'Anonymous User';

    if (!userId || !email) {
      throw new UnauthorizedException(
        'Invalid JWT payload. Missing user ID or email.',
      );
    }

    const profile = await this.profileService.syncProfile({
      userId,
      email,
      displayName,
    });
    if (!profile) {
      throw new UnauthorizedException('Could not synchronize user profile.');
    }

    return profile as ProfileModel;
  }
}
