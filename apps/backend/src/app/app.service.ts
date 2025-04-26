import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Client, User } from '@prisma/client';
import { CoreGateway, hash, PrismaService } from '@simply-direct/nestjs-core';
import { enhance } from '@zenstackhq/runtime';

@Injectable()
export class AppService implements OnApplicationBootstrap {

  constructor(private gtw: CoreGateway,private readonly prisma: PrismaService) {
    
  }
  async onApplicationBootstrap() {

    // Check SysUser created By CoreService (example using prisma client, not event propagation, not observability available)
    const sysUser = await this.prisma.user.findFirst({ where: { name: 'system' } })
    console.log("sysUser",sysUser);

    // Get other users (example using CoreGateway prisma client, event propagation and observability)
    const users = await this.gtw.prisma<User[]>('user','findMany',{ where: { role: { not: 'SYSTEM' }}});
    console.log("users",users);

    // Create admin if not exists
    const admin = users.find(u => u.name === 'admin');
    if(!admin) {
      await this.gtw.prisma('user','create',{ data: { name: 'admin', phash: hash('admin'), disabled: false, role:'ADMIN' } });
      console.log('user "admin" created');
    }

    // Create guest if not exists
    const guest = users.find(u => u.name === 'guest');
    if(!guest) {
      await this.gtw.prisma('user','create',{ data: { name: 'guest', phash: hash('guest'), disabled: false, role:'GUEST' } });
      console.log('user "guest" created');
    }
  
    setInterval(async () => {

      const onlineClients = await this.prisma.client.findMany({ where: { sessions: { gt: 0 }}});
      console.log("onlineClients",onlineClients.length);

    },5000);

  }
}
