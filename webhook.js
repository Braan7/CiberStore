/* ================================================================
   Vercel Serverless Function — Telegram Webhook receiver
   /api/webhook
   
   Setup: run once after deploy:
   https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://ciberstore.lat/api/webhook
================================================================ */
export { default } from './notify.js';
