import { Worker } from 'node:worker_threads';

// The domain currently uses a synchronous transaction API. A dedicated worker
// owns the PostgreSQL connection; queries remain parameterized and transactions
// are serialized between application instances by a transaction advisory lock.
export class PostgresDatabase {
 constructor(url) {
  this.buffer=new SharedArrayBuffer(64*1024*1024);
  this.signal=new Int32Array(this.buffer,0,2);
  this.worker=new Worker(new URL('./postgres-worker.js',import.meta.url),{workerData:{url}});
  this.worker.unref();
  try {this.call('init');} catch(error) {this.worker.terminate();throw error;}
 }
 call(method,sql='',args=[]) {
  Atomics.store(this.signal,0,0);Atomics.store(this.signal,1,0);
  this.worker.postMessage({method,sql,args,buffer:this.buffer});
  if(Atomics.wait(this.signal,0,0,35000)==='timed-out') {this.worker.terminate();throw new Error('Tiempo de espera agotado al consultar PostgreSQL');}
  const length=Atomics.load(this.signal,1), text=new TextDecoder().decode(new Uint8Array(this.buffer,8,length));
  const result=JSON.parse(text);if(result.error){const error=new Error(result.error);error.code=result.code;throw error;}return result.value;
 }
 exec(sql){return this.call('exec',sql);}
 prepare(sql){return {all:(...args)=>this.call('all',sql,args),get:(...args)=>this.call('get',sql,args)??undefined,run:(...args)=>this.call('run',sql,args)};}
 ready(){this.call('ready');}
 close(){try{this.call('close');}finally{this.worker.terminate();}}
}
