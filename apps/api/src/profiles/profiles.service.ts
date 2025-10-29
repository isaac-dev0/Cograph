import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Profile } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UpdateProfileInput } from './dto/update-profile.input';

interface SupabaseAuthData {
  userId: string;
  email: string;
  displayName: string;
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a Profile record by their Supabase Auth UID, or creates it if it doesn't exist.
   * This synchronises the external identity with the internal application data.
   * @param data Data extracted from the validated Supabase JWT.
   * @returns The synchronised Prisma Profile object.
   */
  async syncProfile(data: SupabaseAuthData): Promise<Profile> {
    return this.prisma.profile.upsert({
      where: {
        userId: data.userId,
      },
      update: {
        email: data.email,
        displayName: data.displayName,
      },
      create: {
        userId: data.userId,
        email: data.email,
        displayName: data.displayName,
        avatarUrl:
          'https://notion-avatar.app/api/svg/eyJmYWNlIjowLCJub3NlIjoxMCwibW91dGgiOjgsImV5ZXMiOjgsImV5ZWJyb3dzIjo2LCJnbGFzc2VzIjo4LCJoYWlyIjo0LCJhY2Nlc3NvcmllcyI6MCwiZGV0YWlscyI6MCwiYmVhcmQiOjAsImhhbGxvd2VlbiI6MywiZmxpcCI6MCwiY29sb3IiOiJyZ2JhKDI1NSwgMCwgMCwgMCkiLCJzaGFwZSI6Im5vbmUifQ==',
      },
    });
  }

  /**
   * Retrieves a profile using the profile's ID.
   * @param profileId The internal profile ID.
   * @returns A profile or null.
   */
  async findById(id: string): Promise<Profile | null> {
    const profile = await this.prisma.profile.findUnique({ where: { id: id } });
    if (!profile) {
      throw new NotFoundException(`Profile with ID "${id}" not found.`);
    }
    return profile;
  }

  async findByUserId(userId: string): Promise<Profile | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: userId },
    });
    if (!profile) {
      throw new NotFoundException(
        `Profile with Supabase User ID "${userId}" not found.`,
      );
    }
    return profile;
  }

  async update(
    id: string,
    updateProfileInput: UpdateProfileInput,
  ): Promise<Profile> {
    if (id !== updateProfileInput.id) {
      throw new ForbiddenException(
        'You are only authorised to update your own profile.',
      );
    }

    try {
      return await this.prisma.profile.update({
        where: {
          id: id,
        },
        data: {
          job: updateProfileInput.job,
          location: updateProfileInput.location,
          avatarUrl: updateProfileInput.avatarUrl,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Profile with ID "${id}" not found.`);
      }
      throw error;
    }
  }
}
