/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { computed, effect, inject, Injectable, isDevMode, Signal, signal, WritableSignal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Router } from '@angular/router';
import { filter, map, Subject } from 'rxjs';
import { BaseService, IResponse, IAuth, ILoginMsg, ILogoutMsg, IRefreshMsg, IMessage, IEvent, MsgType, crossTabCounter, isMatching, ITdt, User } from '@simply-direct/common';
import { ClearLocalStorage, ClientUID } from './functions';

const _AUTH = '_AUTH';
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const START_AUTH = localStorage.getItem(_AUTH) ? JSON.parse(localStorage.getItem(_AUTH)!) : null;

@Injectable({ providedIn: 'root' })
export class CoreService {
  readonly router = inject(Router);
  private readonly broadcastChannel = new BroadcastChannel('AppService');
  private readonly address = isDevMode() ? window.location.hostname + ":3000" : window.location.origin;
  private socket!: Socket;
  private _events$ = new Subject<IEvent<any>>();
  events$ = this._events$.asObservable();
  private _$events = signal(<IEvent<any>>{ name: 'app.start', ts: new Date() });
  $events = this._$events.asReadonly();
  //public $socketId:WritableSignal<string | undefined> = signal(undefined);
  private _$connected = signal(false);
  $connected = this._$connected.asReadonly();
  private _$initialized = signal(false);
  $initialized = this._$initialized.asReadonly();
  private _$sessionId:WritableSignal<string | undefined> = signal(undefined);
  $sessionId = this._$sessionId.asReadonly();
  private _$auth = signal<IAuth | null>(START_AUTH);
  $auth = this._$auth.asReadonly();
  private _$users:WritableSignal<User[]> = signal([]);
  $users = this._$users.asReadonly();
  $loggedIn = computed(()=>!!this._$auth() && this._$initialized());
  private servicesMap = new Map<string, { service: BaseService; requiresAuth: boolean }>();
  public readonly clientId = ClientUID();
  _log = false;
  log(enable:boolean) { this._log = enable; }
  console(message?: any, ...optionalParams: any[]) {
    if(this._log) console.log(message, ...optionalParams);
  }
  constructor() {

    this.broadcastChannel.onmessage = (event) => {
      this.console(`${ITdt()} 🤖 [broadcastChannel:message]:`, event.data);
      switch (event.data.topic) {
        case 'auth': 
          this.setAuth(event.data.payload,false); 
          if(!event.data.payload) this.router.navigate(['/']);
        break;
      }
    };

    setInterval(this.refresh.bind(this), 60*60*1000);
        
    effect(() => {
        const auth = this._$auth();
        if(auth) localStorage.setItem(_AUTH, JSON.stringify(auth));
        else localStorage.removeItem(_AUTH);
    });

    effect(async ()=>{
        const logged = this.$loggedIn();
        this.console(`${ITdt()} 🤖 [loggedin]: ${logged}`);
        let _idx = 0;
        if(logged) {
            const { idx, stream } = this.subscribe<User>([`prisma.user.create.*.after`,`prisma.user.update.*.after`]);
            _idx = idx;
            const users = await this.prisma<User[]>(`user.findMany`) || [];
            this._$users.set(users);
            stream.subscribe( user => {
              const users = this._$users();
              const updatedUsers =  users.map(u => u.id === user.id ? user : u );
              this._$users.set(updatedUsers);
            });
        } else {
            if(_idx>0) this.unsubscribe(_idx);
            this._$users.set([]);
        }
    });

    effect(()=>{
        const connected = this._$connected();
        this.console(`${ITdt()} 🤖 [socket:connected]: ${connected}`);
        if(connected) setTimeout(this.refresh.bind(this),10);
    })
    
    const _address = `${this.address}?client-id=${this.clientId}`;
    this.console(`${ITdt()} 🤖 [init] socket.io-client address:`,_address);

    this.socket = io(_address,{ transports: ['websocket'] }); // 'polling','websocket','webtransport'

    this.socket.on('connect', () => { 
      this._$connected.set(true); 
      this._$sessionId.set(this.socket.id); 
      this.dispatchEvent({ name: 'socket.connected', ts: new Date() });
    });

    this.socket.on('disconnect', () => { 
      this._$connected.set(false);
      this._$sessionId.set(undefined); 
      this.dispatchEvent({ name: 'socket.disconnected', ts: new Date() });
    }); 


    // this.messages$ = fromEvent<Message<any>>(this.socket, 'msg').pipe(
    //   filter<Message<any>>((msg) => msg._type !== MsgType.evt && msg._type !== MsgType.rsp)
    // );

    // const connect$ = fromEvent(this.socket, 'connect').pipe(map(() => { 
    //   this.console("Connected",this.socket.id);
    //   this.$socketId.set(this.socket.id); 
    //   return <Event>{ _type: EventType.connect } 
    // }));

    // const disconnect$ = fromEvent(this.socket, 'disconnect').pipe(map((info) => { 
    //   this.console("Disconnected",this.socket.id);
    //   this.$socketId.set(this.socket?.id);
    //   return <Event>{ _type: EventType.disconnect, info } 
    // }));

    // const messages$ = fromEvent<Message<any>>(this.socket, 'msg').pipe(
    //   filter((msg) => msg._type === MsgType.evt),
    //   map((msg) => { return <Event>{ _type: EventType.server, info: { topic: msg.topic, payload: msg.payload } } })
    // )

    // this.events$ = messages$.pipe(mergeWith(connect$, disconnect$));

    // this.events$.pipe(
    //   filter( (e) => e._type == EventType.server && e.info.topic==="clientId"),
    //   tap( e => { this.clientId = e.info.payload })
    // ).subscribe();

    //this.events$ = fromEvent<IEvent<any>>(this.socket, 'event');
    this.socket.on("event", async (event:IEvent<any>, cb) => {
      cb({ status: 'ok' });
      this.dispatchEvent(event);
    });

    this.socket.on("request", async (request:IMessage<any>, cb) => {
      this.console(`${ITdt()} 🤖 [requesting] by server:`, request.topic);
      try {
        const serviceName = request.topic.split('.')[0];
        const methodName = request.topic.split('.')[1];
        const auth = this._$auth();
        const mapItem = this.servicesMap.get(serviceName);
        if(!mapItem) throw new Error('Service not found');
        const service = mapItem.service;
        const requiresAuth = mapItem.requiresAuth;
        if (requiresAuth && !auth) throw new Error('Not loggedin');
        const data = await (<any>service)[methodName](request.payload);
        this.console(`${ITdt()} 🤖 [request] by server:`, request,'executed with rv:', data);
        cb({ data });
      } catch (err:any) {
        console.error(`${ITdt()} 🤖 err:`, err['message']);
        cb({ err: err['message'] });
      }
    });
  }

