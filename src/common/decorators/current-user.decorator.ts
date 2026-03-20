// =====================================================================
// src/common/decorators/current-user.decorator.ts
// =====================================================================
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
 
/** Injecte le userId courant dans les resolvers */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const ctx = GqlExecutionContext.create(context).getContext();
    return ctx.userId;
  },
);