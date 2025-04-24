import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CoreGateway, PrismaService } from './core.gateway';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      newListener: true,
      removeListener: true,
      maxListeners: 10, // the maximum amount of listeners that can be assigned to an event
      verboseMemoryLeak: true, // show event name in memory leak message when more than maximum amount of listeners is assigned
      ignoreErrors: false, // disable throwing uncaughtException if an error event is emitted and it has no listeners
    }),
  ],
  controllers: [],
  providers: [CoreGateway, PrismaService, JwtService],
  exports: [CoreGateway],
})
export class CoreModule {}
