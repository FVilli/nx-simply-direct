import { Module } from '@nestjs/common';
import { CoreGateway, PrismaService } from './core.gateway';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [],
  controllers: [],
  providers: [CoreGateway, PrismaService, JwtService],
  exports: [CoreGateway],
})
export class CoreModule {}
