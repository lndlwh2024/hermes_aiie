@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location 'H:\agent\hermes'; npm run mcp --silent"
