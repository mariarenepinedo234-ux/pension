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
test('cambiar un completo conserva el pedido y ajusta solo los platos cambiados',()=>{
 const s=make();try{
  const date=s.today();let mainIndex=0;const base=s.menu(date).items.filter(i=>i.kind!=='drink').map(i=>({...i,price:i.price/100,stock:i.kind==='main'?(mainIndex++===0?22:20):i.stock}));
  s.saveMenu({date,combo_price:25,published:true,items:[...base,{name:'Rusa',kind:'side',price:5,stock:22},{name:'Fit',kind:'side',price:5,stock:20}]});
  const m=s.menu(date), soup=m.items.find(i=>i.kind==='soup'), mains=m.items.filter(i=>i.kind==='main'), sides=m.items.filter(i=>i.kind==='side'), extra=m.items.find(i=>i.kind==='extra');
  const order=s.createOrder({date,customer:'Ana',phone:'123',note:'Sin sal',type:'reservation',lines:[{kind:'combo',soupId:soup.id,mainId:mains[0].id,sideId:sides[0].id,quantity:2},{kind:'item',itemId:extra.id,quantity:1}]});
  const before=s.orders(date)[0], combo=before.lines.find(l=>JSON.parse(l.selection).kind==='combo'), originalExtra=before.lines.find(l=>l.id!==combo.id);
  s.transaction(()=>s.pay(order.id,'cash'));
  s.changeCombo(order.id,{revision:0,lineId:combo.id,quantity:1,mainId:mains[1].id,sideId:sides[1].id},{id:1,name:'Admin',username:'admin',role:'admin'});
  const after=s.orders(date)[0], available=id=>s.menu(date).items.find(i=>i.id===id).available;
  assert.equal(available(mains[0].id),21);assert.equal(available(mains[1].id),19);
  assert.equal(available(sides[0].id),21);assert.equal(available(sides[1].id),19);
  assert.equal(available(soup.id),soup.available-2);assert.equal(available(extra.id),extra.available-1);
  assert.equal(after.total,before.total);assert.equal(after.paid,before.total);assert.equal(after.note,'Sin sal');assert.deepEqual(after.lines.find(l=>l.id===originalExtra.id),originalExtra);
  assert.deepEqual(after.lines.filter(l=>l.id!==originalExtra.id).map(l=>l.quantity),[1,1]);
  assert.throws(()=>s.changeCombo(order.id,{revision:0,lineId:combo.id,quantity:1,mainId:mains[1].id,sideId:sides[1].id}),/cambió/);
  s.transition(order.id,'queued','cashier');assert.throws(()=>s.changeCombo(order.id,{revision:1,lineId:combo.id,quantity:1,mainId:mains[1].id,sideId:sides[1].id}),/antes de enviarlas/);
 }finally{s.db.close();}
});
test('si no alcanza el nuevo segundo, el cambio no altera reserva ni existencias',()=>{
 const s=make();try{const date=s.today(),m=s.menu(date),soup=m.items.find(i=>i.kind==='soup'),mains=m.items.filter(i=>i.kind==='main');
 const order=s.createOrder({date,customer:'Ana',type:'reservation',lines:[{kind:'combo',soupId:soup.id,mainId:mains[0].id,quantity:1}]});
 s.run('UPDATE items SET used=stock WHERE id=?',mains[1].id);const before=s.orders(date)[0],menu=s.menu(date);
 assert.throws(()=>s.changeCombo(order.id,{revision:0,lineId:before.lines[0].id,quantity:1,mainId:mains[1].id}),/No alcanza/);
 assert.deepEqual(s.orders(date)[0],before);assert.deepEqual(s.menu(date),menu);
 }finally{s.db.close();}
});
