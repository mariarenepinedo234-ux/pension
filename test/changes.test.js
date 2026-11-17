import test from 'node:test';
import assert from 'node:assert/strict';
import {createStore} from '../server/store.js';

const make=()=>createStore(':memory:',{now:()=>new Date('2026-11-17T15:00:00Z')});
test('guarniciones se reservan en completos y por separado, y edición es atómica',()=>{
 const s=make();try{
  const date=s.today(), original=s.menu(date), items=original.items.filter(i=>i.kind!=='drink').map(i=>({...i,price:i.price/100}));
  s.saveMenu({date,combo_price:25,published:true,items:[...items,{name:'Rusa',kind:'side',price:5,stock:2},{name:'Fit',kind:'side',price:6,stock:2}]});
  const menu=s.menu(date), soup=menu.items.find(i=>i.kind==='soup'), mains=menu.items.filter(i=>i.kind==='main'), sides=menu.items.filter(i=>i.kind==='side');
  const combo={kind:'combo',soupId:soup.id,mainId:mains[0].id,sideId:sides[0].id,quantity:1};
  assert.throws(()=>s.createOrder({date,customer:'Ana',type:'reservation',lines:[{...combo,sideId:undefined}]}));
  const order=s.createOrder({date,customer:'Ana',type:'reservation',lines:[combo,{kind:'item',itemId:sides[0].id,quantity:1}]});
  assert.equal(s.menu(date).items.find(i=>i.id===sides[0].id).available,0);
  assert.throws(()=>s.editOrder(order.id,{date,customer:'Ana',revision:0,lines:[{...combo,mainId:mains[1].id,sideId:sides[1].id,quantity:3}]}));
  assert.equal(s.orders(date)[0].total,3000);assert.equal(s.menu(date).items.find(i=>i.id===sides[0].id).available,0);
  s.editOrder(order.id,{date,customer:'Ana',revision:0,lines:[{...combo,mainId:mains[1].id,sideId:sides[1].id}]});
  assert.equal(s.menu(date).items.find(i=>i.id===sides[0].id).available,2);assert.equal(s.menu(date).items.find(i=>i.id===sides[1].id).available,1);
  assert.match(s.orders(date)[0].lines[0].label,/Fit/);assert.throws(()=>s.editOrder(order.id,{date,customer:'Ana',revision:0,lines:[combo]}),/cambió/);
  s.transaction(()=>s.pay(order.id,'cash'));assert.throws(()=>s.editOrder(order.id,{date,customer:'Ana',revision:1,lines:[combo]}),/pendientes de pago/);
 }finally{s.db.close();}
});
test('costo opcional de bebida se conserva y no registra gastos',()=>{
 const s=make();try{const id=s.saveProduct({name:'Agua',price:8,unit_cost:4.5,minimum:1,stock:2});let p=s.inventory().products.find(p=>p.id===id);assert.equal(p.unit_cost,450);assert.equal(p.price-p.unit_cost,350);s.saveProduct({id,name:'Agua',price:9,minimum:1});p=s.inventory().products.find(p=>p.id===id);assert.equal(p.unit_cost,450);assert.equal(s.report(s.today(),s.today()).spent,0);}finally{s.db.close();}
});
