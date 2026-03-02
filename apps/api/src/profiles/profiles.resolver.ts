import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ProfileService } from './profiles.service';
import { Profile as ProfileModel } from './models/profile.model';
import { SyncProfileInput } from './dto/sync-profile.input';
import { UseGuards } from '@nestjs/common';
import { UpdateProfileInput } from './dto/update-profile.input';
import { SupabaseJwtGuard } from 'src/auth/supabase-jwt.guard';

@UseGuards(SupabaseJwtGuard)
@Resolver(() => ProfileModel)
export class ProfilesResolver {
  constructor(private readonly profilesService: ProfileService) {}

  @Mutation(() => ProfileModel, { name: 'syncProfile' })
  sync(@Args('data') data: SyncProfileInput) {
    return this.profilesService.syncProfile(data);
  }

  @Query(() => ProfileModel, { name: 'findProfileById' })
  findById(@Args('id', { type: () => String }) id: string) {
    return this.profilesService.findById(id);
  }

  @Query(() => ProfileModel, { name: 'findProfileByUserId' })
  findByUserId(@Args('userId', { type: () => String }) userId: string) {
    return this.profilesService.findByUserId(userId);
  }

  @Query(() => ProfileModel, { name: 'searchProfiles', nullable: true })
  searchByEmail(@Args('query', { type: () => String }) query: string) {
    return this.profilesService.searchByEmail(query);
  }

  @Mutation(() => ProfileModel, { name: 'updateProfile' })
  update(
    @Args('updateProfileInput') updateProfileInput: UpdateProfileInput,
    @Context('req.user') profile: ProfileModel,
  ) {
    return this.profilesService.update(profile.id, updateProfileInput);
  }
}
