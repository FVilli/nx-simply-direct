/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { BaseService, delay, IAuth, Message } from '@simply-direct/common';

@Injectable()
export class DemoService extends BaseService {

  async asyncMethod(msg: Message<any>, auth: IAuth): Promise<string[]> {
    console.log("[asyncMethod] msg",msg,"auth",auth);
    await delay(1000);
    return ['Hello', 'World', '!'];
  }

  syncMethod(msg: Message<any>, auth: IAuth): string {
    console.log("[syncMethod] msg",msg,"auth",auth);
    return 'Hello World !';
  }

}
