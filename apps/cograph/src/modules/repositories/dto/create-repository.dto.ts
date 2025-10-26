import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, Length } from 'class-validator';

@InputType()
export class CreateRepositoryDto {
  @Field(() => String)
  @IsNotEmpty()
  @Length(2, 50)
  name!: string;
}
