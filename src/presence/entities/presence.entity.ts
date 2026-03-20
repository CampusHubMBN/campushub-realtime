import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class Presence {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField: number;
}
