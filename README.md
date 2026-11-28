# BE-ONE × kölbi · Kölbi Reflejos

Juegos táctiles para BE-ONE × kölbi (28 nov, Terrazas Lindora), con identidad visual basada en el verde y naranja oficiales de kölbi.

Al entrar se puede elegir entre dos modos:

- **Kölbi Reflejos:** toca el círculo encendido en una cuadrícula de 3 × 7 para sumar puntos. Por ahora está disponible el modo individual, con una cuenta regresiva de 45 segundos.
- **Eco kölbi:** observa y repite una secuencia de tonos y luces que crece en cada ronda.

Kölbi Reflejos cambia el objetivo al acertarlo y muestra el marcador en una tipografía arcade. Eco kölbi termina al primer error y prepara las imágenes y el sonido antes de la cuenta regresiva. El logo oficial local está en `assets/kolbi-logo-original.svg` y se usa en la cabecera y el escenario ilustrado `assets/activation-stage.svg`.

Las imágenes originales de las caras y la rana se conservan en `assets/originales/`; el juego utiliza las versiones preparadas `assets/caras-kolbi-transparent.png` y `assets/frog.png`.

Cada modo se inicia con un botón, sin solicitar el nombre ni registrar puntuaciones en un leaderboard. Cada juego conserva su propio récord en el navegador al terminar una partida. El antiguo récord compartido no se asigna a ninguno porque no identifica el juego. Las opciones e inicios están centrados para facilitar su uso en la pantalla táctil.

La estructura de la página está en `index.html`, los estilos en `styles.css` y la lógica de los juegos en `game.js`. Los tres archivos deben permanecer juntos para que funcionen las rutas de los recursos.
