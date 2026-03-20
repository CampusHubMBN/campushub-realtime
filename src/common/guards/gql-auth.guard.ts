// =====================================================================
// src/common/guards/gql-auth.guard.ts
// =====================================================================
// Valide le cookie de session Sanctum Laravel pour :
//   - les requêtes HTTP GraphQL (queries + mutations)
//   - les connexions WebSocket (subscriptions)
// =====================================================================
import {
  CanActivate, ExecutionContext, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
 
@Injectable()
export class GqlAuthGuard implements CanActivate {
  constructor(
    @InjectDataSource() private readonly db: DataSource,
  ) {}
 
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context).getContext();
 
    // Extraire le cookie selon le contexte (HTTP ou WS)
    const cookieHeader =
      ctx.req?.headers?.cookie ||        // HTTP
      ctx.headers?.cookie ||             // WS via connectionParams
      '';
 
    const sessionId = this.extractCookie(
      cookieHeader,
      process.env.SESSION_COOKIE_NAME || 'campushub_session',
    );
 
    if (!sessionId) throw new UnauthorizedException('No session cookie');
 
    const userId = await this.resolveFromSession(sessionId);
    if (!userId) throw new UnauthorizedException('Invalid session');
 
    // Vérifier que le user n'est pas suspendu
    const suspended = await this.isSuspended(userId);
    if (suspended) throw new UnauthorizedException('Account suspended');
 
    // Attacher le userId au contexte GraphQL
    ctx.userId = userId;
    return true;
  }
 
  private async resolveFromSession(sessionId: string): Promise<string | null> {
    try {
      const rows = await this.db.query(
        'SELECT payload FROM sessions WHERE id = ? LIMIT 1',
        [sessionId],
      );
      if (!rows.length) return null;
 
      const payload = Buffer.from(rows[0].payload, 'base64').toString('utf8');
      const match   = payload.match(/"user_id";s:\d+:"([^"]+)"/);
      return match?.[1] ?? null;
    } catch { return null; }
  }
 
  private async isSuspended(userId: string): Promise<boolean> {
    const rows = await this.db.query(
      'SELECT suspended_at FROM users WHERE id = ? LIMIT 1',
      [userId],
    );
    return !!rows[0]?.suspended_at;
  }
 
  private extractCookie(cookieHeader: string, name: string): string | null {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  }
}