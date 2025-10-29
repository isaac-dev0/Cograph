import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ProfileService } from './profiles.service';
import { Profile as ProfileModel } from './profile.model';
import { SyncProfileInput } from './dto/sync-profile.input';
import { UseGuards } from '@nestjs/common';

// @UseGuards(SupabaseJwtGuard)
@Resolver(() => ProfileModel)
export class ProfilesResolver {
  constructor(private readonly profilesService: ProfileService) {}

  @Mutation(() => ProfileModel, {
    name: 'syncProfile',
    description: 'Finds or creates a user profile based on Supabase Auth Data (Upsert).'
  })
  async syncProfile(@Args('data') data: SyncProfileInput): Promise<ProfileModel> {
    return this.profilesService.syncProfile(data);
  }

  @Query(() => ProfileModel, {
    name: 'findProfileByUserId',
    description: 'Finds a profile based on a Supabase Auth ID'
  })
  findOneByUserId(@Args('userId', { type: () => String }) userId: string) {
    return this.profilesService.findOneByUserId(userId);
  }
}
