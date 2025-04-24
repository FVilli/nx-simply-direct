import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { AppService } from './app.service';
import { CoreGateway, CoreModule } from '@simply-direct/nestjs-core';
import { DemoService } from './demo.service';


@Module({
  imports: [CoreModule],
  controllers: [],
  providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(
    private gtw: CoreGateway,
    private demoService: DemoService,
  ) {}
  async onApplicationBootstrap() {
    this.gtw.register(this.demoService.serviceName, this.demoService, false);
  }
}
