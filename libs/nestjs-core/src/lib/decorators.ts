// direct-service.decorator.ts
import { core } from '@angular/compiler';
import 'reflect-metadata';

export const DIRECT_METHOD_METADATA_KEY = 'direct:method';

export function DirectMethod(roles?: string[]): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(DIRECT_METHOD_METADATA_KEY, roles || [], target, propertyKey);
  };
}


// questa function la devo probabilmente mettere in core.gateway

// export function requiredRoles(serviceName: string, methodName: string): string[] | null {

//   const serviceClass = servicesMap[serviceName];
//   if (!serviceClass) {
//     throw new Error(`Service '${serviceName}' not found`);
//   }

//   const methodRoles: string[] = Reflect.getMetadata(DIRECT_METHOD_METADATA_KEY, serviceClass.prototype, methodName);
//   const classRoles: string[] = Reflect.getMetadata(DIRECT_SERVICE_METADATA_KEY, serviceClass) || [];

//   const methodHasRoles = !!methodRoles;
//   const classHasRoles = classRoles.length > 0;

//   // 🔸 Caso 1: metodo decorato, classe no → accesso libero ([])
//   if (methodHasRoles && !classHasRoles) {
//     return [];
//   }

//   // 🔸 Caso 2: metodo decorato, classe con ruoli → servono quelli della classe
//   if (methodHasRoles && classHasRoles && methodRoles.length === 0) {
//     return classRoles;
//   }

//   // 🔸 Caso 3: metodo non decorato, classe sì → non accessibile
//   if (!methodHasRoles && classHasRoles) {
//     return null;
//   }

//   // 🔸 Caso 4: metodo decorato [a,b], classe decorata [c,d] → richiede a+b+c+d
//   if (methodHasRoles && classHasRoles) {
//     const combinedRoles = new Set<string>([...methodRoles, ...classRoles]);
//     return Array.from(combinedRoles);
//   }

//   // Nessuna restrizione
//   return [];
// }
