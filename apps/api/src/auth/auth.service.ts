import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { TokenStore } from './token.store.js';

const NSPD_BASE = process.env.NSPD_BASE_URL ?? 'https://nspd.gov.ru';
const NSPD_REFERER =
  process.env.NSPD_REFERER ??
  'https://nspd.gov.ru/map?thematic=Default&theme_id=1&is_copy_url=true&baseLayerId=0';
const NSPD_UA =
  process.env.NSPD_USER_AGENT ??
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly tokens: TokenStore) {}

  async refresh(): Promise<{ ok: true }> {
    const refreshToken = this.tokens.getRefresh();
    if (!refreshToken) {
      throw new UnauthorizedException('no refresh token');
    }

    const cookie = this.tokens.buildCookie();
    const url = `${NSPD_BASE}/oauth2/token`;

    let res: Response;

    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: NSPD_REFERER,
          'User-Agent': NSPD_UA,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          client_id: 'nspd',
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`refresh fetch failed ${msg}`);
      throw new UnauthorizedException(`refresh fetch failed: ${msg}`);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(`refresh failed ${res.status} ${text.slice(0, 500)}`);
      throw new UnauthorizedException(`refresh failed: ${res.status}`);
    }

    const newTokens = this.extractTokens(res);
    if (!newTokens.accessToken || !newTokens.refreshToken) {
      throw new UnauthorizedException('refresh: no tokens in response');
    }

    this.tokens.set({
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    });

    return { ok: true };
  }

  private extractTokens(res: Response): {
    accessToken: string | null;
    refreshToken: string | null;
  } {
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    const cookies: string[] =
      typeof (res.headers as unknown as { getSetCookie?: () => string[] })
        .getSetCookie === 'function'
        ? (
            res.headers as unknown as { getSetCookie: () => string[] }
          ).getSetCookie()
        : (res.headers.get('set-cookie')?.split(/,(?=[^;]+=[^;]+)/) ?? []);

    for (const c of cookies) {
      const mAccess = c.match(/authAccessToken=([^;]+)/);
      const mRefresh = c.match(/authRefreshToken=([^;]+)/);

      if (mAccess) {
        accessToken = decodeURIComponent(mAccess[1]!);
      }

      if (mRefresh) {
        refreshToken = decodeURIComponent(mRefresh[1]!);
      }
    }

    return { accessToken, refreshToken };
  }
}
