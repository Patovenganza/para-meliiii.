# Flor para Melissa 🌺

Versión web con React + TypeScript + Canvas, adaptada del concepto de flor animada en Python. No usa Pygame.

## Ejecutar en Visual Studio Code

1. Instala Node.js (versión LTS) si aún no lo tienes.
2. Abre esta carpeta en Visual Studio Code.
3. En Terminal, ejecuta:

   ```bash
   npm install
   npm run dev
   ```

4. Abre la dirección local que muestre Vite.

## Música

Copia el MP3 que quieras usar a `public/audio/` y nómbralo `melissa.mp3`. Después, el botón “Escuchar música” lo reproducirá. No se inicia automáticamente porque los navegadores normalmente bloquean el audio automático.

## Subir a GitHub y Vercel

1. Crea un repositorio en GitHub y sube todos los archivos de esta carpeta.
2. En Vercel, importa ese repositorio.
3. Vercel detecta Vite automáticamente. El comando de build es `npm run build` y la carpeta de salida es `dist`.

## Personalizar

- Mensaje: `src/TextHeart.tsx`
- Flor y tiempos de animación: `src/HeartScene.tsx`
- Diseño, música y controles: `src/App.tsx`
- Colores y proporción vertical: `src/styles.css`
