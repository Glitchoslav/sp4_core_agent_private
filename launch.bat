@echo off
REM LEGACY launcher.
REM This menu targets removed historical entrypoints and is not part of the default runtime workflow.
REM Keep only as archive-grade reference until it is moved out of the main runtime surface.

echo.
echo ========================================
echo   SP4 v2.0 - Full Autonomy Launcher
echo ========================================
echo.

:menu
echo [1] Live Mission Test (RECOMMENDED)
echo [2] Production Server
echo [3] Demo Server
echo [4] Test Planner
echo [5] Test Full Autonomy
echo [6] Exit
echo.

set /p choice="Vyber moznost (1-6): "

if "%choice%"=="1" goto mission
if "%choice%"=="2" goto server
if "%choice%"=="3" goto demo
if "%choice%"=="4" goto planner
if "%choice%"=="5" goto autonomy
if "%choice%"=="6" goto end

echo Neplatna volba!
goto menu

:mission
echo.
echo Starting Live Mission Test...
echo.
node test_live_mission.js
pause
goto menu

:server
echo.
echo Starting Production Server...
echo.
start cmd /k "node server_production.js"
echo Server starting in new window...
timeout /t 3
goto menu

:demo
echo.
echo Starting Demo Server...
echo.
start cmd /k "node server_demo.js"
echo Server starting in new window...
timeout /t 3
goto menu

:planner
echo.
echo Testing Mission Planner...
echo.
node test_planner.js
pause
goto menu

:autonomy
echo.
echo Testing Full Autonomy...
echo.
node test_full_autonomy.js
pause
goto menu

:end
echo.
echo Bye!
echo.
exit
