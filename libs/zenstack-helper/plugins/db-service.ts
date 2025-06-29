import { type PluginOptions, ZModelCodeGenerator, getLiteral } from '@zenstackhq/sdk';
import { isDataModel, type DataModel, type Model, type DataModelAttribute } from '@zenstackhq/sdk/ast';
import * as fs from 'fs-extra';
import * as path from 'path';
import { nextTick } from 'process';

const OUTPUT_PATH = '../frontend/src/@generated/db.service.ts';

const CONTENT = `
// =====================================================
//  NON MODIFICARE QUESTO FILE !!
//  QUESTO FILE VIENE GENERATO AUTOMATICAMENTE ...
//  LEGGERE ATTENTAMENTE LE ISTRUZIONI !!! 
// =====================================================

import { inject, Injectable } from "@angular/core";
import { CoreService } from "@simply-direct/ngx-core";
import { Prisma, <#ENTITIES_LIST#> } from "@prisma/client"

@Injectable()
export class DbService {

    private readonly core = inject(CoreService);

    <#ENTITIES_BLOCKS#>
}`

const BLOCK = `
    <ntt> = {

        // CREATION
        create: async (args:Prisma.<Ntt>CreateArgs):Promise<<Ntt> | null> => { return await this.core.prisma('<ntt>.create',args); },
        createMany: async (args:Prisma.<Ntt>CreateManyArgs): Promise<Prisma.BatchPayload | null> => { return await this.core.prisma('<ntt>.createMany',args); },
  
        // READ
        findMany: async (args?: Prisma.<Ntt>FindManyArgs):Promise<<Ntt>[] | null> => { return await this.core.prisma('<ntt>.findMany',args); },
                
        
        // findFirst<T extends UserFindFirstArgs>(args?: T): Promise<User | null>;
        
        // findFirstOrThrow<T extends UserFindFirstArgs>(args?: T): Promise<User>;
        
        // findUnique<T extends UserFindUniqueArgs>(args: T): Promise<User | null>;
        
        // findUniqueOrThrow<T extends UserFindUniqueArgs>(args: T): Promise<User>;
        
        // // UPDATE
        // update<T extends UserUpdateArgs>(args: T): Promise<User>;
        
        // updateMany<T extends UserUpdateManyArgs>(args: T): Promise<Prisma.BatchPayload>;
        
        // // DELETE
        // delete<T extends UserDeleteArgs>(args: T): Promise<User>;
        
        // deleteMany<T extends UserDeleteManyArgs>(args?: T): Promise<Prisma.BatchPayload>;
        
        // // UPSERT
        // upsert<T extends UserUpsertArgs>(args: T): Promise<User>;
        
        // // AGGREGATION
        // count<T extends UserCountArgs>(args?: T): Promise<number>;
        
        // aggregate<T extends UserAggregateArgs>(args: T): Promise<UserAggregateResult>;
        
        // groupBy<T extends UserGroupByArgs>(args: T): Promise<UserGroupByResult[]>;
    
    }
`

function firstLetterLowercase(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function firstLetterUppercase(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function replaceAll(str: string, searchValue: string, replaceValue: string): string {
  if (!str || searchValue === '') return str;
  return str.split(searchValue).join(replaceValue);
}

export default async function run(model: Model, options: PluginOptions) {
  
  // get all data models
  const dataModels = model.declarations.filter((x): x is DataModel => isDataModel(x));

  // TOC
  const entities = dataModels.map(x => x.name);

  let blocks = '';

  for(const entity of entities) {
    let eb = BLOCK;
    const ntt = firstLetterLowercase(entity);
    const Ntt = firstLetterUppercase(entity);
    eb = replaceAll(eb,'<ntt>',ntt);
    eb = replaceAll(eb,'<Ntt>',Ntt);
    blocks += eb;
  }

  let content = CONTENT;
  content = content.replace('<#ENTITIES_LIST#>',entities.join(','));
  content = content.replace('<#ENTITIES_BLOCKS#>',blocks);

  fs.writeFileSync(OUTPUT_PATH,content);
}
