import { CreatePresenceInput } from './create-presence.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdatePresenceInput extends PartialType(CreatePresenceInput) {
  @Field(() => Int)
  id: number;
}
