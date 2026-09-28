@echo off
setlocal
chcp 65001 >nul
title 低空交通监测系统 · 开发服务器

rem ============================================================
rem  低空交通监测系统  一键启动脚本
rem
rem  双击即可运行，脚本会自动完成：
rem    1. 检查 Node.js 环境
rem    2. 首次运行时安装依赖
rem    3. 检查 5174 端口占用情况
rem    4. 启动开发服务器并打开浏览器
rem
rem  端口 5174 定义在 vite.config.js，修改后请同步本文件下方 PORT
rem ============================================================

cd /d "%~dp0"

set "PORT=5174"

echo.
echo ==============================================================
echo    低空交通监测系统  -  一键启动
echo ==============================================================
echo.

rem ---------------- 1. 环境检查 ----------------
where node >nul 2>nul
if errorlevel 1 (
    echo   [错误] 未检测到 Node.js
    echo          请先安装 Node.js 18 或更高版本：https://nodejs.org/
    echo.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo   [错误] 未检测到 npm，请重新安装 Node.js。
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
echo   [1/4] Node.js %NODE_VER% 环境就绪

rem ---------------- 2. 依赖检查 ----------------
if exist "node_modules\vite\package.json" (
    echo   [2/4] 依赖已就绪
) else (
    echo   [2/4] 首次运行，正在安装依赖，请稍候...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo   [错误] 依赖安装失败，请检查网络后重试。
        echo          也可以在本目录手动执行：npm install
        echo.
        pause
        exit /b 1
    )
    echo.
    echo   [2/4] 依赖安装完成
)

rem ---------------- 3. 端口检查 ----------------
set "PORT_BUSY="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%PORT% " ^| findstr "LISTENING"') do set "PORT_BUSY=%%p"

if not defined PORT_BUSY (
    echo   [3/4] 端口 %PORT% 空闲
    goto :launch
)

echo   [3/4] 端口 %PORT% 已被占用，占用进程 PID = %PORT_BUSY%
echo.
echo         该端口是本项目的开发端口，通常是上一次没有正常关闭的
echo         开发服务器残留。结束它可以立即继续启动。
echo.
set "ANSWER="
set /p "ANSWER=         是否结束该进程并继续启动？[Y/N] "
if /i not "%ANSWER%"=="Y" (
    echo.
    echo         已取消启动。请手动释放 %PORT% 端口后重试。
    echo.
    pause
    exit /b 0
)

taskkill /f /pid %PORT_BUSY% >nul 2>nul
if errorlevel 1 (
    echo.
    echo         [警告] 无法结束进程 %PORT_BUSY%，可能需要管理员权限。
    echo                请手动关闭占用 %PORT% 端口的程序后重试。
    echo.
    pause
    exit /b 1
)
echo         已释放端口 %PORT%
echo.

:launch
rem ---------------- 4. 启动 ----------------
echo   [4/4] 正在启动开发服务器...
echo.
echo --------------------------------------------------------------
echo    访问地址   http://localhost:%PORT%
echo    停止服务   在本窗口按 Ctrl+C
echo --------------------------------------------------------------
echo.

call npm run dev -- --open

echo.
echo   开发服务器已停止。
pause
