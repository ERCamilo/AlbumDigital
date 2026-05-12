# 🎂 Álbum de Cumpleaños — Documentación Técnica

> **Tipo**: Aplicación web estática (single-page)
> **Tecnologías**: HTML5, CSS3, JavaScript vanilla
> **Dependencias externas**: Google Fonts (Pacifico, Nunito), canvas-confetti v1.6.0
> **Orientación**: Mobile-first (max-width 460px)
> **Idioma UI**: Español

---

## Propósito

Aplicación web interactiva tipo álbum digital de cumpleaños. Presenta fotos, videos, música y mensajes en un scroll vertical con animaciones, confeti y reproducción automática de audio por sección.

---

## Estructura de Archivos

```
copia/
├── index.html              # Archivo único: HTML + CSS + JS (1219 líneas, 57 KB)
├── DOCUMENTACION.md         # Este archivo
├── fotos/
│   ├── aventura/            # 3 fotos (foto0.png, foto1.jpeg, foto2.jpeg)
│   ├── companeros/          # 10 fotos (foto0.png–foto9.png, mezcla png/jpeg)
│   ├── graduacion/          # 8 fotos (foto0.png–foto7.jpeg, mezcla png/jpeg)
│   ├── ninos/               # 6 fotos (foto0.png–foto5.png, todas png)
│   ├── playa/               # 6 fotos (foto0.png–foto5.jpeg, mezcla png/jpeg)
│   └── solo/                # 17 fotos (foto0.png–foto16.jpeg, mezcla png/jpeg)
├── mp3/
│   ├── Arena_Ardiente.mp3
│   ├── Mi_Motor_y_Mi_Corazón.mp3
│   └── Pamela_Rompe_La_Pista.mp3
└── videos/
    ├── video0.mp4
    ├── video1.mp4
    └── video2.mp4
```

> **NOTA**: Las fotos mezclan extensiones `.png` y `.jpeg` dentro de las mismas carpetas. Los helpers `fotoPNG()` y `fotoJPEG()` generan rutas por extensión separada.

---

## Arquitectura de index.html

El archivo se divide en 3 bloques principales:

### 1. CSS (líneas 10–463)

Variables CSS en `:root`:
```css
--gold: #f9c846;  --purple: #a855f7;  --pink: #f472b6;
--teal: #2dd4bf;  --orange: #fb923c;  --green: #4ade80;
--blue: #60a5fa;  --text: #f0e6ff;    --radius: 18px;
```

Componentes estilizados:
- **body**: Fondo con gradiente animado (`bgMove`, 18s)
- **Hero section** (`.hero-section`): Pantalla completa con anillos pulsantes
- **Photo frame** (`.photo-frame`): Borde gradiente animado (`borderAnim`)
- **Collages**: 6 layouts de grilla — `.collage-2h`, `.collage-3t`, `.collage-3l`, `.collage-4`, `.collage-5m`, scatter
- **Audio player** (`.audio-card`): Widget con botón, progreso, volumen, ondas
- **Mensajes** (`.msg-card`): Tarjeta con borde dashed
- **Deseos** (`.wish-list` → `.wish-item`): Lista con iconos
- **Estadísticas** (`.stats-grid` → `.stat-box`): Grid de 3 columnas
- **Footer** (`.album-footer`): Cierre con título gradiente

15 keyframes de animación disponibles:
`aniZoomIn`, `aniZoomOut`, `aniSlideL`, `aniSlideR`, `aniSlideUp`, `aniSlideDown`, `aniBounce`, `aniRotate`, `aniFlip`, `aniFlipY`, `aniFadeBlur`, `aniElastic`, `aniSwing`, `aniSpiral`, `aniFade`, `aniPop`

Se activan mediante `data-anim` + clase `.revealed`:
```css
.anim-target.revealed[data-anim="zoom"] { animation: aniZoomIn .85s ... }
```

### 2. Motor JavaScript (líneas 472–1020)

