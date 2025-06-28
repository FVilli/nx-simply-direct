/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { enhance } from '@zenstackhq/runtime';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
//import { ENV } from './env';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { Inject, Injectable, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { hash, QUID, distinctSubscriptions, isMatching } from './utils.functions';
import { BaseService, IAuth, IEvent, IJwtPayload, ILoginMsg, ILogoutMsg, IRefreshMsg, IResponse, ISubscriptions, ITdt, Message, User } from '@simply-direct/common'
import { CoreModuleOptions } from './core.module';

export interface ISocketSession { socket: Socket; clientId?: string; auth: IAuth | null; subscriptions: ISubscriptions;} // questa la devo spostare in nestjs-core

@Injectable() export class PrismaService extends PrismaClient implements OnModuleInit { async onModuleInit() { await this['$connect'](); } }

@WebSocketGateway({ cors: true, pingInterval: 1000, pingTimeout: 1000, transports: ['websocket'] }) // 'polling','websocket','webtransport'
export class CoreGateway implements OnApplicationBootstrap {
  Sessions = new Map<string, ISocketSession>();
  private ServicesMap = new Map<string, { service: BaseService; requiresAuth: boolean }>();
  private sysUsr!:User;
  constructor(
    @Inject('CORE_MODULE_OPTIONS') private options: CoreModuleOptions,
    private readonly prismaService: PrismaService, 
    private readonly eventEmitter: EventEmitter2, 
    private jwtService: JwtService,
  private readonly moduleRef: ModuleRef) {}
  
  async onApplicationBootstrap() {
    // serve perchè quando stoppo il backend potrei non fare in tempo a gestire bene tutte le disconnessioni
    // che riporterebbero comunque sessions a 0
    await this.prismaService['client'].updateMany({ data: { sessions: 0 } });
    this.sysUsr = await this.prismaService['user'].findFirst({ where: { name: 'system' } }) || await this.prismaService['user'].create({ data: { name: 'system', phash: '', disabled: false, role:'SYSTEM' } });
  }

  _log = false;
  log(enable:boolean) { this._log = enable; }
  console(message?: any, ...optionalParams: any[]) {
    if(this._log) console.log(message, ...optionalParams);
  }

// TODO: posso semplificare register rimuovendo requiresAuth
// creo quindi semplicemente la mappa dei servizi esposti riprendibili per nome
// il resto sarà gestiti da @DirectMethod
// @DirectMethod() -> PUBBLICO
// @DirectMethod([]) -> NECESSARIA autenticazione, ma non è richiesto un ruolo specifico
// @DirectMethod([a,b,c]) -> NECESSARIA uno di questi ruoli
  register(serviceName: string, service: BaseService, requiresAuth = true) {
    this.ServicesMap.set(serviceName, { service, requiresAuth });
    this.console(`${ITdt()} 🤖 Registered service:`, serviceName);
  }

  private async handleConnection(socket: Socket) {

    this.console(`${ITdt()} 🤖 [socket] url:`, socket.client.request.url);

    const queryString = socket.client.request.url?.split('?')[1] ?? '';
    const params = new URLSearchParams(queryString);
    const clientId = params.get('client-id');
    if(!clientId) return;

    const userAgent = socket.client.request.headers['user-agent'] || '?';
    this.console(`${ITdt()} 🤖 [connected] socket.id:`, socket.id, 'clientId:', clientId,"transport:",socket.conn.transport.name,"userAgent:",userAgent);
    
    this.Sessions.set(socket.id, { socket: socket, clientId, subscriptions: [], auth:null });

    await this.prismaService['client'].upsert({
      where: { name: clientId },
      update: { agent: userAgent, sessions: { increment: 1 }, updated_at: new Date() },
      create: { name: clientId, agent: userAgent, sessions: 1 },
    });
  }

  private async handleDisconnect(socket: Socket) {
    const clientId = this.Sessions.get(socket.id)?.clientId;
    if(!clientId) return;
    this.console(`${ITdt()} 🤖 [disconnected] socket.id:`, socket.id, 'clientId:', clientId);
    this.Sessions.delete(socket.id);
    await this.prismaService['client'].update({
      where: { name: clientId },
      data: { sessions: { decrement: 1 }, updated_at: new Date() },
    });
  }

