import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenStore {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  set(tokens: { accessToken: string; refreshToken: string }): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
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
