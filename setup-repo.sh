#!/bin/bash
echo "Inicializando repositório Git..."
git init
git add .
git commit -m "feat: Initial commit - CampanhaDigital IA Foundation"
git branch -M main
echo "Pronto! Para enviar para o GitHub, execute:"
echo "git remote add origin <URL_DO_SEU_REPOSITORIO>"
echo "git push -u origin main"
