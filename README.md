# Foodsys

Primera versión de un sistema web para pensiones, restaurantes y comida rápida. JavaScript en el navegador, Node.js + Express en el servidor y SQLite como base de datos local. No necesita Python, Docker, una cuenta externa ni instalar un servidor de base de datos.

## Iniciar en Windows

Instala **Node.js 24 LTS** (incluye npm). Descarga o clona este repositorio y abre una terminal dentro de su carpeta:

```powershell
npm.cmd install
npm.cmd run dev
```

Abre **http://localhost:5173**. Mantén la terminal abierta mientras uses el sistema. Para detenerlo, presiona `Ctrl+C`. En macOS/Linux los comandos son `npm install` y `npm run dev`.

Node.js es el único requisito: esta aplicación utiliza el módulo SQLite incluido en Node 24. Si tu versión es anterior, actualízala. La primera instalación requiere Internet; las fuentes, el QR y los recursos de la aplicación quedan instalados localmente.

### Usuarios iniciales de demostración

| Perfil | Usuario | Contraseña inicial | Permisos |
| --- | --- | --- | --- |
| Administrador | `admin` | `admin123` | Menús, ventas, reservas, cocina, gastos, arqueo, reportes y usuarios |
| Cajero | `cajero` | `cajero123` | Ventas, reservas, cobros, disponibilidad, seguimiento de pedidos, fondo inicial y cierre de caja |
| Cocina | `cocina` | `cocina123` | Cola de preparación, marcar listo y entregar pedidos pagados |

Son cuentas para probar localmente. Antes del **primer arranque** puedes definir `ADMIN_PASSWORD`, `CAJERO_PASSWORD` y `COCINA_PASSWORD` en el entorno del proceso para sustituir las contraseñas iniciales. Por ejemplo, en PowerShell, `$env:ADMIN_PASSWORD = 'una-contraseña-propia'`. Estas variables solo se aplican al crear cada usuario por primera vez; no modifican cuentas ya existentes. No se carga un archivo `.env` automáticamente.

## Qué puedes probar

1. Entra como administrador. Se crea un menú de ejemplo para la fecha de Bolivia del primer inicio: 50 sopas de maní, 35 milanesas de pollo, 25 asados, gaseosas y extras. Son cantidades y precios editables, no ventas ficticias.
2. En **Menú del día**, elige la fecha, define platos, precios y producción total. Publica el menú para habilitar las reservas públicas. Puedes preparar el menú de mañana. Cada producto permite cargar o quitar una foto JPEG, PNG o WebP (hasta 10 MB de entrada); el navegador la reduce antes de guardarla en SQLite. Las fotos también se muestran en el catálogo de venta y reservas. No se copia automáticamente el menú de ayer.
3. En **Punto de venta**, agrega completos o platos sueltos. Un completo contiene una sopa y un segundo a elección, más un vaso de refresco incluido automáticamente. No se elige, no se registra como producto ni se vende suelto. Las gaseosas y otras bebidas se pueden vender por separado. El precio del completo es independiente de la suma de precios individuales.
4. El nombre en caja es **Cliente sin nombre** por defecto y se puede editar; las reservas públicas siguen solicitando el nombre. Elige **Venta** para enviar el pedido inmediatamente a cocina, o **Reserva** para apartar porciones sin empezar a prepararlas. Puedes registrar las reservas recibidas por WhatsApp. No existe integración automática con WhatsApp.
5. Registra el cobro en efectivo o por QR, o déjalo pendiente. Seleccionar QR significa que el cajero **ya verificó el abono en su banco**. No hay pasarela, cargo automático ni verificación bancaria.
6. En **Pedidos y reservas**, cobra pendientes, envía reservas de hoy a cocina y anula reservas o pedidos sin pagar que todavía no estén en preparación.
7. Abre **Cocina** en otro navegador/dispositivo con la cuenta de cocina. Activa los sonidos con el botón. Los pedidos avanzan: **En espera → Preparando → Listo → Entregado**. Para entregar debe estar registrado el pago.
8. En **Caja y gastos**, registra el fondo inicial antes del primer movimiento; registra compras y otros gastos durante el día. Al terminar, cuenta el efectivo y registra el arqueo. Se muestra la diferencia entre el efectivo esperado y el contado.
9. En **Reportes**, consulta el día, los últimos siete días, el mes o un rango personalizado. Los cobros en efectivo y QR aparecen en cuadros separados en Caja y gastos y en Reportes. Los cobros se agrupan por fecha de pago y medio; los gastos se agrupan por fecha de registro.
10. En **Menú y QR**, comparte el enlace público o descarga la imagen PNG del QR de la página de reservas. Los comensales no necesitan cuenta. Una reserva confirmada ya aparta porciones y muestra su número para recogerla.

