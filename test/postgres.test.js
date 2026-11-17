import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import pg from 'pg';
import { createStore } from '../server/store.js';

const databaseUrl=process.env.TEST_DATABASE_URL;
const freePort=()=>new Promise((resolve,reject)=>{const server=createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(error=>error?reject(error):resolve(port));});});
test('PostgreSQL: startup, orders, stock, payment, reporting and competing reservations', {skip:!databaseUrl,timeout:60000}, async()=>{
 const admin=new pg.Client({connectionString:databaseUrl});await admin.connect();
 const schema='test_'+randomBytes(8).toString('hex');await admin.query(`CREATE SCHEMA ${schema}`);
 const url=new URL(databaseUrl);url.searchParams.set('options',`-c search_path=${schema}`);
 const connection=url.toString();let store;const children=[];
 try {
  store=createStore(connection);const date=store.today();const items=store.menu(date).items.filter(i=>i.kind!=='drink').map(i=>({...i,price:i.price/100,stock:i.kind==='main'?1:10}));
  store.saveMenu({date,combo_price:25,published:true,items});
  const menu=store.menu(date), soup=menu.items.find(i=>i.kind==='soup'), main=menu.items.find(i=>i.kind==='main');
  const beverage=store.saveProduct({name:'Agua prueba',price:8,unit_cost:4,minimum:1,stock:3});
  assert.equal(store.menu(date).items.find(i=>i.productId===beverage).available,3);
  store.db.close();store=null;
  const ports=[await freePort(),await freePort()];while(ports[1]===ports[0])ports[1]=await freePort();let stderr='';
  for(const port of ports){const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,DATABASE_URL:connection,PORT:String(port)},stdio:['ignore','ignore','pipe']});children.push(child);child.stderr.on('data',chunk=>{stderr+=chunk.toString();});}
  for(const port of ports){let ready=false;for(let i=0;i<100;i++){try{const r=await fetch(`http://127.0.0.1:${port}/api/public/menu?date=${date}`);if(r.ok){ready=true;break;}}catch{}await delay(100);}assert.ok(ready,`server did not start: ${stderr}`);}
  const body={date,customer:'Prueba',phone:'70000000',lines:[{kind:'combo',soupId:soup.id,mainId:main.id,quantity:1}]};
  const response=await Promise.all(ports.map(port=>fetch(`http://127.0.0.1:${port}/api/public/reservations`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})));
  assert.deepEqual(response.map(r=>r.status).sort(),[201,409]);
  const winner=await response.find(r=>r.status===201).json();
  const login=await fetch(`http://127.0.0.1:${ports[0]}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'admin',password:'admin123'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  const state=await fetch(`http://127.0.0.1:${ports[0]}/api/state?date=${date}`,{headers:{cookie}});assert.equal(state.status,200);const data=await state.json();assert.equal(data.menu.items.find(i=>i.id===main.id).available,0);assert.equal(data.orders.length,1);
  const otherMain=data.menu.items.find(i=>i.kind==='main'&&i.id!==main.id), line=data.orders[0].lines[0];
  const kitchenLogin=await fetch(`http://127.0.0.1:${ports[0]}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'cocina',password:'cocina123'})});
  const kitchenCookie=kitchenLogin.headers.get('set-cookie').split(';')[0];
  const denied=await fetch(`http://127.0.0.1:${ports[0]}/api/orders/${winner.id}/combo`,{method:'POST',headers:{cookie:kitchenCookie,'Content-Type':'application/json'},body:JSON.stringify({lineId:line.id,revision:0,quantity:1,mainId:otherMain.id})});assert.equal(denied.status,403);
  const change=async (revision,mainId)=>fetch(`http://127.0.0.1:${ports[0]}/api/orders/${winner.id}/combo`,{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({lineId:line.id,revision,quantity:1,mainId})});
  assert.equal((await change(0,otherMain.id)).status,200);
  assert.equal((await change(0,main.id)).status,409);
  assert.equal((await change(1,main.id)).status,200);
  const payment=await fetch(`http://127.0.0.1:${ports[0]}/api/orders/${winner.id}/pay`,{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({method:'cash'})});
  // The business automatically closes at 18:00 Bolivia, independent of the host timezone.
  if(data.cash.closed_at) assert.equal(payment.status,409); else {assert.equal(payment.status,200);const report=await (await fetch(`http://127.0.0.1:${ports[0]}/api/reports?from=${date}&to=${date}`,{headers:{cookie}})).json();assert.equal(report.income,2500);}
  for(const child of children)child.kill('SIGTERM');await Promise.all(children.map(c=>new Promise(resolve=>c.once('exit',resolve))));children.length=0;
  store=createStore(connection);assert.equal(store.orders(date).length,1);assert.equal(store.menu(date).items.find(i=>i.id===main.id).available,0);
  const reserved=store.createOrder({date,customer:'Otro',type:'reservation',lines:[{kind:'product',productId:beverage,quantity:2}]});
  assert.equal(store.inventory().products.find(p=>p.id===beverage).stock,1);
  store.editOrder(reserved.id,{date,customer:'Otro',revision:0,lines:[{kind:'product',productId:beverage,quantity:1}]});
  assert.equal(store.inventory().products.find(p=>p.id===beverage).stock,2);
  store.transition(reserved.id,'cancelled','cashier');assert.equal(store.inventory().products.find(p=>p.id===beverage).stock,3);
  store.movement({productId:beverage,type:'receipt',quantity:2,date,cost:6},'admin');assert.equal(store.inventory().products.find(p=>p.id===beverage).stock,5);
  store.saveRecipe({date,name:'Ensalada',kind:'side',portions:2,price:5,ingredients:[{name:'Papa',quantity:1,unit:'kg',cost:3}],services:[]});assert.equal(store.recipes(date)[0].total,300);
  const actor=store.users().find(u=>u.username==='admin');store.saveUser({name:'Cajero nuevo',username:'cajero_nuevo',role:'cashier',password:'clave123'},actor);assert.ok(store.users().some(u=>u.username==='cajero_nuevo'));
  assert.equal(store.inventory().products.find(p=>p.id===beverage).unit_cost,400);
 } finally {if(store)store.db.close();await Promise.all(children.map(child=>child.exitCode!==null?Promise.resolve():new Promise(resolve=>{child.once('exit',resolve);child.kill('SIGTERM');})));await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
