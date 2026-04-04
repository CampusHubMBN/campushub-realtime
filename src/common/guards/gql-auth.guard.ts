// =====================================================================
// src/common/guards/gql-auth.guard.ts
// =====================================================================
// Delegates authentication to Laravel by forwarding the Bearer token
// to GET /api/me — works cross-domain (Vercel ↔ Railway)
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

    // --- TOKEN AUTH ---
    // HTTP: Authorization header | WS: connectionParams.authorization
    const authHeader =
      ctx.req?.headers?.authorization ||          // HTTP queries/mutations
      ctx.connectionParams?.authorization ||       // WS subscriptions (graphql-ws)
      '';

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn('No Bearer token');
      throw new UnauthorizedException('No Bearer token');
    }

    // --- SESSION AUTH (SPA same-domain only) ---
    // const cookieHeader =
    //   ctx.req?.headers?.cookie ||   // HTTP queries / mutations
    //   ctx.cookieHeader ||            // WS (from HTTP upgrade headers)
    //   '';
    // if (!cookieHeader) throw new UnauthorizedException('No session cookie');

    const userId = await this.resolveUserFromLaravel(authHeader);
    this.logger.debug(`→ userId: ${userId}`);

    if (!userId) throw new UnauthorizedException('Invalid token');

    ctx.userId = userId;
    return true;
  }

  /**
   * Forward the Bearer token to Laravel GET /api/me.
   * Works cross-domain — no session/cookie needed.
   */
  private async resolveUserFromLaravel(authHeader: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.laravelUrl}/api/me`, {
        headers: {
          authorization: authHeader,
          accept: 'application/json',
        },
      });

      // --- SESSION AUTH (SPA same-domain only) ---
      // const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      // const res = await fetch(`${this.laravelUrl}/api/me`, {
      //   headers: {
      //     cookie: cookieHeader,
      //     accept: 'application/json',
      //     origin: frontendUrl,
      //     referer: `${frontendUrl}/`,
      //   },
      // });

      if (!res.ok) {
        this.logger.warn(`Laravel /api/me responded ${res.status}`);
        return null;
      }

      const user = await res.json();
      const id = user?.data?.id ?? user?.id;
      return id ? String(id) : null;
    } catch (e) {
      this.logger.error('Failed to reach Laravel /api/me', e);
      return null;
    }
  }
}
