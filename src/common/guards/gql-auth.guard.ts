// =====================================================================
// src/common/guards/gql-auth.guard.ts
// =====================================================================
// Delegates authentication to Laravel by forwarding the session cookie
// to GET /api/user — works with any session driver (cookie, database…)
// =====================================================================
import {
  CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class GqlAuthGuard implements CanActivate {
  private readonly logger = new Logger(GqlAuthGuard.name);
  private readonly laravelUrl = process.env.LARAVEL_URL ?? 'http://localhost:8000';

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context).getContext();

    const cookieHeader =
      ctx.req?.headers?.cookie ||   // HTTP queries / mutations
      ctx.cookieHeader ||            // WS (from HTTP upgrade headers)
      '';

    if (!cookieHeader) {
      this.logger.warn('No cookie header');
      throw new UnauthorizedException('No session cookie');
    }

    const userId = await this.resolveUserFromLaravel(cookieHeader);
    this.logger.debug(`→ userId: ${userId}`);

    if (!userId) throw new UnauthorizedException('Invalid session');

    ctx.userId = userId;
    return true;
  }

  /**
   * Forward the session cookie to Laravel GET /api/me.
   * The Origin/Referer headers satisfy Sanctum's stateful domain check
   * so it authenticates via the session cookie server-to-server.
   */
  private async resolveUserFromLaravel(cookieHeader: string): Promise<string | null> {
    try {
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      const res = await fetch(`${this.laravelUrl}/api/me`, {
        headers: {
          cookie: cookieHeader,
          accept: 'application/json',
          // Sanctum requires an Origin matching SANCTUM_STATEFUL_DOMAINS
          // to enable session-based auth on server-to-server calls
          origin: frontendUrl,
          referer: `${frontendUrl}/`,
        },
      });

      if (!res.ok) {
        this.logger.warn(`Laravel /api/me responded ${res.status}`);
        return null;
      }

      const user = await res.json();
      // console.log('user res', user);
      const id = user?.data?.id ?? user?.id;
      return id ? String(id) : null;
    } catch (e) {
      this.logger.error('Failed to reach Laravel /api/me', e);
      return null;
    }
  }
}
