import { Module } from '@nestjs/common';
import { AuthController } from '../auth/auth.controller.js';
import { AuthService } from '../auth/auth.service.js';
import { TokenStore } from '../auth/token.store.js';
import { NspdController } from './nspd.controller.js';
import { NspdService } from './nspd.service.js';

@Module({
  controllers: [NspdController, AuthController],
  providers: [TokenStore, NspdService, AuthService],
})
export class NspdModule {}