  // ================================================================================================
  // SEND REQUEST TO CLIENT (un client può avere più tab aperti quindi più sessioni)
  // ================================================================================================

  // i messaggi ai client vengono mandati tramite la modalità evento/sottoscrizione
  // le richieste invece tramite il concetto di handler registrato nel client
  // (con la possible eccezione nessun handler registrato)
  // in caso di hadler registrato arrivarà una risposta al server
  public requestToClient<RQ, RS>(clientId: string, topic: string, payload: RQ, excludeSocketIds: string[] = [], timeout = 10): Promise<IResponse<RS>[]> {
    return new Promise<IResponse<RS>[]>((resolve, reject) => {
      try {
        setTimeout(() => reject({ message: 'timeout' }), timeout * 1000);

        const responses: IResponse<RS>[] = [];
        const sessions = Array.from(this.Sessions.values()).filter(s => (s.clientId === clientId || clientId === '**') && !excludeSocketIds.includes(s.socket.id));
        if (sessions.length === 0) resolve([]);
        sessions.forEach(session => {
          this.console('request', session.clientId, topic);
          session.socket.emit('request', { topic, payload }, (rv: IResponse<RS>) => {
            //this.console('response', session.clientId, rv);
            responses.push(rv);
            if (responses.length === sessions.length) resolve(responses);
          });
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // ================================================================================================
  // AUTHENTICATION
  // ================================================================================================
  @SubscribeMessage('auth')
  private async handleLogin(@MessageBody() msg: Message<any>, @ConnectedSocket() socket: Socket):Promise<IResponse<IAuth>> {
    this.console(`${ITdt()} 🤖 [auth] socket.id:${socket.id} msg:`, msg.topic);
    try {
      const session = this.Sessions.get(socket.id)!;
      // if(!session) throw new Error('Session not found');
      // const clientId = session.clientId;
      // if (!clientId) throw new Error('ClientId not found');
      switch (msg.topic) {
        case 'login':
          session.auth = await this.login(msg.payload, session.clientId! );
          break;
        case 'logout':
          await this.logout(msg.payload, session);
          session.auth = null;
          break;
        case 'refresh':
          session.auth = await this.refresh(msg.payload, session.clientId! );
          break;
      }
      this.synchronizeSessions(session.clientId!,session.auth,socket.id);
      return { data: session.auth, status: session.auth ? 'OK' : 'NO-AUTH' };
    } catch (err:any) {
      console.error('err:', err?.message);
      return { data:null, err: err?.message };
    }
  }
  synchronizeSessions(clientId: string, auth: IAuth | null, exceptSocketId:string) {
    this.Sessions.forEach(session => {
      if (session.clientId === clientId && session.socket.id !== exceptSocketId) session.auth = auth;
    });
  }

  private async login(payload: ILoginMsg, clientId: string): Promise<IAuth | null> {
    const phash = hash(payload.password);
    const name = payload.username;
    this.console(`${ITdt()} 🔒 [login] clientId:${clientId} user:${name}`);
    const user = await this.prismaService['user'].findFirst({ where: { name, phash } });
    if (!!user && !user.disabled) {
      this.console(`${ITdt()} 🔓 [login] clientId:${clientId} user:${name} ACCESS GRANTED !`);
      const token = this.jwtService.sign({ username: name, sub: user.id, clientId }, { expiresIn: this.options.jwtExpiresIn, secret: this.options.jwtSecret });
      await this.prismaService['client'].update({
        where: { name: payload.clientId },
        data: { token, user_id: user.id, updated_at: new Date() },
      });
      //delete user.phash;
      return { user, token };
    } else {
      this.console(`${ITdt()} ⚠️ [login] clientId:${clientId} user:${name} ACCESS DENIED !`);
      await this.prismaService['client'].update({
        where: { name: payload.clientId },
        data: { user_id: null, updated_at: new Date() },
      });
      return null;
    }
  }
  private async logout(payload: ILogoutMsg, cs: ISocketSession): Promise<void> {
    if (cs.clientId !== payload.clientId) console.error('Anomalous logout');
    await this.prismaService['client'].update({
      where: { name: payload.clientId },
      data: { token: null, user_id: null, updated_at: new Date() },
    });
  }
  private async refresh(payload: IRefreshMsg, clientId: string): Promise<IAuth | null> {
    try {
      const tokenPayload = this.jwtService.verify<IJwtPayload>(payload.token, { secret: this.options.jwtSecret });
      if (clientId !== tokenPayload.clientId) console.error('Anomalous refresh');
      const user = await this.prismaService['user'].findFirst({ where: { id: tokenPayload.sub } });
      if (!user) throw new Error('User not found');
      if (user.disabled) throw new Error('User disabled');
      const client = await this.prismaService['client'].findFirst({ where: { name: clientId } });
      if (!client || client.token !== payload.token) throw new Error('Token revoked');
      const token = this.jwtService.sign({ username: user.name, sub: user.id, clientId }, { expiresIn: this.options.jwtExpiresIn, secret: this.options.jwtSecret });
      await this.prismaService['client'].update({
        where: { name: payload.clientId },
        data: { token, user_id: user.id, updated_at: new Date() },
      });
      //delete user.phash;
      return { user, token };
    } catch (err:any) {
      console.error(err?.message);
      await this.prismaService['client'].update({
        where: { name: payload.clientId },
        data: { token: null, user_id: null, updated_at: new Date() },
      });
      return null;
    }
  }

  // ================================================================================================
  // REQUEST TO REGISTERED SERVICE
  // ================================================================================================
  @SubscribeMessage('request')
  private async handleRequest<T>(@MessageBody() msg: Message<any>, @ConnectedSocket() socket: Socket): Promise<IResponse<T>> {
    this.console(`${ITdt()} 🤖 [request] socket.id:${socket.id} msg:`, msg);
    try {
      const serviceName = msg.topic.split('.')[0];
      const methodName = msg.topic.split('.')[1];
      const session = this.Sessions.get(socket.id)!;
      const auth = session.auth;
      const serviceInfo = this.ServicesMap.get(serviceName)!;
      const service = serviceInfo.service;
      const requiresAuth = serviceInfo.requiresAuth;
      if (requiresAuth && !auth && !this.options.skipAuth) throw new Error('Unauthorized');
      return { data: await (<any>service)[methodName](msg.payload, auth) };
    } catch (err:any) {
      console.error('err:', err?.message);
      return { data:null, err };
    }
  }

  // ================================================================================================
  // MESSAGE TO REGISTERED SERVICE
  // ================================================================================================
  @SubscribeMessage('message')
  private async handleMessage(@MessageBody() msg: Message<any>, @ConnectedSocket() socket: Socket): Promise<IResponse<string>> {
    //this.console(`🤖 [message] socket.id:${socket.id} msg:`, msg);
    try {
      const serviceName = msg.topic.split('.')[0];
      const methodName = msg.topic.split('.')[1];
      const session = this.Sessions.get(socket.id)!;
      const auth = session.auth;
      const serviceInfo = this.ServicesMap.get(serviceName)!;
      const service = await serviceInfo.service;
      const requiresAuth = serviceInfo.requiresAuth;
      if (requiresAuth && !auth && !this.options.skipAuth) throw new Error('Unauthorized');
      setImmediate(async () => {
        const st = new Date();
        await (<any>service)[methodName](msg.payload, auth);
        const ms = new Date().getTime() - st.getTime();
        this.console(`${ITdt()} 🤖 [executed] ${msg.topic} requested by ${auth?.user.id} in ${ms} ms`);
      });
      return { data:null, status: 'OK' };
    } catch (err:any) {
      console.error('err:', err.message);
      return { data:null, err: err.message };
    }
  }

  // ================================================================================================
  // REQUEST TO PRISMA CLIENT (ENHANCED BY ZENSTACK)
  // ================================================================================================
  @SubscribeMessage('prisma')
  private async handlePrismaRequest<T>(@MessageBody() msg: Message<any>, @ConnectedSocket() socket: Socket): Promise<IResponse<T>> {
    this.console(`${ITdt()} 🤖 [prisma] socket.id:${socket.id} msg:`, msg);
    try {
      const entityName = msg.topic.split('.')[0];
      const methodName = msg.topic.split('.')[1];
      const session = this.Sessions.get(socket.id)!;
      const auth = session.auth;
      if (!auth && !this.options.skipAuth) throw new Error('Unauthorized');
      if((this.options.notAllowedPrismaMethods).includes(methodName)) throw new Error('Method not allowed');
      const data = await this._prismaHnd<T>(entityName, methodName, msg.payload, auth?.user);
      return { data };
    } catch (err:any) {
      console.error('err:', err.message);
      return { data:null, err: err.message };
    }
  }

  private async _prismaHnd<T>(entityName: string, methodName: string, param: any, user?: User):Promise<T> {
    const prismaEnhanced = enhance(this.prismaService, { user });
    this.publishEvent(`prisma.${entityName}.${methodName}.${param?.id || param?.where?.id || param?.data?.id ||'?'}.before`, param);
    this.byUser(methodName,param,user);
    const rv:any = await (<any>prismaEnhanced)[entityName][methodName](param);
    this.publishEvent(`prisma.${entityName}.${methodName}.${rv?.id || '?'}.after`, rv);
    return rv as T;
  }

  public async prisma<T>(entityName: string, methodName: string, param: any):Promise<T> {
    return await this._prismaHnd<T>(entityName, methodName, param, this.sysUsr);
  }

  // updated_at & created_at li gestisce zenstack & postgres
  // per ora la cancellazione, che sarà logica, non è gestita
  private byUser(method:string, arg:any, user?:User) {
    if(!user?.id) return;
    switch (method) {
      case 'create':
          if(arg.data) arg.data.created_by = user.id;
        break;
      case 'createMany':
        if(Array.isArray(arg.data)) (<any[]>arg.data).every(d => d.created_by = user.id);
        break;
      case 'update':
      case 'updateMany':
        if(arg.data) arg.data.updated_by = user.id;
        break;
      case 'upsert':
        if(arg.update) arg.update.updated_by = user.id;
        if(arg.create) arg.create.created_by = user.id;
        break;
    }
  }

  // ================================================================================================
  // EVENTS
  // ================================================================================================
  @SubscribeMessage('subscriptions')
  private async handleSubscription(@MessageBody() msg: Message<any>, @ConnectedSocket() socket: Socket) {
    this.console(`${ITdt()} 🤖 [subscriptions] socket.id:${socket.id} msg:`, msg);
    try {
      const session = this.Sessions.get(socket.id)!;
      if (!session.auth && !this.options.skipAuth) throw new Error('Unauthorized');
      switch (msg.topic) {
        case 'clear':
          session.subscriptions = {};
          break;
        case 'add':
          session.subscriptions[msg.payload.idx] = msg.payload.subscriptions;
          break;
        case 'remove':
          delete session.subscriptions[msg.payload.idx];
          break;
        case 'get':
          break;
      }
      return session.subscriptions;
    } catch (err:any) {
      console.error(`${ITdt()} 🤖 err:`, err?.message);
      return { error: err?.message };
    }
  }

  @OnEvent('**')
  private handleAllEvents<T>(event: IEvent<T>) {
    for (const session of this.Sessions.values()) {
      if (isMatching(event.name, distinctSubscriptions(session.subscriptions))) {
        session.socket.emit('event', event, (rv: IResponse<any>) => {
          this.console(`${ITdt()} 🤖 event`, event.name, 'dispatched to:', session.clientId, 'rv:', rv);
        });
      }
    }
  }

  public publishEvent<T>(name: string, payload: T) {
    const event: IEvent<T> = { name, payload, ts: new Date(), id: QUID() };
    this.console(`${ITdt()} 🤖 publishing event:`, event.name);
    this.eventEmitter.emit(name, event);
  }

  
}
