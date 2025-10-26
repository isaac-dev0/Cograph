import { ObjectType, Field, ID } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@ObjectType()
@Entity('repositories')
export class RepositoryEntity {
  @Field(() => ID, { description: 'Id' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Field(() => String, { description: 'Name' })
  @Column({ type: 'text' })
  name!: string;

  @Field(() => Date, { description: 'Created At' })
  @CreateDateColumn()
  createdAt!: Date;

  @Field(() => Date, { description: 'Updated At' })
  @UpdateDateColumn()
  updatedAt!: Date;
}
