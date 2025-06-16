import { DynamicModule, Module } from '@nestjs/common';
import { CoreGateway, PrismaService } from './core.gateway';
import { JwtService } from '@nestjs/jwt';

export interface CoreModuleOptions {
  port?: number,
  databaseUrl: string,
  jwtSecret: string,
  jwtExpiresIn?: string,
  skipAuth?: boolean,
  notAllowedPrismaMethods?: string[],
}

export const DEFAULT_OPTIONS: Partial<CoreModuleOptions> = {
  port: 3000,
  jwtExpiresIn: '7d',
  skipAuth: false,
  notAllowedPrismaMethods: ['deleteMany','updateMany']
};

@Module({})
export class CoreModule {
  static forRoot(options: CoreModuleOptions): DynamicModule {
    const useValue: CoreModuleOptions = { ...DEFAULT_OPTIONS, ...options };
    console.log("CoreModule Options: ", useValue);
    return {
      module: CoreModule,
      providers: [{ provide: 'CORE_MODULE_OPTIONS', useValue },CoreGateway,PrismaService,JwtService],
      exports: [CoreGateway],
      global: true,
    };
  }
}
