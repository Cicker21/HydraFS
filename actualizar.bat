@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo =======================================
echo Actualizando HydraFS en GitHub...
echo =======================================

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ERROR: este directorio no es un repositorio git.
    pause
    exit /b 1
)

echo.
git status --short

git add -A

set "changed=0"
for /f "delims=" %%A in ('git status --porcelain') do set "changed=1"

if !changed! equ 1 (
    echo.
    echo Commiteando cambios...
    git commit -m "Actualización automática"
    if errorlevel 1 (
        echo ERROR: git commit falló.
        pause
        exit /b 1
    )
) else (
    echo.
    echo No hay cambios nuevos para commitear.
)

echo.
echo Enviando cambios al remoto...
git push
if errorlevel 1 (
    echo ERROR: git push falló.
    pause
    exit /b 1
)

echo.
echo Actualización completada.
pause
endlocal
