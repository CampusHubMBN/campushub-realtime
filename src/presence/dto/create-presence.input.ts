import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreatePresenceInput {
  @Field(() => Int, { description: 'Example field (placeholder)' })
  exampleField!: number;
}
