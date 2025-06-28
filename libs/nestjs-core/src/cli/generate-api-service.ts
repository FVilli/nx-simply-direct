import { Project, Decorator } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

const OUTPUT_PATH = 'src/rpc-contract.generated.ts';
const DECORATOR_NAME = 'DirectMethod'; 

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

// Filtra solo i file .ts (non .spec.ts, ecc.)
const sourceFiles = project.getSourceFiles('src/**/*.ts');

const common = new Map<string,Set<string>>();
const prisma = new Set<string>();
const services = new Map<string,string[]>();

// ANALISI

for (const file of sourceFiles) {
  //console.log(file.getBaseName());
  const classes = file.getClasses();

  for (const cls of classes) {
    
    console.log(`# CLASS:${cls.getName()} #######################################################`)

    const className = cls.getName();
    if(className) {
      const direct_methods:string[] = []
      const isService = !!cls.getDecorators().find((d: Decorator) => d.getName() === 'Injectable' || d.getFullName()?.includes('@nestjs/common'));
      if (!isService) continue;

      const methods = cls.getMethods(); //.filter((method) => method.getDecorators().some((d: Decorator) => d.getName() === DECORATOR_NAME));

      for (const method of methods) {
        
        console.log('');
        console.log(`- METHOD:${method.getName()} ---------------------------------------------------------------`)
        
        const methodName = method.getName();
        const parameters = method.getParameters()
        const decorators = method.getDecorators();
        const isDirectMethod = !!decorators.find((d: Decorator) => d.getName() === DECORATOR_NAME);
        
        console.log("isDirectMethod",isDirectMethod);
        
        
        const p0 = parameters[0];
        let p0Type = '?';
        let p0Name = '?';
        if(!!p0) {
          p0Name = p0.getName();
          console.log(`
@ P0:${p0Name} @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@`)
          const isClassOrInterface = p0.getType().isClassOrInterface();
          const symbol = p0.getType().getSymbol()?.getName();
          const isArray = symbol==='Array';

          console.log("p0",p0Name);
          console.log("type.text",p0.getType().getText());
          console.log("isClassOrInterface",p0.getType().isClassOrInterface());
          console.log("symbol",p0.getType().getSymbol()?.getName());
          
          if(isClassOrInterface || isArray) {
            const chunks = p0.getType().getText().split(".");
            p0Type = chunks[1];

            const match = chunks[0].match(/"(.*?)"/);
            if (match) {
              const commonSub =  match[1].replaceAll('"','').split('/common/');
              if(commonSub[1]) {
                const s = common.get(commonSub[1]) || new Set<string>();
                s.add(p0Type.replaceAll("[]",""));
                common.set(commonSub[1],s);
              }
            }

          } else {
            p0Type = p0.getType().getText();
          }
        }

        const p1 = parameters[1];
        let p1NotIAuth = false;
        if(!!p1) p1NotIAuth = p1.getType().getSymbol()?.getName()!=='IAuth';

        const rvType = method.getReturnType();
        const rvText = rvType.getText();
        const rvSymbol = rvType.getSymbol()?.getName();
        const rvAwaitedType = rvType.getTypeArguments()[0]?.getText();
        const rvAwaitedTypeSymbol = rvType.getTypeArguments()[0]?.getSymbol()?.getName();
        const rvApparentType = rvType.getApparentType().getText();

        console.log(`
@ RV:${rvSymbol || rvText} @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@`)

        console.log("rvText",rvText);
        console.log("rvSymbol",rvSymbol);
        console.log("rvAwaitedType",rvAwaitedType);
        console.log("rvAwaitedTypeSymbol",rvAwaitedTypeSymbol);
        console.log("rvApparentType",rvApparentType);

        let RV = '?'
        if(!rvSymbol || rvSymbol==='Array') {
          RV = rvText;
        } else if (rvSymbol==='Promise') {
          RV = rvAwaitedType;
        } else {
          RV = rvSymbol;
        }

        RV = RV.replaceAll(" | null","");

        if(RV.indexOf(".")>0) {
            const chunks = RV.split(".");
            RV = chunks[1];

            const match = chunks[0].match(/"(.*?)"/);
            if (match) {
              const commonSub =  match[1].replaceAll('"','').split('/common/');
              if(commonSub[1]) {
                const s = common.get(commonSub[1]) || new Set<string>();
                s.add(p0Type.replaceAll("[]",""));
                common.set(commonSub[1],s);
              }
            }
          } 

        let direct_method = '';
        
        if(parameters.length>2) {
          console.log("Solo metodi con al massimo 2 parametri di cui il secondo deve essere per forza di type:IAuth");
        } else if(p1NotIAuth) {
          console.log("Il secondo parametro, se presente, può essere solo type:IAuth");
        } else if(!p0) { 
          // NESSUN PARAMETRO
          direct_method = `${methodName}: async ():Promise<${RV} | null> => { return await this.core.request('${className}.${methodName}'); },`;
        } else {
          direct_method = `${methodName}: async (${p0Name}:${p0Type}):Promise<${RV} | null> => { return await this.core.request('${className}.${methodName}',${p0.getName()}); },`; 
        }

        if(direct_method!=='') {
          console.table({direct_method});
          direct_methods.push(direct_method);
        }


          
      }

      if(direct_methods.length>0) services.set(className,direct_methods);
    }
  }
}

// COSTRUZIONE FILE

let content = `
// =====================================================
//  NON MODIFICARE QUESTO FILE !!
//  QUESTO FILE VIENE GENERATO AUTOMATICAMENTE ...
//  LEGGERE ATTENTAMENTE LE ISTRUZIONI !!! 
// =====================================================

import { inject, Injectable } from "@angular/core";
import { CoreService } from "@simply-direct/ngx-core";
`;

for(const k of common.keys()) {
  const c = common.get(k);
  if(c) {
    const arr = Array.from(c)
    content += `import { ${arr.join(',')} } from '@common/${k}';`
  }
}

if(prisma.size>0) {
  content += `
import { ${ Array.from(prisma).join(',') } from "@prisma/client";`
}

content += `

@Injectable()
export class ApiService {

    private readonly core = inject(CoreService);
`
for(const service of services.keys()) {
  const methods = services.get(service) || [];
  if(methods.length>0) {
    content += `
    ${service} = {`;
    
    for(const m of methods) {
    content += `
        ${m}`;
    }
    content += `
    }`;
  }
}

content += `
}`;

// SALVATAGGIO

console.log(content);



fs.writeFileSync(path.resolve(OUTPUT_PATH), content.trim(), 'utf8');
console.log(`✅ RPC contract written to ${OUTPUT_PATH}`);
