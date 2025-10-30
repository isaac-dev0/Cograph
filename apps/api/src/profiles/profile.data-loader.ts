import { Injectable, Scope } from '@nestjs/common';
import { Profile } from '@prisma/client';
import * as DataLoader from 'dataloader';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable({ scope: Scope.REQUEST })
export class ProfileDataLoader {
  private readonly loader: DataLoader<string, Profile | null>;

  constructor(private readonly prisma: PrismaService) {
    this.loader = new DataLoader<string, Profile | null>(
      this.batchProfiles.bind(this),
    );
  }

  /**
   * The batch function takes all requested keys (Profile IDs) from the current request
   * and runs a single query.
   * @param ids An array of Profile IDs requested during the current request.
   * @returns A promise resolving to an array of results corresponding exactly to the input IDs.
   */
  private async batchProfiles(
    ids: readonly string[],
  ): Promise<(Profile | null)[]> {
    const profiles = await this.prisma.profile.findMany({
      where: {
        id: {
          in: [...ids],
        },
      },
    });

    const profileMap = new Map<string, Profile>();
    profiles.forEach((profile) => profileMap.set(profile.id, profile));

    return ids.map((id) => profileMap.get(id) || null);
  }

  /**
   * The public interface to queue up a request for a single profile.
   * @param id The ID of the profile to fetch.
   * @returns A promise that resolves to the Profile object.
   */
  public load(id: string): Promise<Profile | null> {
    return this.loader.load(id);
  }
}
