# CiberStore 🎮💎

> Tienda digital de Free Fire — Diamantes, likes, honor de clan, experiencia de cuenta y más.
> Desplegado en [ciberstore.lat](https://ciberstore.lat)

---

## Estructura del proyecto

```
ciberstore/
├── index.html       # Toda la UI — páginas, modales, CSS
├── script.js        # Toda la lógica — datos, funciones, i18n, moneda
├── manifest.json    # Config PWA (app instalable)
├── sw.js            # Service Worker — caché offline
├── icon-192.png     # Ícono PWA 192x192 (subir manualmente)
├── icon-512.png     # Ícono PWA 512x512 (subir manualmente)
└── README.md        # Este archivo
```

---

## Servicios disponibles

| Servicio | Estado | Precio desde |
|---|---|---|
| 💎 Diamantes FF | ✅ Activo | $17 MX |
| 👍 Likes Perfil | ✅ Activo | $79 MX |
| 🏆 Honor de Clan | ✅ Activo | $160 MX |
| 🧬 Experiencia Cuenta FF | ✅ Activo | $200 MX |
| 🏰 Venta de Clanes Nv.7 | ✅ Activo | $500 MX |
| 🎟️ Códigos FF | 🔜 Próximamente | — |
| 📦 Cajas Evolutiva | 🔜 Próximamente | — |

---

## Métodos de pago

| Método | Estado | Datos |
|---|---|---|
| 🏦 STORI | ✅ Activo | MATINA RUBI HDZ — CLABE: 646180402332964686 |
| 💛 Binance Pay | ✅ Activo | ID: 1106987175 |
| 💙 PayPal | 🔜 Próximamente | — |
| 🟢 Mercado Pago | 🔜 Próximamente | — |

---

## Funcionalidades

### Tienda
- Carrito de compras con contador en topbar
- Código promocional con descuento visual en tiempo real
- Tabs STORI / Binance en el modal de pago
- Controles de cantidad (`-` / `+`) en tarjetas de diamantes
- Validación de formulario antes de abrir WhatsApp

### Experiencia de usuario
- **Idiomas**: Español / English
- **Monedas**: MXN · USD · EUR · ARS · PEN (conversión automática)
- **Contador en vivo**: "X personas compraron hoy" — se incrementa solo
- **Sistema de reseñas**: calificación con estrellas + comentario, guardado en localStorage
- **Programa de referidos**: código único por cliente, 5% descuento al referido, 10% acumulado al referidor
- **Botón WhatsApp inteligente**: mensaje predefinido según la página activa
- **PWA instalable**: manifest + service worker — funciona como app en Android e iOS

### Sistema de membresía / rango
| Nivel | Gasto acumulado | Descuento |
|---|---|---|
| Visitante | $0 | 0% |
| Plata | $500 | 2% |
| Oro | $2,000 | 5% |
| Diamante | $6,000 | 8% |
| Leyenda | $15,000 | 12% |

### Panel Admin
- URL: ciberstore.lat → Sidebar → Panel Admin
- Credenciales: `ciberstore@admin.com` / `ciberstore26`
- Crear / activar / desactivar / eliminar códigos promocionales
- Ver estadísticas de uso y últimos pedidos con código

---

## Datos de contacto y pago

```
WhatsApp:       +52 55 4846 1200
STORI Titular:  MATINA RUBI HDZ
CLABE:          646180402332964686
Binance ID:     1106987175
Canal WA:       https://whatsapp.com/channel/0029VbCXQVjJENyAgAoJLJ3g
Admin email:    ciberstore@admin.com
```

---

## Tecnología

- **Frontend**: HTML5 + CSS3 + JavaScript vanilla — sin frameworks
- **Almacenamiento**: `localStorage` — historial, rango, username, idioma, moneda, reseñas, referidos, códigos promo
- **Hosting**: Vercel / Netlify — archivos estáticos
- **Fuentes**: Google Fonts — Orbitron + Exo 2
- **PWA**: manifest.json + service worker con caché offline
- **Pagos**: STORI (transferencia bancaria) + Binance Pay
- **Notificaciones**: WhatsApp directo vía `wa.me`

---

## Despliegue

### Vercel (actual)
1. Sube los archivos al repositorio GitHub
2. Vercel detecta automáticamente los cambios y despliega
3. Dominio: `ciberstore.lat`

### Variables de entorno (futuro — Binance Pay API)
```
BINANCE_API_KEY=tu_api_key
BINANCE_API_SECRET=tu_api_secret
```
> ⚠️ Nunca subas las keys al repositorio. Usar Vercel Environment Variables.

---

## PWA — Instalación para clientes

**Android (Chrome):**
1. Entrar a `ciberstore.lat`
2. Chrome muestra banner "Agregar a pantalla de inicio"
3. Aceptar → queda como app con ícono

**iPhone (Safari):**
1. Entrar a `ciberstore.lat`
2. Botón compartir → "Agregar a pantalla de inicio"

> Para que los íconos aparezcan correctamente, subir `icon-192.png` y `icon-512.png` a la raíz del repo.

---

## Pendiente / roadmap

- [ ] Íconos PWA (`icon-192.png` y `icon-512.png`)
- [ ] Integración Binance Pay API (requiere cuenta Merchant aprobada)
- [ ] Imágenes OG (`og-image.png`) para preview en redes sociales
- [ ] Códigos FF — sección completa cuando esté lista
- [ ] Cajas Evolutiva — sección completa cuando esté lista
- [ ] Notificaciones WhatsApp automáticas (WhatsApp Business API)

---

## Licencia

Proyecto privado — CiberStore © 2025. Todos los derechos reservados.
