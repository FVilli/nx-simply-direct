import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { AppService } from './app.service';
import { CoreGateway, CoreModule, PrismaService } from '@simply-direct/nestjs-core';
import { DemoService } from './demo.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

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
    CoreModule
  ],
  controllers: [],
  providers: [AppService,DemoService,PrismaService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    private gtw: CoreGateway,
    private demoService: DemoService,
  ) {}
  async onApplicationBootstrap() {
    this.gtw.log(true);
    this.gtw.register(this.demoService.serviceName, this.demoService, false);
  }
}
