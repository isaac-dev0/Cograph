import { Injectable } from '@nestjs/common';
import { Profile } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';

interface SupabaseAuthData {
  userId: string;
  email: string;
  displayName: string;
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async findOneByUserId(userId: string): Promise<Profile | null> {
    return await this.prisma.profile.findUnique({ where: { userId: userId } });
  }

  /**
   * Finds a Profile record by their Supabase Auth UID, or creates it if it doesn't exist.
   * This synchronises the external identity with the internal application data.
   * @param data Data extracted from the validated Supabase JWT.
   * @returns The synchronised Prisma Profile object.
   */
  async syncProfile(data: SupabaseAuthData): Promise<Profile> {
    const { userId, email, displayName } = data;

    return this.prisma.profile.upsert({
      where: {
        userId: userId,
      },
      update: {
        email: email,
        displayName: displayName,
      },
      create: {
        userId: userId,
        email: email,
        displayName: displayName,
      },
      select: {
        id: true,
        userId: true,
        email: true,
        displayName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Retrieves the internal Profile ID (Prisma UUID) using the external Supabase Auth UID.
   * @param userId The external Supabase UID.
   * @returns The internal Prisma ID, or null.
   */
  async getProfileId(userId: string): Promise<string | null> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId: userId },
      select: { id: true },
    });
    return profile?.id || null;
  }
}
