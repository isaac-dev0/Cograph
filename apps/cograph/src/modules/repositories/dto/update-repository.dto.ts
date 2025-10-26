import { CreateRepositoryDto } from './create-repository.dto';
import { Field, InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateRepositoryDto extends PartialType(CreateRepositoryDto) {
  @Field({ nullable: true })
  override name?: string;
}
