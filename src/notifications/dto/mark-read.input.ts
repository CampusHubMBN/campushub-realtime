// =====================================================================
// src/notifications/dto/mark-read.input.ts
// =====================================================================
import { InputType, Field } from '@nestjs/graphql';
import { IsOptional, IsArray, IsString } from 'class-validator';
 
@InputType()
export class MarkReadInput {
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];                      // null = marquer tout comme lu
}
 