

import { ISubscriptions } from '@simply-direct/common';
import * as crypto from 'crypto';



export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('base64');
}

/**
 * "Quasi UID", questa funzione restituisce un identificativo quasi univoco di 8 caratteri.
 * L'univocità non è garantita su grosse quantità e lunghi periodi di tempo.
 */
export function QUID(): string {
  return crypto.randomUUID().substring(0, 8);
}
  
  export function isMatching(event: string, subscriptions: string[]): boolean {
    if (subscriptions.includes('**')) return true;
    const eventParts = event.split('.');
    return subscriptions.some((sub) => {
      const subParts = sub.split('.');
      if (subParts.length !== eventParts.length) return false;
      return subParts.every((part, index) => part === '*' || part === eventParts[index]);
    });
  }
  
  export function distinctSubscriptions(subscriptions:ISubscriptions): string[] {
    const distinct = new Set<string>();
    Object.values(subscriptions).forEach( (arr:string[]) => { arr.forEach((str:string) => distinct.add(str));});
    return Array.from(distinct); 
  }

