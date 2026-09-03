import { Injectable, Logger } from '@nestjs/common';
import { TokenStore } from '../auth/token.store.js';

const NSPD_BASE = process.env.NSPD_BASE_URL ?? 'https://nspd.gov.ru';
const NSPD_REFERER =
  process.env.NSPD_REFERER ??
  'https://nspd.gov.ru/map?thematic=Default&theme_id=1&is_copy_url=true&active_layers=36945';
const NSPD_UA =
  process.env.NSPD_USER_AGENT ??
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 YaBrowser/26.8.0.0 Safari/537.36';

@Injectable()
export class NspdService {
  private readonly logger = new Logger(NspdService.name);

  constructor(private readonly tokens: TokenStore) {}

  buildHeaders(): Record<string, string> {
    const h: Record<string, string> = {
      Referer: NSPD_REFERER,
      'User-Agent': NSPD_UA,
    };

    const cookie = this.tokens.buildCookie();
    if (cookie) {
      h.Cookie = cookie;
    }

    return h;
  }

  async proxy(
    path: string,
    query: Record<string, string>,
    res: import('express').Response,
  ): Promise<void> {
    const url = this.buildUrl(path, query);
    const headers = this.buildHeaders();

    this.logger.debug(`proxy GET ${url}`);

    let nspdRes: Response;

    try {
      nspdRes = await fetch(url, { method: 'GET', headers });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`NSPD fetch failed ${msg}`);
      res.status(502).json({ message: `NSPD unreachable: ${msg}` });
      return;
    }

    res.status(nspdRes.status);

    const contentType = nspdRes.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }

    const cacheControl = nspdRes.headers.get('cache-control');
    if (cacheControl) {
      res.setHeader('cache-control', cacheControl);
    }

    const buf = Buffer.from(await nspdRes.arrayBuffer());
    res.send(buf);
  }

  private buildUrl(path: string, query: Record<string, string>): string {
    const url = new URL(path, NSPD_BASE);

    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    }

    return url.toString();
  }
}
