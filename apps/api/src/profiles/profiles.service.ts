import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Profile } from '@prisma/client';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { UpdateProfileInput } from './dto/update-profile.input';
import { DEFAULT_AVATAR_URL } from 'src/common/constants';
import { CryptoService } from 'src/common/crypto/crypto.service';

interface SupabaseAuthData {
  userId: string;
  email: string;
  displayName: string;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

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

  /**
   * Searches for a single profile by exact email address.
   * Returns at most one result to avoid bulk data exposure.
   *
   * @param query The email address to search for.
   * @returns The matching Profile, or null if none found.
   */
  async searchByEmail(query: string): Promise<Profile | null> {
    return this.prisma.profile.findUnique({
      where: { email: query.trim().toLowerCase() },
    });
  }

  /**
   * Updates a profile. If a `githubToken` is provided in the input it is
   * encrypted at rest before being persisted.
   *
   * @param authId The internal Profile ID (UUID).
   * @param updateProfileInput Fields to update.
   * @returns The updated Profile object.
   */
  async update(
    authId: string,
    updateProfileInput: UpdateProfileInput,
  ): Promise<Profile> {
    const data: Record<string, unknown> = { ...updateProfileInput };

    if (updateProfileInput.githubToken) {
      data.githubToken = this.crypto.encrypt(updateProfileInput.githubToken);
    }

    try {
      return await this.prisma.profile.update({
        where: { id: authId },
        data,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Profile with ID "${authId}" not found.`);
      }
      throw error;
    }
  }

  /**
   * Retrieves and decrypts the GitHub personal access token for a profile.
   * Returns null if no token is stored.
   *
   * @param profileId The internal Profile ID (UUID).
   * @returns The plaintext GitHub PAT, or null.
   */
  async getDecryptedGithubToken(profileId: string): Promise<string | null> {
    const profile = await this.findById(profileId);
    if (!profile.githubToken) return null;
    return this.crypto.decrypt(profile.githubToken);
  }
}
