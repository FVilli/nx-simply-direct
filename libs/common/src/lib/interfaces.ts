//import { Socket } from 'socket.io';
import { MsgType } from './enums';
import { User } from './types';

//export interface ISocketSession { socket: Socket; clientId?: string; auth?: IAuth; subscriptions: ISubscriptions;} // questa la devo spostare in nestjs-core
export interface IEvent<T> { name: string; payload?: T; ts: Date; id?: string; }
export interface IMessage<T> { topic: string; payload: T; _type?: MsgType; _id?: string; _dest?: string[]; _sender?: string; _rqst?: IMessage<any>;}
export interface IRequest<RQ, RS> { source: IMessage<RQ>; sendResponse: (response: IMessage<RS>, source: IRequest<RQ, RS>) => void; }
export interface IResponse<T> { data: T | null; err?: string; status?: 'OK' | 'NO-AUTH'; }
export interface ISubscriptions {[idx:number]:string[]}

// AUTH -----------------------------------------------------------------------------------------
export interface ILoginMsg { username: string; password: string; clientId: string; }
export interface ILogoutMsg { clientId: string; }
export interface IRefreshMsg { clientId: string; token: string; }
export interface IAuth { user: User; token: string; }
export interface IJwtPayload { username: string; sub: number; clientId: string; }