## Usuarios y control de caja

El administrador tiene una sección **Usuarios** para crear cuentas individuales, cambiar nombres y perfiles (administrador, cajero o cocina), establecer una nueva contraseña y activar o desactivar cuentas. Las contraseñas nuevas deben tener de 8 a 200 caracteres; nunca se muestran ni se devuelven sus hashes al navegador. En edición, dejar la contraseña vacía conserva la actual. Cambiar usuario de acceso, contraseña, perfil o estado cierra las sesiones de esa cuenta. Cambiar las credenciales de tu propia cuenta requiere volver a entrar.

No se eliminan cuentas: se desactivan para conservar su historial. No puedes desactivar tu propia cuenta ni quitarte el perfil de administrador, y debe quedar al menos un administrador activo. La sección muestra los últimos 100 cambios de cuentas y quién los realizó; todos quedan guardados sin contraseñas en `audit_log`.

**Administrador y cajero** pueden registrar el fondo inicial antes del primer movimiento, contar el efectivo y cerrar la caja desde **Caja y gastos**. Cocina no tiene esos permisos. Los gastos siguen siendo registrados por el administrador; el cajero puede ver los movimientos de la caja del día para cuadrarla, pero no puede consultar reportes históricos ni gestionar cuentas.

Cada cambio del fondo y cada cierre o arqueo registra el usuario real de la sesión, su nombre, perfil y fecha/hora (se muestra en horario de Bolivia). Los cierres automáticos se identifican como **Sistema**. Si el sistema cerró a las 18:00, el cajero puede registrar después el conteo: se conserva la hora de cierre automático y se registra por separado el responsable del arqueo. No se permite modificar un arqueo ya guardado ni reabrir la caja.

El administrador ve en Caja el historial de los últimos 60 días registrados, con efectivo esperado, contado, diferencia, observaciones y responsables. El cajero solo ve la caja actual. Las cajas anteriores a esta actualización mantienen sus datos y muestran que no tienen registro previo de responsables; no se atribuyen acciones pasadas a un usuario supuesto. La actualización agrega el estado activo a las cuentas existentes sin cambiar sus contraseñas ni borrar sesiones, ventas o inventario.

## Inventario permanente de bebidas

Entra como administrador a **Inventario de bebidas**. Registra cada bebida una sola vez con precio, existencias iniciales y stock mínimo. Puedes agregar una foto opcional al crearla o editarla (JPEG, PNG o WebP de hasta 10 MB; se reduce antes de guardarse). La foto aparece en Punto de venta y en reservas; puedes reemplazarla o quitarla y guardar también sin foto. Aparece automáticamente en Punto de venta y en los menús publicados para reservas. Las bebidas ya no se crean ni se cuentan otra vez en Menú del día; sopas, segundos y extras conservan su producción diaria. El vaso de refresco sigue incluido en el completo y no pertenece a este inventario.

- **Ejemplo:** carga 50 unidades, vende 8 y quedan 42 para el día siguiente. Recibe 24 y quedan 66.
- **Mercadería recibida:** registra cantidad, fecha real de recepción, proveedor, costo total y observaciones. El saldo aumenta al recibirla, no al encargarla. No se implementa seguimiento de órdenes de compra pendientes.
- **Caja:** si la compra se pagó hoy con caja abierta, puedes marcar «Registrar también el pago como gasto de caja» e indicar efectivo o QR. El gasto y la entrada se guardan juntos; no registres ese mismo pago nuevamente en Caja. Guardar un costo sin esa marca solo lo documenta en inventario.
- **Ajustes:** registra una cantidad positiva o negativa y un motivo obligatorio para roturas o diferencias de conteo. No puede dejar saldo negativo. El saldo disponible ya excluye las reservas.
- **Historial:** muestra las últimas 200 entradas, saldos iniciales/importados, ventas, reservas, anulaciones y ajustes; todos los movimientos quedan guardados en SQLite. Las entradas manuales registran el usuario.
- **Edición:** permite cambiar precio, mínimo o nombre y retirar una bebida de venta sin borrar su historial. Los pedidos anteriores conservan el precio y nombre originales.

Al actualizar una base existente, las bebidas del menú se importan una sola vez, agrupadas por nombre (sin distinguir mayúsculas ni espacios al inicio/final). Se usa el saldo disponible del menú más reciente hasta hoy; si solo existen menús futuros, se usa el más reciente de ellos. **No se suman los conteos diarios repetidos. Verifica una vez el conteo físico y registra un ajuste si hace falta**, especialmente si las bebidas se registraron con nombres diferentes o quedaron reservas antiguas de varios días. Los platos, pagos y pedidos existentes se conservan; anular una reserva antigua también libera sus bebidas. Las fotos anteriores de las bebidas se conservan.

