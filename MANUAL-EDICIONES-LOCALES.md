# Manual para aprender a editar tu sistema de pensión

Este manual te guía para modificar una copia del proyecto en tu computadora. Puedes experimentar sin cambiar el sistema que ya está en Railway: los cambios locales solo se publican si alguien los sube y despliega.

## 1. Prepara tu espacio de trabajo

1. Descarga y descomprime el ZIP del proyecto en una carpeta fácil de encontrar, por ejemplo `Documentos/pension-pruebas`.
2. Instala [Visual Studio Code](https://code.visualstudio.com/) (VS Code), [Node.js 24 o superior](https://nodejs.org/) y Docker Desktop.
3. Abre VS Code. En **Archivo → Abrir carpeta**, selecciona la carpeta `pension` que se descomprimió. Debes ver `package.json`, `index.html` y las carpetas `src` y `server`.
4. Sigue el archivo **INSTRUCCIONES-PRUEBAS-LOCALES.txt** incluido en el ZIP para crear una base PostgreSQL de prueba y arrancar la aplicación con `npm.cmd run dev`.
5. Abre `http://localhost:5173` en el navegador. Mantén abierta la terminal donde corre la aplicación. Para detenerla, vuelve a esa terminal y pulsa `Ctrl+C`.

**Trabaja con la base local de prueba**, no con la URL de Railway. Guarda tus contraseñas y direcciones de base en privado; no las escribas en el código ni en capturas.

## 2. Qué significa cada archivo

| Archivo o carpeta | Para qué sirve |
| --- | --- |
| `src/main.js` | Textos, pantallas, botones y comportamiento de la página. |
| `src/style.css` | Colores, tamaños, espacios y aspecto visual. |
| `index.html` | La página inicial y el título que se ve en la pestaña del navegador. |
| `server/` | Reglas de pedidos, inventario, usuarios y conexión a la base de datos. |
| `package.json` | Comandos y dependencias del proyecto. |
| `README.md` | Información más amplia sobre el sistema. |

Para empezar, cambia textos o colores. Las reglas de caja y de inventario están en `server/`: conviene estudiarlas y probarlas antes de modificarlas.

## 3. Cómo buscar y guardar

En VS Code, haz clic en el nombre de un archivo del panel izquierdo. Pulsa **Ctrl+F**, escribe lo que buscas y presiona Enter. Para buscar en todo el proyecto usa **Ctrl+Mayús+F**. Guarda con **Ctrl+S**.

`src/main.js` y `src/style.css` tienen algunas líneas muy largas. Puedes activar **Ver → Ajuste de línea** en VS Code para leerlas mejor: esto solo cambia cómo se muestran en el editor. Si una búsqueda encuentra varias coincidencias, léelas antes de cambiarlas.

Al guardar un cambio visual con la aplicación local en marcha, Vite suele actualizar el navegador automáticamente. Si no ocurre, recarga la página. Mantén abierta la terminal y observa si muestra algún error.

## 4. Cambiar el título de la pestaña

1. Abre `index.html`.
2. Busca esta línea:

```html
<title>Foodsys · Tu cocina, en orden</title>
```

3. Cambia solo el texto entre las etiquetas, por ejemplo:

```html
<title>Mi pensión · Almuerzos</title>
```

4. Guarda y revisa la pestaña del navegador. Si el título no cambia, recarga la página.

## 5. Cambiar nombres y mensajes

Abre `src/main.js` y busca `Todo listo para servir.`. Puedes sustituir ese texto por `Bienvenidos a mi pensión.`. Guarda y mira la pantalla de resumen cuando ingreses como administrador.

También puedes buscar `Mi pensión` para cambiar el nombre que aparece en la barra superior. Para cambiar el nombre visual `foodsys`, busca esa palabra y revisa cada aparición: se utiliza en varias pantallas, como el inicio de sesión, el menú lateral y la página pública.

Cambia **solo el texto visible**. Conserva comillas, comas, paréntesis y etiquetas HTML. Por ejemplo, si encuentras `heading('VISTA GENERAL','Todo listo para servir.',...)`, cambia el texto dentro de sus comillas y deja las comillas en su lugar. Para un primer ejercicio evita poner comillas simples dentro del texto nuevo.

Estos cambios de texto no cambian automáticamente los nombres de usuarios, contraseñas, productos ni los datos guardados en PostgreSQL. Los platos y productos se administran desde la propia aplicación.

## 6. Cambiar colores

1. Abre `src/style.css` y busca `--green:#204c3e`.
2. Ese código define una variable de color verde usada por varias partes del diseño. Como prueba, cámbialo por `--green:#315c8f` para usar un tono azul.
3. Guarda y mira el resultado en el navegador. Para volver al color original, usa **Ctrl+Z** o vuelve a escribir `#204c3e`.

Los colores con `#` son códigos hexadecimales: por ejemplo, `#ffffff` es blanco y `#000000` es negro. Puedes usar un selector de colores para escoger otro valor. No todos los verdes del sistema usan la misma variable: algunos colores están escritos directamente en reglas CSS, por lo que cambiar `--green` no cambiará absolutamente toda la interfaz.

Si deseas cambiar el color de la pestaña en dispositivos compatibles, busca `theme-color` en `index.html` y modifica su valor `#173e35`.

## 7. Cambiar el símbolo o agregar un logo

El símbolo **◒** que acompaña a `foodsys` es texto, no una imagen. Para cambiarlo por otro símbolo, busca `◒` en `src/main.js` y reemplaza únicamente el carácter donde quieras cambiarlo. Hay varias apariciones porque el nombre se muestra en distintas pantallas.

Para probar una imagen propia en el menú lateral:

1. En la raíz del proyecto, crea una carpeta llamada `public` si todavía no existe.
2. Coloca allí una imagen pequeña llamada `logo.png`. Usa una imagen que tengas derecho a utilizar.
3. En `src/main.js`, busca exactamente `◒ <span>foodsys`. Esa aparición corresponde a la marca del menú lateral. Reemplaza solo `◒` por:

```html
<img src="/logo.png" alt="Logo de mi pensión" style="width:36px;height:36px;object-fit:contain">
```

4. Guarda y recarga la aplicación local. Esta prueba cambia únicamente esa aparición; el inicio de sesión y la página pública usan otras marcas.

Si no aparece, comprueba que el archivo se llame exactamente `logo.png`, que esté dentro de `public`, y que no lo hayas guardado con doble extensión como `logo.png.png`. No borres las comillas alrededor de la ruta.

## 8. Comprobar que todo sigue funcionando

En una segunda terminal abierta en la carpeta del proyecto, ejecuta:

```powershell
npm.cmd run build
npm.cmd test
```

El primer comando comprueba que el frontend se pueda compilar. Las pruebas existentes comprueban diferentes reglas de la aplicación; por sí solas no revisan todos los colores o textos. La prueba específica de PostgreSQL se ejecuta si configuras `TEST_DATABASE_URL` como se explica en las instrucciones locales. Usa solamente la base de prueba.

Después, abre la página local, entra como administrador y revisa visualmente las pantallas que cambiaste. Una prueba útil es cambiar un color, guardar, observarlo y volver a dejar el valor original.

## 9. Si algo sale mal

- **La página no carga:** comprueba que Docker Desktop y la base local estén iniciados, que hayas definido `DATABASE_URL` en la terminal y que `npm.cmd run dev` siga ejecutándose. Revisa las instrucciones del ZIP.
- **Aparece un error después de editar:** lee la terminal de VS Code. Comprueba que no hayas borrado una comilla, una llave `{ }`, una etiqueta o un paréntesis. Usa **Ctrl+Z**, guarda y vuelve a probar.
- **No aparece el cambio:** verifica que guardaste el archivo correcto, recarga el navegador y asegúrate de abrir la dirección local, no la de Railway.
- **Quieres recuperar tu copia:** antes de experimentar, conserva una copia del ZIP descargado. Si restauras un archivo desde él, perderás los cambios locales hechos en ese archivo.

## 10. ¿Cuándo se actualiza Railway?

Guardar con Ctrl+S solo modifica los archivos de tu computadora. Railway no cambia automáticamente por una edición local. Para actualizar el sistema público, primero hay que revisar y probar los cambios, subirlos al repositorio GitHub conectado y comprobar que Railway haya desplegado la nueva versión. No subas contraseñas, archivos `.env` ni datos de prueba.

Ve paso a paso: cambia una cosa, guarda, observa y anota qué ocurrió. Así será más fácil reconocer qué hace cada parte.


## Más ejercicios: fondos, fuentes e imágenes

En src/style.css, al comienzo, el fondo general está en :root como `background:#f7f8f4`; puedes probar `background:#fff4e3`. El color principal está en `--green:#204c3e`; prueba `--green:#315c8f`. Para la barra lateral busca `.sidebar{` y cambia el `background:#fff` dentro de esa sección. Cambia una sola cosa a la vez.

La fuente general se define con `font-family:'DM Sans',system-ui,sans-serif`; puedes probar `font-family:Arial,sans-serif`. Los títulos usan `h1,h2,h3{font-family:Manrope,system-ui,sans-serif}`. Busca `h1{` y su `font-size:32px` para cambiar el tamaño de títulos. Algunas reglas @media cambian tamaños en pantallas pequeñas. Para el texto del menú lateral busca `.nav-item{` y su `font-size`. `color` controla el texto y `background` el fondo.

Las fotos de los platos se cambian desde Menú del día y las de las bebidas desde Inventario de bebidas, entrando como administrador; guarda los cambios. El logo de ejemplo mediante public/logo.png se explica en la sección 7. Prueba las imágenes en la base local antes de cambiar datos reales.
