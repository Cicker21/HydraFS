# HydraFS

HydraFS es una aplicación de escritorio construida con Tauri y una interfaz web ligera en HTML, CSS y JavaScript.

## Qué incluye este repositorio

- `src/`: frontend de la aplicación.
- `src-tauri/`: backend en Rust, configuración de Tauri, iconos y scripts de empaquetado.
- `.gitignore`: reglas para evitar subir dependencias y archivos de compilación.
- `actualizar.bat`: script para subir los cambios automáticamente a GitHub.

## Requisitos

- Node.js 18+ y npm
- Rust toolchain (`rustup`, `cargo`)
- Tauri CLI

## Desarrollo

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Ejecuta la aplicación en modo desarrollo:
   ```bash
   npm run tauri dev
   ```

## Compilación

Para generar una versión empaquetada:

```bash
npm run tauri build
```

## Actualizar al repositorio remoto

En la raíz del proyecto, ejecuta `actualizar.bat` para agregar, commitear y subir todos los cambios al remoto de GitHub.

```bat
actualizar.bat
```

## Notas

- `actualizar.bat` no subirá cambios si no hay nada nuevo para commitear.
- El `.gitignore` ya está configurado para ignorar artefactos de compilación y archivos temporales.