Para actualizar, detén el servidor, respalda la carpeta `data`, reemplaza los archivos de código conservando `data`, ejecuta `npm ci`, `npm run build` y `npm start`. La migración es automática al arrancar. Las pruebas usan bases aisladas y no modifican tu base local.

## Reglas de inventario y dinero

- Registrar un pedido compromete las porciones en una transacción SQLite. Un completo descuenta una sopa y el segundo elegido. El vaso de refresco está incluido en el precio, sin stock ni precio independientes. Cada segundo tiene su disponibilidad independiente.
- Los refrescos marcados anteriormente como incluidos se conservan internamente con sus registros históricos, pero se ocultan del menú editable y del catálogo. Los pedidos antiguos conservan precios, detalle y asignaciones; su anulación sigue liberando las porciones originales.
- Una reserva ya cuenta contra el stock. Cobrarla o pasarla a cocina **no descuenta de nuevo**.
- Los platos sueltos y los extras descuentan solo su producto. Las cantidades y los precios se validan en el servidor, no se confía en los importes del navegador.
- Si no alcanza alguna porción, se rechaza el pedido entero: no se guarda una venta a medias. Los precios de pedidos existentes no cambian cuando se edita el menú.
- Anular un pedido no pagado libera sus porciones una sola vez. Los pedidos pagados no se pueden anular en esta primera versión porque aún no implementa devoluciones. Tampoco se editan pedidos ya registrados.
- Las reservas no vencen automáticamente. Caja debe anular las que ya no correspondan; los comensales no pueden anularlas por sí mismos en esta versión.
- Los importes se guardan en **centavos enteros de boliviano**, para evitar errores de coma flotante.
- **Resultado estimado = cobros − gastos registrados.** No es utilidad contable: hay que registrar ingredientes, salarios, alquiler, servicios y demás costos. No hay contabilidad por devengado, valoración de inventario ni conciliación bancaria.
- **Efectivo esperado = fondo inicial + cobros en efectivo − gastos pagados desde caja.** Los cobros y gastos QR no alteran el efectivo esperado.
- No se admiten pagos parciales ni varios medios de pago en un mismo pedido todavía.

## Caja automática y horario

Se usa **America/La_Paz (Bolivia)**, independientemente de la zona horaria del equipo. La caja se abre automáticamente al comenzar un nuevo día, sin fondo inicial, y se cierra a las **18:00**; también puedes cerrarla antes. El horario está fijado en esta primera versión en `server/store.js`.

El servidor revisa el horario cada minuto y en las operaciones autenticadas. Si está apagado, no puede ejecutar tareas: al volver a arrancar cierra los días anteriores pendientes y establece la caja del día actual. No simula procesos ejecutados con la computadora apagada. La caja cerrada bloquea cobros, ventas inmediatas y gastos; permite reservas sin pago. Un cierre automático deja pendiente el conteo físico, que se puede registrar después. No hay reapertura de caja en esta versión.

## Usar cocina desde un teléfono o una tablet

Conecta los dispositivos a la misma red Wi-Fi. `npm run dev` muestra la dirección de red del equipo; abre **http://IP-DE-TU-COMPUTADORA:5173** desde el otro dispositivo y entra como cocina. Permite el puerto 5173 en el firewall de tu equipo si corresponde. El teléfono no puede acceder al `localhost` de tu computadora.

Los cambios se notifican con Server-Sent Events y se reconectan automáticamente. El sonido requiere interacción para habilitarse y que la pestaña permanezca abierta. Un teléfono suspendido puede dejar de recibir avisos: no se implementa Web Push ni notificaciones con la aplicación cerrada. Las reservas públicas refrescan la disponibilidad cada 30 segundos; el servidor siempre vuelve a validarla al confirmar.

Para compartir reservas fuera de la red local necesitas desplegar el servidor con HTTPS y almacenamiento persistente. Esta primera versión está orientada a probar localmente; antes de publicarla falta completar recuperación de contraseña sin administrador, operación y copias de respaldo, protección contra abuso de reservas y las necesidades legales/fiscales del negocio. El QR identifica la página de reservas, **no es un QR de pago bancario**.

## Datos y copias de seguridad

