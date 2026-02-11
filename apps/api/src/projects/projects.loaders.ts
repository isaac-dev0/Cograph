import { Injectable, Scope } from '@nestjs/common';
import * as DataLoader from 'dataloader';
import { PrismaService } from '../common/prisma/prisma.service';
import type { Profile, ProjectMember } from '@prisma/client';

/**
 * Request-scoped DataLoaders for the Projects domain.
 * A new instance is created per GraphQL request, which ensures each loader's
 * internal cache is isolated to that request and never bleeds across users.
 */
@Injectable({ scope: Scope.REQUEST })
export class ProjectsLoaders {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Batches profile lookups by owner ID.
   * Replaces the per-project `profile.findUnique` in the `owner` field resolver.
   */
  readonly owner = new DataLoader<string, Profile | null>(
    async (ownerIds: readonly string[]) => {
      const profiles = await this.prisma.profile.findMany({
        where: { id: { in: [...ownerIds] } },
      });

      const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
      return ownerIds.map((ownerId) => profileMap.get(ownerId) ?? null);
    },
  );

  /**
   * Batches project member lookups by project ID.
   * Replaces the per-project `projectMember.findMany` in the `members` field resolver.
   */
  readonly members = new DataLoader<string, ProjectMember[]>(
    async (projectIds: readonly string[]) => {
      const members = await this.prisma.projectMember.findMany({
        where: { projectId: { in: [...projectIds] } },
        include: { profile: true },
      });

      const grouped = new Map<string, ProjectMember[]>(
        projectIds.map((projectId) => [projectId, []]),
      );

      for (const member of members) {
        grouped.get(member.projectId)!.push(member);
      }

      return projectIds.map((projectId) => grouped.get(projectId)!);
    },
  );
}
