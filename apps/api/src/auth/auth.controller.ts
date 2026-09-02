import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { TokenStore } from './token.store.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly tokens: TokenStore,
    private readonly auth: AuthService,
  ) {}

  @Post('tokens')
  @HttpCode(200)
  setTokensPost(@Body() body: Record<string, string>) {
    return this.setTokens(body);
  }

  @Get('status')
  status() {
    return this.tokens.status();
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh() {
    return this.auth.refresh();
  }

  private setTokens(body: Record<string, string>) {
    const accessToken = body.accessToken ?? body.access_token;
    const refreshToken = body.refreshToken ?? body.refresh_token;

    if (!accessToken || !refreshToken) {
      return { ok: false, error: 'accessToken and refreshToken required' };
    }

    this.tokens.set({ accessToken, refreshToken });
    return { ok: true };
  }
}
