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
    if not "%~1" == "" (
        echo Aviso: los argumentos de la línea de comandos se ignoran.
    )
:askCommitMsg
    set /p "commitMsg=Mensaje de commit (obligatorio): "
    if "%commitMsg%" == "" (
        echo ERROR: el mensaje de commit es obligatorio.
        goto askCommitMsg
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
