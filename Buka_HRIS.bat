@echo off
title DATA KARYAWAN - HRIS Professional Server
cd /d "%~dp0"
echo Memeriksa skema database HRIS...
call npm run db:init
echo Membuka browser http://localhost:3000 ...
start "" "http://localhost:3000"
echo Menjalankan server HRIS pada port 3000...
call npm start
pause

