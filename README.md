# BE-ONE × kölbi · Kölbi Reflejos

Juegos táctiles para BE-ONE × kölbi (28 nov, Terrazas Lindora), con identidad visual basada en el verde y naranja oficiales de kölbi.

Al entrar se puede elegir entre dos modos:

- **Kölbi Reflejos:** toca el círculo encendido en una cuadrícula de 3 × 7 para sumar puntos. Por ahora está disponible el modo individual, con una cuenta regresiva de 45 segundos.
- **Eco kölbi:** observa y repite una secuencia de tonos y luces que crece en cada ronda.

Kölbi Reflejos cambia el objetivo al acertarlo y muestra el marcador en una tipografía arcade. Eco kölbi comparte el estilo de Reflejos, muestra los puntos y no tiene límite de tiempo. Termina al primer error sin restar puntos y prepara las imágenes y el sonido antes de la cuenta regresiva. El logo oficial local está en `assets/kolbi-logo-original.svg` y se usa en la cabecera y el escenario ilustrado `assets/activation-stage.svg`.

Las imágenes originales de las caras y la rana se conservan en `assets/originales/`; el juego utiliza las versiones preparadas `assets/caras-kolbi-transparent.png` y `assets/frog.png`.

Para retocar las caras, edita `assets/caras-kolbi-transparent.png` en un editor que admita transparencia, conservando el tamaño y las posiciones de las caras. El orden de los cuadros se controla con `background-position` en `styles.css`.

Las tarjetas del menú utilizan las ilustraciones `assets/reto-reflejos.svg` y `assets/reto-eco.svg`, con una capa oscura para mejorar la legibilidad.

Cada modo se inicia con un botón, sin solicitar el nombre ni registrar puntuaciones en un leaderboard. Cada juego conserva su propio récord en el navegador al terminar una partida. El antiguo récord compartido no se asigna a ninguno porque no identifica el juego. Las opciones e inicios están centrados para facilitar su uso en la pantalla táctil.

La interfaz ocupa aproximadamente el 84 % de la altura disponible y limita su ancho al 96 % de esa altura para mantener el juego visible y centrado en la vista de calibración.

La estructura de la página está en `index.html`, los estilos en `styles.css` y la lógica de los juegos en `game.js`. Los tres archivos deben permanecer juntos para que funcionen las rutas de los recursos.