  register(serviceName: string, service: BaseService, requiresAuth = true) {
    this.servicesMap.set(serviceName, { service,requiresAuth });
    this.console(`${ITdt()} 🤖 [registered service]:`, serviceName);
  }

  send(topic: string, payload: any = null, dest: string[] = []) {
    const rv = this.socket.emit('message', { topic, payload, _type: MsgType.msg, _dest: dest },(rv:any)=>{
      this.console(`${ITdt()} 🤖 [sent]`,topic);
    });
  }

  async request<T>(topic: string, payload: any = null) {
    this.console(`${ITdt()} 🤖 [request]`,topic,payload);
    return new Promise<T | null>((resolve, reject) => {
      this.socket.emit('request', { topic, payload },(rv:IResponse<T>)=>{
        this.console(`${ITdt()} 🤖 [response]`,rv);
        if(rv.err) reject({message:rv.err}); 
        else resolve(rv.data);
      });
    });
  }

  async prisma<T>(topic: string, payload: any = null) {
    this.console(`${ITdt()} 🤖 [prisma:request]`,topic,payload);
    return new Promise<T | null>((resolve, reject) => {
      this.socket.emit('prisma', { topic, payload },(rv:IResponse<T>)=>{  
        this.console(`${ITdt()} 🤖 [prisma:response]`,topic,payload,rv);
        if(rv.err) reject({message:rv.err}); 
        else resolve(rv.data); 
      });
    });
  }

  async subscriptions(topic: 'clear' | 'add' | 'remove' | 'get', payload: string[] = []): Promise<IResponse<string[]>> {
    return new Promise<IResponse<string[]>>((resolve, reject) => {
      this.socket.emit('subscriptions', { topic, payload },(rv:string[])=>{ resolve({ data:rv }); });
    });
  }

  subscribe<T>(subscriptions: string[]) {
    const idx = crossTabCounter('subscribe_idx');
    const stream = this.events$.pipe(
      filter(event => isMatching(event.name,subscriptions)),
      map(event => event.payload as T)
    );  
    this.socket.emit('subscriptions', { topic:'add', payload:{ idx,subscriptions} });
    const unsubscribe = ()=> { this.socket.emit('subscriptions', { topic:'remove', payload:{ idx } }); }
    return { idx, stream, unsubscribe };
  }

  unsubscribe(idx:number) {
    this.socket.emit('subscriptions', { topic:'remove', payload:{ idx } });
  }

  // forse questo è superfluo ?
  private async auth<T>(topic: 'login' | 'logout' | 'refresh', payload: ILoginMsg | ILogoutMsg | IRefreshMsg ): Promise<IResponse<T>> {
    return new Promise<IResponse<T>>((resolve, reject) => {
      this.socket.emit('auth', { topic, payload },(rv:IResponse<T>)=>{ resolve(rv); });
    });
  }

  private setAuth(value: IAuth | null, withBroadcast = true):IAuth | null {
    this.console(`${ITdt()} 🤖 [setAuth]`,value);
    if(withBroadcast) this.broadcastChannel.postMessage({ topic: 'auth', payload: value });
    this._$auth.set(value);
    return value;
  }

  async login(username:string,password:string):Promise<IAuth | null> {
    const payload:ILoginMsg = { username, password, clientId: this.clientId };
    const res = await this.auth<IAuth>("login",payload);
    //this.console("🤖 [login]",res.data);
    return this.setAuth(res.data);
  }

  async logout() {
    this.setAuth(null);
    await this.auth<any>("logout",{ clientId: this.clientId });
    ClearLocalStorage();
  }

  private async refresh() {
      const auth = this._$auth();
      const connected = this._$connected();
      const initialized = this._$initialized();
      if(!!auth && connected) {
        const res = await this.auth<IAuth>("refresh",{ clientId: this.clientId, token:auth.token });
        this.setAuth(res.data);
      }
      if(!initialized) this._$initialized.set(true); 
  }

  private dispatchEvent<T>(event:IEvent<T>) {
    this._$events.set(event);
    this._events$.next(event);
  }

}

