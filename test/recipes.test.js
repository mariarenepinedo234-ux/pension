import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import vm from 'node:vm';
import {createStore} from '../server/store.js';
import {createApp} from '../server/index.js';
const options={now:()=>new Date('2026-11-16T16:00:00Z')};
const recipe={date:'2026-11-16',name:'Sopa de verduras',kind:'soup',portions:20,price:7,ingredients:[{name:'Papa',quantity:.5,unit:'kg',cost:2},{name:'Arroz',quantity:100,unit:'g',cost:.9},{name:'Tomate',quantity:2,unit:'unidad',cost:2}],services:[{name:'Gas',cost:3},{name:'Luz',cost:2},{name:'Agua',cost:1}],note:'Cocinar en olla.'};
test('daily recipe versions calculate preparation and portion costs, preserve history and survive restart without cash effects',()=>{
 const dir=mkdtempSync(join(tmpdir(),'foodsys-recipes-')),file=join(dir,'db.sqlite');let s=createStore(file,options);
 try{
  const before=s.report(recipe.date,recipe.date);s.saveRecipe(recipe);
  const original=s.recipes(recipe.date)[0];assert.equal(original.total,1090);assert.equal(original.unit_cost,54.5);assert.equal(original.margin,645.5);
  s.saveRecipe({...recipe,ingredients:[{name:'Papa',quantity:1,unit:'kg',cost:10}]});
  s.saveRecipe({...recipe,date:'2026-11-17'});assert.equal(s.recipes(recipe.date).length,2);assert.deepEqual(s.recipes(recipe.date)[1],original);assert.equal(s.recipes('2026-11-17').length,1);
  assert.deepEqual(s.report(recipe.date,recipe.date),before);
  for(const update of [{portions:0},{portions:1.5},{date:'2026-02-30'},{kind:'drink'},{ingredients:[]},{ingredients:[{name:'Papa',quantity:-1,unit:'kg',cost:2}]},{ingredients:[{name:'Papa',quantity:1,unit:'invalid',cost:2}]},{services:[{name:'Gas',cost:-1}]}])assert.throws(()=>s.saveRecipe({...recipe,...update}));
  assert.equal(s.recipes(recipe.date).length,2);s.db.close();s=createStore(file,options);assert.deepEqual(s.recipes(recipe.date)[1],original);
 }finally{s.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('order consumption migration preserves old orders; new local and takeaway orders retain normal prices',()=>{
 const dir=mkdtempSync(join(tmpdir(),'foodsys-modes-')),file=join(dir,'db.sqlite');let s=createStore(file,options);
 try{
  const item=s.menu(s.today()).items.find(i=>i.kind==='soup');const body={date:s.today(),type:'reservation',lines:[{itemId:item.id,quantity:1}]};
  const old=s.createOrder(body);s.db.exec('ALTER TABLE orders DROP COLUMN service_mode');s.db.close();s=createStore(file,options);
  assert.equal(s.orders(s.today()).find(o=>o.id===old.id).service_mode,'unspecified');
  const local=s.createOrder(body),takeaway=s.createOrder({...body,service_mode:'takeaway'}),publicOrder=s.createOrder({...body,customer:'Ana',service_mode:'takeaway'},'public');
  assert.equal(local.total,takeaway.total);assert.equal(s.orders(s.today()).find(o=>o.id===local.id).service_mode,'local');
  for(const id of [takeaway.id,publicOrder.id])assert.equal(s.orders(s.today()).find(o=>o.id===id).service_mode,'takeaway');
  const before=s.orders(s.today()).length;assert.throws(()=>s.createOrder({...body,service_mode:'invalid'}));assert.equal(s.orders(s.today()).length,before);
 }finally{s.db.close();rmSync(dir,{recursive:true,force:true});}
});
test('HTTP recipes are admin only and consumption is visible to kitchen for staff and public reservations',async()=>{
 const s=createStore(':memory:',options),app=createApp(s),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 const request=async(path,body,cookie)=>{const response=await fetch(`http://127.0.0.1:${server.address().port}/api${path}`,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};};
 try{
  const admin=await request('/login',{username:'admin',password:'admin123'}),cashier=await request('/login',{username:'cajero',password:'cajero123'}),kitchen=await request('/login',{username:'cocina',password:'cocina123'});
  assert.equal((await request('/recipes')).status,401);
  for(const cookie of [cashier.cookie,kitchen.cookie]){assert.equal((await request('/recipes',undefined,cookie)).status,403);assert.equal((await request('/recipes',recipe,cookie)).status,403);}
  assert.equal((await request('/recipes',recipe,admin.cookie)).status,201);assert.equal((await request('/recipes?date='+recipe.date,undefined,admin.cookie)).data[0].total,1090);
  assert.equal((await request('/recipes?date=invalid',undefined,admin.cookie)).status,400);
  const item=s.menu(s.today()).items.find(i=>i.kind==='soup'),body={date:s.today(),customer:'Ana',phone:'70000000',service_mode:'takeaway',lines:[{itemId:item.id,quantity:1}]};
  assert.equal((await request('/orders',body,cashier.cookie)).status,201);assert.equal((await request('/public/reservations',body)).status,201);
  const state=(await request('/state',undefined,kitchen.cookie)).data;assert.equal(state.orders.length,2);assert.ok(state.orders.every(o=>o.service_mode==='takeaway'));assert.equal(state.recipes,undefined);
 }finally{app.locals.stop();await new Promise(r=>server.close(r));s.db.close();}
});
test('frontend renders daily recipes safely, reuses menu fields and labels consumption in checkout and kitchen',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('}}init();','}}');
 const context=vm.createContext({location:{pathname:'/'},document:{addEventListener(){}},setInterval(){},console});
 vm.runInContext(source+`
 user={role:'admin',name:'Ana'};selectedDate='2026-11-16';recipesData=[{...${JSON.stringify(recipe)},id:1,total:1090,price:700,ingredients:[{name:'<script>',quantity:.5,unit:'kg',cost:200}],created_at:'2026-11-16T16:00:00Z'}];
 state={today:selectedDate,menu:{items:[]},orders:[{id:1,customer:'Ana',service_mode:'takeaway',status:'queued',created_at:'2026-11-16T16:00:00Z',lines:[]}]};
 globalThis.pages={recipes:recipesPage(),cart:cartHTML(),kitchen:kitchen(),orders:orderTable(state.orders),row:menuRow({name:'Sopa',kind:'soup',price:700,stock:20})};
 `,context);
 assert.match(context.pages.recipes,/&lt;script&gt;/);assert.doesNotMatch(context.pages.recipes,/<script>/);assert.match(context.pages.recipes,/Agregar al menú/);assert.match(context.pages.cart,/name="service_mode"/);assert.match(context.pages.kitchen,/Para llevar/);assert.match(context.pages.orders,/Para llevar/);assert.match(context.pages.row,/value="20"/);
});