Los datos se conservan al reiniciar en `data/foodsys.sqlite`; `data/` está excluido de Git. SQLite puede crear archivos `-wal` y `-shm`. Para una copia manual consistente, detén el servidor con `Ctrl+C` y copia la carpeta `data` completa. No sincronices una base abierta entre computadoras ni coloques el archivo en una carpeta de red. Todos los dispositivos deben usar el mismo servidor.

Para empezar desde cero, detén el servidor y **respalda** `data` antes de retirarla. El siguiente inicio creará una base nueva con usuarios y menú de ejemplo. No borres datos reales para cambiar una contraseña.

Variables opcionales del servidor:

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| `PORT` | `3001` | Puerto del API y del servidor de producción |
| `DB_PATH` | `data/foodsys.sqlite` | Ruta al archivo de base de datos |
| `COOKIE_SECURE` | sin definir | `true` para cookies solo por HTTPS al desplegar |
| `ADMIN_PASSWORD`, `CAJERO_PASSWORD`, `COCINA_PASSWORD` | credenciales demo | Contraseñas solo en la creación inicial |

El proxy de Vite apunta al puerto 3001: no cambies `PORT` durante desarrollo sin ajustar `vite.config.js`.

## Comandos y estructura

```powershell
npm.cmd test         # Pruebas de reglas de negocio y API HTTP, con SQLite en memoria
npm.cmd run build    # Genera el frontend en dist/
npm.cmd start        # Sirve API + dist/ en http://localhost:3001 después del build
```

```text
src/main.js          Pantallas y comportamiento del navegador
src/style.css        Diseño responsive y estilos
server/store.js      Esquema SQLite y reglas de negocio
server/index.js      Autenticación, permisos, API, eventos y servidor
test/system.test.js  Pruebas de negocio y API (sin tocar los datos locales)
```

Entidades: `audit_log`, `users`, `sessions`, `days` (menús diarios), `items` (producción y porciones comprometidas), `orders`, `lines`, `allocations` (componentes consumidos), `products`, `product_allocations`, `inventory_movements`, `legacy_products`, `payments`, `cash_days` y `expenses`.

Siguientes mejoras posibles: turnos y horario configurables, cambios de pedidos y devoluciones con auditoría, reservas con hora límite, impresión de tickets, costos por receta, múltiples sucursales y despliegue público. Para varias sucursales o varios servidores, migrar a PostgreSQL sería un siguiente paso razonable; para un negocio y un servidor, SQLite evita instalaciones adicionales.

## Platos y costos de preparación

El administrador dispone de **Platos y costos**. Elige la fecha y registra una sopa, segundo o extra con las porciones que rinde toda la preparación, su precio de venta por porción, ingredientes y gastos como gas, luz o agua. Las cantidades admiten gramos, kilos, mililitros, litros, unidades, docenas, cucharadas, cucharaditas y tazas; por ejemplo, medio kilo puede anotarse como `0,5 kg` o `500 g`.

El costo de cada ingrediente corresponde **a la cantidad utilizada**, no al paquete completo: si usaste 100 g de una bolsa de arroz, introduce el costo de esos 100 g. No se calcula automáticamente a partir de precios de compra ni se mantiene inventario de ingredientes. El sistema suma ingredientes y servicios, divide entre las porciones y muestra el margen estimado respecto al precio de venta. Este margen no incluye otros gastos del negocio ni equivale a ganancia neta; tampoco calcula el costo del completo combinando recetas.

Cada guardado crea una versión independiente con fecha, ingredientes, costos y observaciones. Cambia la fecha para revisar recetas anteriores. **Reutilizar receta** carga una copia: puedes elegir otra fecha y guardarla conservando el registro original. **Agregar al menú de esta fecha** agrega nombre, categoría, precio y porciones al borrador del menú; revisa cantidades y guarda el menú para confirmar. Los costos de la receta se consultan en su historial y no modifican precios de pedidos anteriores.

Registrar recetas no crea gastos de caja: documenta los pagos reales en **Caja y gastos** para no duplicarlos. Los envases también se registran allí, sin recargo automático ni costo de envase por plato.

## Consumo en el local o para llevar

Al registrar una venta o reserva, incluida la reserva pública, selecciona **Consumir en el local** o **Para llevar** para todo el pedido. La modalidad se conserva al reiniciar y aparece en Pedidos y reservas y en los tickets de Cocina; no cambia el precio ni el inventario. Los pedidos anteriores a esta actualización muestran **Consumo sin especificar**, para no atribuirles una modalidad que no fue registrada. En un pedido con ambas modalidades, registra dos pedidos separados.

La actualización agrega automáticamente las tablas de recetas y la modalidad de consumo al arrancar. Conserva usuarios, recetas, pedidos y demás datos existentes; respalda `data` con el servidor detenido antes de actualizar.
