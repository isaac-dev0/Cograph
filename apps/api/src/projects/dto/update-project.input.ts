import { CreateProjectInput } from './create-project.input';
import { InputType, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateProjectInput extends PartialType(CreateProjectInput) {}
