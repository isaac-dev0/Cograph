import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Profile } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UpdateProfileInput } from './dto/update-profile.input';
import { DEFAULT_AVATAR_URL } from 'src/common/constants';

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
   * This handles the critical synchronisation between the external identity (Supabase)
   * and the internal application data (Prisma Profile table).
   *
   * @param data Data extracted from the validated Supabase JWT (userId, email, displayName).
   * @returns The synchronised Prisma Profile object.
   */
  async syncProfile(data: SupabaseAuthData): Promise<Profile> {
    if (!data.userId) {
      throw new BadRequestException(
        'Cannot synchronise profile: Supabase Auth ID is missing.',
      );
    }

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
        avatarUrl: DEFAULT_AVATAR_URL,
      },
    });
  }

  /**
   * Retrieves a profile using the internal Prisma profile ID.
   *
   * @param id The internal Profile ID (UUID).
   * @returns The found Profile object.
   * @throws NotFoundException if the profile ID does not exist.
   */
  async findById(id: string): Promise<Profile> {
    const profile = await this.prisma.profile.findUnique({ where: { id: id } });
    if (!profile) {
      throw new NotFoundException(`Profile with ID "${id}" not found.`);
    }
    return profile;
  }

  /**
   * Retrieves a profile using the external Supabase Auth UID.
   *
   * @param userId The external Supabase Auth UID.
   * @returns The found Profile object.
   * @throws NotFoundException if the profile ID does not exist.
   */
  async findByUserId(userId: string): Promise<Profile> {
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

  async findAll(): Promise<Profile[]> {
    return this.prisma.profile.findMany({
      orderBy: { displayName: 'asc' },
    });
  }

  async update(
    authId: string,
    updateProfileInput: UpdateProfileInput,
  ): Promise<Profile> {
    try {
      return await this.prisma.profile.update({
        where: {
          id: authId,
        },
        data: { ...updateProfileInput },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Profile with ID "${authId}" not found.`);
      }
      throw error;
    }
  }
}
