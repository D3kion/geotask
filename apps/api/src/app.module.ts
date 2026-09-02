import { Module } from '@nestjs/common';
import { NspdModule } from './nspd/nspd.module.js';

@Module({
  imports: [NspdModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