#### 2.1 Partículas de fondo (IIFE, líneas 478–492)
Canvas fullscreen con 30 emojis flotantes. Clase `P` con métodos `reset()`, `update()`, `draw()`. Loop con `requestAnimationFrame`.

#### 2.2 Confeti (líneas 494–497)
```javascript
burstAt(x, y, n=60)   // Confeti en posición específica
fullBurst(n=180)       // Confeti desde el centro de la pantalla
```
Colores: `['#f9c846','#a855f7','#f472b6','#2dd4bf','#fb923c','#4ade80','#60a5fa']`

#### 2.3 Motor de animación (líneas 506–559)
- `_animIO`: `IntersectionObserver` para `.anim-target` (rootMargin: `0px 0px -8% 0px`)
- `_headIO`: `IntersectionObserver` para headings (rootMargin: `0px 0px -5% 0px`)
- `reveal(target)`: Agrega `.revealed` + lanza confeti
- `attachAnim(section, animKey, audioOpts)`: Configura animación y audio para una sección
- Fallback: Si tras 5s el elemento no se revela, se fuerza la revelación

#### 2.4 AudioEngine (líneas 573–787, módulo revelador)
Motor completo de audio por sección. API interna:

| Función | Descripción |
|---|---|
| `register(section, opts)` | Registra sección con audio, crea widget y observer |
| `_play(d)` | Reproduce con fade-in, detiene otras pistas |
| `_stop(d)` | Para con fade-out |
| `fadeIn(au, targetVol)` | Fade-in en 25 pasos / 350ms |
| `fadeOut(au, cb)` | Fade-out en 25 pasos / 350ms |
| `syncUI(d, playing)` | Sincroniza botones y visualización |
| `_tick(d)` | Actualiza barra de progreso con requestAnimationFrame |
| `buildCard(d)` | Crea widget HTML del reproductor |
| `buildCollageBtn(d)` | Crea botón mini play/pausa para collages |
| `showToast(msg)` | Muestra notificación temporal (3s) |
| `updateMini()` | Actualiza botón flotante global |

Comportamiento del audio:
- **Auto-play**: Al entrar la sección en el 50% central del viewport
- **Auto-stop**: Al salir la sección del viewport + reset de `manuallyPaused`
- **Exclusividad**: Solo suena una sección a la vez
- **Manual**: Pausa manual solo afecta esa sección; al entrar en otra, auto-play sigue activo

Opciones de audio:
```javascript
{
  src: 'ruta/archivo.mp3',  // Requerido para que funcione
  title: 'Nombre',          // Mostrado en widget
  artist: 'Artista',        // Subtítulo del widget
  volume: 0.8,              // 0.0 – 1.0
  loop: true                // Repetir (default: true)
}
```

#### 2.5 API Pública — `album.*` (líneas 801–1019, módulo revelador)

```javascript
const album = (() => {
  // ... funciones internas ...
  return { inicio, cierre, separador, titulo, foto, video, gif,
           collage, mensaje, musica, deseos, estadisticas };
})();
```

##### `album.inicio(opciones)`
Crea la portada hero. Lanza confeti doble al cargar.
```javascript
album.inicio({
  foto:    'ruta/foto.png',           // Foto circular del cumpleañero
  nombre:  'Nombre',                  // Nombre grande
  mensaje: 'Texto de felicitación',   // Subtítulo italic
  emoji:   '🎉',                     // Emoji animado (bounce)
  tag:     'Hoy es un día especial'   // Texto superior pequeño
});
```

##### `album.foto(src, opciones)`
Foto individual con marco decorativo.
```javascript
album.foto('fotos/solo/foto0.png', {
  texto:     'Título',             // Caption debajo
  subtexto:  'Subtítulo',          // Sub-caption
  animacion: 'zoom',              // Ver lista de animaciones abajo
  ratio:     'portrait',          // 'portrait' | 'square' | 'wide'
  estilo:    'neon',              // '' | 'gold' | 'neon' | 'rainbow' | 'none'
  badge:     '🎂',               // Emoji en esquina superior derecha
  audio:     { src, title, ... }  // Opcional
});
```

