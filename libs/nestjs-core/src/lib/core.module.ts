import { DynamicModule, Module } from '@nestjs/common';
import { CoreGateway, PrismaService } from './core.gateway';
import { JwtService } from '@nestjs/jwt';

export interface CoreModuleOptions {
  port: number,
  databaseUrl: string,
  JwtSecret: string,
  JwtExpiresIn: string,
  SkipAuth: boolean,
  NotAllowedPrismaMethods: string[],
}

@Module({})
export class CoreModule {
  static forRoot(options: CoreModuleOptions): DynamicModule {
    return {
      module: CoreModule,
      providers: [{ provide: 'CORE_MODULE_OPTIONS', useValue: options },CoreGateway,PrismaService,JwtService],
      exports: [CoreGateway],
      global: true, // opzionale, rende il modulo globale
    };
  }
}
