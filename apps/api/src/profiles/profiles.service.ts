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

  async findById(id: string): Promise<Profile> {
    const profile = await this.prisma.profile.findUnique({ where: { id: id } });
    if (!profile) {
      throw new NotFoundException(`Profile with ID "${id}" not found.`);
    }
    return profile;
  }

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

  /** Retrieves all profiles ordered alphabetically by display name. */
  async findAll(): Promise<Profile[]> {
    return this.prisma.profile.findMany({
      orderBy: { displayName: 'asc' },
    });
  }

  /** Returns at most one result to avoid bulk data exposure. */
  async searchByEmail(query: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { email: query.trim().toLowerCase() },
    });
  }

  async update(
    authId: string,
    updateProfileInput: UpdateProfileInput,
  ): Promise<Profile> {
    try {
      return await this.prisma.profile.update({
        where: { id: authId },
        data: updateProfileInput,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Profile with ID "${authId}" not found.`);
      }
      throw error;
    }
  }
}