##### `album.video(src, opciones)`
Video con autoplay y loop.
```javascript
album.video('videos/video1.mp4', {
  texto:     'Caption',
  rotacion:  0,           // Grados de rotación CSS
  silencio:  true,        // true = muted, false = con controles
  ratio:     'wide',      // 'wide' | 'square' | 'portrait'
  animacion: 'flip',
  audio:     { ... }      // Audio separado opcional
});
```

##### `album.collage(fotos[], opciones)`
Collage de múltiples fotos con layouts de grilla.
```javascript
album.collage(
  ['foto1.png', 'foto2.png', 'foto3.png'],
  {
    layout:    '3t',          // '2h' | '3t' | '3l' | '4' | '5m' | 'scatter'
    texto:     'Título',
    subtexto:  'Subtítulo',
    animacion: 'pop',         // 'pop' | 'stagger' | 'scatter'
    audio:     { ... }
  }
);
```

**Layouts disponibles**:
| Layout | Descripción |
|---|---|
| `2h` | 2 fotos lado a lado (aspect 4:5) |
| `3t` | 1 principal arriba + 2 abajo (aspect 16:9 + 4:3) |
| `3l` | 1 grande a la derecha + 2 pequeñas izquierda (aspect 3:4 + 1:1) |
| `4` | 4 fotos en grid 2×2 (aspect 1:1) |
| `5m` | 1 principal + 4 pequeñas (aspect 16:9 + 1:1) |
| `scatter` | 4 fotos superpuestas con rotación aleatoria |
| `carousel` | Tira horizontal desplazable de fotos |

##### `album.gif(src, opciones)`
Wrapper sobre `album.foto` con defaults: `ratio:'square'`, `estilo:'rainbow'`.

##### `album.mensaje(opciones)`
Tarjeta de mensaje emotivo.
```javascript
album.mensaje({
  emoji:     '🎂',
  texto:     'Tu mensaje aquí...',
  firma:     'Con cariño ❤️',
  animacion: 'fade-blur',
  audio:     { ... }
});
```

##### `album.musica(opciones)`
Sección dedicada a reproductor de música (sin foto).
```javascript
album.musica({
  src:       'mp3/Arena_Ardiente.mp3',
  title:     'Arena Ardiente',
  artist:    'Artista',
  volume:    0.9,
  loop:      true,
  animacion: 'elastic'
});
```

##### `album.deseos(lista[])`
Lista de deseos con iconos.
```javascript
album.deseos([
  { icono: '🌟', texto: 'Un año lleno de éxitos' },
  { icono: '❤️', texto: 'Mucho amor' },
  'Texto simple sin icono personalizado'  // usa '🎉' por defecto
]);
```

##### `album.estadisticas(lista[])`
Grid de estadísticas decorativas (3 columnas).
```javascript
album.estadisticas([
  { numero: '25',  etiqueta: 'Años' },
  { numero: '🎉', etiqueta: '¡Celebra!' },
  { numero: '∞',   etiqueta: 'Cariño' }
]);
```

##### `album.separador(emojis)`
Divisor visual con emojis flotantes.
```javascript
album.separador('🎈 🎉 🎊 🎈');
```

##### `album.titulo(texto, subtexto, color)`
Heading con gradiente. Colores: `'pink'`, `'yellow'`, `'teal'`, `'blue'`, `'green'`.

##### `album.cierre(opciones)`
Sección final de despedida.
```javascript
album.cierre({
  titulo:    '¡Te quiero mucho!',
  subtitulo: 'Por muchos más momentos así',
  emoji:     '❤️ 🎂 ❤️'
});
```

#### 2.6 Tap Sparkle (líneas 1008–1017)
Click en cualquier lugar: 5 emojis sparkle + mini-confeti.

### 3. Contenido del álbum (líneas 1036–1208)

Zona editable donde el usuario configura su álbum usando las funciones `album.*`. Actualmente contiene 13 secciones de ejemplo, muchas con `src` vacío (placeholder).

