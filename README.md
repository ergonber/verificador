# Verificador Simple de Certificados

Sistema minimalista para verificar certificados en blockchain Sonic.

## 🚀 Uso

1. Clona el repositorio
2. `npm install`
3. `npm run dev`
4. Abre http://localhost:3000

## 🔧 Configuración

Edita `pages/index.js` y cambia:
- `CONTRACT_ADDRESS` por tu dirección real
- `CONTRACT_ABI` por el ABI completo de tu contrato

## 📦 Despliegue

```bash
npm run build
npx vercel --prod# verificador
