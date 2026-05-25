# HydraFS

HydraFS es una aplicación de escritorio para gestión de contraseñas y cifrado seguro de archivos y carpetas. Está construida con Tauri, usando una interfaz web ligera en HTML, CSS y JavaScript en el frontend, y Rust en el backend para las funciones de seguridad y cifrado.

## Funcionalidades principales

- Gestión segura de contraseñas:
  - Almacena contraseñas y datos de acceso en un repositorio local cifrado.
  - Genera y recuerda credenciales para servicios, apps y sitios web.
- Cifrado de archivos y carpetas:
  - Cifra y descifra archivos individuales.
  - Cifra carpetas completas conservando la estructura de archivos.
  - Integración con el Explorador nativo de Windows.

## Estructura del repositorio

- `src/`: frontend de la aplicación, incluye HTML, CSS y JavaScript.
- `src-tauri/`: backend en Rust y configuración de Tauri.
- `src-tauri/icons/`: iconos para la app.
- `src-tauri/scripts/`: scripts de soporte y preparación.
- `actualizar.bat`: script para comitear y subir cambios al repositorio remoto.
- `.gitignore`: reglas para ignorar dependencias, binarios y archivos temporales.

## Requisitos

- Node.js 18+ y npm
- Rust toolchain (`rustup`, `cargo`)
- Tauri CLI instalado

## Instalación y desarrollo

1. Clona el repositorio:
   ```bash
   git clone https://github.com/Cicker21/HydraFS.git
   cd HydraFS
   ```
2. Instala dependencias de Node:
   ```bash
   npm install
   ```
3. Inicia la aplicación en modo desarrollo:
   ```bash
   npm run tauri dev
   ```

## Compilación de la aplicación

Para construir la aplicación empaquetada:

```bash
npm run tauri build
```

El resultado se encontrará en `src-tauri/target/release/bundle/`.

## Seguridad

- Este proyecto hace uso de Rust para operaciones de cifrado y manejo de datos sensibles.
- No publiques archivos de claves, contraseñas o datos de configuración privados.
- Asegúrate de proteger el equipo donde se ejecuta la aplicación.

