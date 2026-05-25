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
    if "%~1" == "" (
        set /p "commitMsg=Mensaje de commit (deja vacio para usar el predeterminado): "
        if "%commitMsg%" == "" (
            set "commitMsg=Actualizacion automatica"
        )
    ) else (
        set "commitMsg=%*"
    )
    echo Commiteando cambios: "%commitMsg%"
    git commit -m "!commitMsg!"
    if errorlevel 1 (
        echo ERROR: git commit ha fallado.
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
    echo ERROR: git push ha fallado.
    pause
    exit /b 1
)

echo.
echo Actualizacion completada.
pause
endlocal
