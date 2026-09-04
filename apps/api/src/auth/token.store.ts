import { Injectable } from '@nestjs/common';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

@Injectable()
export class TokenStore {
  private readonly file = resolve(
    process.env.TOKEN_STORE_PATH ?? 'data/tokens.json',
  );
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = readFileSync(this.file, 'utf8');
      const data = JSON.parse(raw) as {
        accessToken?: string | null;
        refreshToken?: string | null;
      };
      this.accessToken = data.accessToken ?? null;
      this.refreshToken = data.refreshToken ?? null;
    } catch {}
  }

  private save(): void {
    try {
      mkdirSync(dirname(this.file), { recursive: true });
      writeFileSync(
        this.file,
        JSON.stringify({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
        }),
        'utf8',
      );
    } catch {}
  }

  set(tokens: { accessToken: string; refreshToken: string }): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.save();
  }

  getAccess(): string | null {
    return this.accessToken;
  }

  getRefresh(): string | null {
    return this.refreshToken;
  }

  hasAccess(): boolean {
    return Boolean(this.accessToken);
  }

  hasRefresh(): boolean {
    return Boolean(this.refreshToken);
  }

  status(): { hasAccessToken: boolean; hasRefreshToken: boolean } {
    return {
      hasAccessToken: this.hasAccess(),
      hasRefreshToken: this.hasRefresh(),
    };
  }

  clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.save();
  }

  buildCookie(): string | null {
    const parts: string[] = [];

    if (this.accessToken) {
      parts.push(`authAccessToken=${this.accessToken}`);
    }

    if (this.refreshToken) {
      parts.push(`authRefreshToken=${this.refreshToken}`);
    }

    return parts.length ? parts.join('; ') : null;
  }
}
