import { DynamicModule, Module } from '@nestjs/common';
import { CoreGateway, PrismaService } from './core.gateway';
import { JwtService } from '@nestjs/jwt';

export interface CoreModuleOptions {
  port: number,
  databaseUrl: string,
  jwtSecret: string,
  jwtExpiresIn: string,
  skipAuth: boolean,
  notAllowedPrismaMethods: string[],
}

export const DEFAULT_OPTIONS:CoreModuleOptions = {
  port: 3000,
  jwtExpiresIn: '7d',
  jwtSecret: 'secret',
  skipAuth: false,
  notAllowedPrismaMethods: ['deleteMany','updateMany'],
  databaseUrl: 'postgresql://postgres:postgres@localhost:5432/postgres?schema=public'
};

@Module({})
export class CoreModule {
  static forRoot(options: Partial<CoreModuleOptions>): DynamicModule {
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