### 4. Helpers de rutas (líneas 1213–1220)
```javascript
fotoPNG(carpeta, numero)    // → 'fotos/{carpeta}/foto{numero}.png'
fotoJPEG(carpeta, numero)   // → 'fotos/{carpeta}/foto{numero}.jpeg'
fotoAuto(carpeta, numero)   // → 'fotos/{carpeta}/foto{numero}.png' (con fallback a .jpeg en onerror)
videoMP4(numero)            // → 'videos/video{numero}.mp4'
mp3(numero)                 // → 'mp3/{nombre_real}.mp3' (mapa interno de archivos reales)
```

> **Nota**: `fotoAuto()` genera ruta `.png` pero las funciones `makeCell()` y `album.foto()` intentan automáticamente `.jpeg` si `.png` falla.

> **Nota**: `mp3()` usa un mapa interno: `mp3(0)` → `Arena_Ardiente.mp3`, `mp3(1)` → `Mi_Motor_y_Mi_Corazón.mp3`, `mp3(2)` → `Pamela_Rompe_La_Pista.mp3`.

---

## Animaciones Disponibles

| Clave (`animacion`) | Efecto |
|---|---|
| `zoom` | Zoom in desde escala 0.25 |
| `zoom-out` | Zoom desde escala 1.7 |
| `slide-left` | Desliza desde la izquierda |
| `slide-right` | Desliza desde la derecha |
| `slide-up` | Desliza desde abajo |
| `slide-down` | Desliza desde arriba |
| `bounce` | Rebota desde arriba |
| `rotate` | Rota + escala desde pequeño |
| `flip` | Gira en eje Y |
| `flip-y` | Gira en eje X |
| `fade-blur` | Desenfoque a enfoque |
| `elastic` | Efecto elástico con rebote |
| `swing` | Balanceo + traslación |
| `spiral` | Espiral 360° + escala |
| `fade` | Fade simple + slide up |
| `pop` | Pop con rotación (para collages) |
| `stagger` | Elementos aparecen uno por uno (listas, stats, collages) |
| `scatter` | Aparición secuencial para scatter layout |

---

## Elementos HTML base

```html
<canvas id="bg-canvas"></canvas>          <!-- Partículas de fondo -->
<main id="album-root"></main>             <!-- Contenedor principal del álbum -->
<div id="audio-toast">🎵</div>           <!-- Toast de notificación de audio -->
<button id="audio-mini">▶</button>       <!-- Botón flotante global de audio -->
```

Todo el contenido se genera dinámicamente dentro de `#album-root` via JavaScript.

---

## Problemas Conocidos (Resueltos ✅)

1. ~~**Helper `mp3()`** apunta a ruta inexistente~~ ✅ Ahora usa mapa de archivos reales en `mp3/`
2. ~~**Extensiones mixtas** en fotos~~ ✅ Fallback automático `.png` → `.jpeg` en `makeCell()` y `album.foto()`
3. ~~**Muchas secciones sin contenido**~~ ✅ Rellenadas con fotos y audios reales del proyecto
4. ~~**Sin lazy loading**~~ ✅ Todas las `<img>` generadas usan `loading="lazy"` (excepto portada)
5. ~~**Confeti excesivo**~~ ✅ Reducido: solo 1 de cada 3 secciones, 25 partículas; click reduce a 12
6. ~~**Videos autoplay**~~ ✅ Videos usan IntersectionObserver: play al ser visibles, pause al salir

---

## Cómo Personalizar

1. Editar la zona "MI ÁLBUM — EDITA AQUÍ" (línea 1022+)
2. Usar las funciones `album.*` para agregar/modificar secciones
3. Colocar fotos en `fotos/{carpeta}/foto{numero}.{png|jpeg}` (fallback automático de extensión)
4. Colocar audio en `mp3/` y agregar el nombre al array `_MP3_FILES` o usar ruta directa
5. Colocar videos en `videos/video{numero}.mp4`
6. Para audio en secciones, usar `mp3(n)` o ruta directa: `src: 'mp3/Arena_Ardiente.mp3'`
