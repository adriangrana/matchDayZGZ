# MatchDay ZGZ

Aplicación web móvil y de escritorio para seguir la actualidad del Real Zaragoza.
La primera fase ofrece una portada completa con datos ficticios claramente marcados
como demostración y una arquitectura preparada para sustituirlos por proveedores reales.

## Requisitos

- Node.js 22.13 o superior
- npm 10 o superior

## Instalación

```bash
npm install
copy .env.example .env.local
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Comandos

```bash
npm run dev          # servidor local
npm run lint         # reglas de calidad
npm run typecheck    # comprobación estricta de TypeScript
npm test             # pruebas unitarias
npm run build        # build de producción
npm run sync:demo    # ejecuta el pipeline demo sin llamadas externas
npm run db:generate  # genera migraciones Drizzle
```

## Variables de entorno

Consulta `.env.example`. Las variables con secretos solo se leen en el servidor.
Las variables públicas deben llevar el prefijo `NEXT_PUBLIC_` y no pueden contener
claves privadas.

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Conexión PostgreSQL/Supabase para servidor y migraciones |
| `SUPABASE_URL` | URL del proyecto Supabase (fase 2) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave privada solo para procesos de servidor |
| `SPORTS_API_BASE_URL` | URL de la fuente deportiva elegida |
| `SPORTS_API_KEY` | Credencial privada de la fuente deportiva |
| `NEWS_FEEDS` | Lista de RSS autorizados separada por comas |
| `SYNC_INTERVAL_MINUTES` | Frecuencia normal de actualización |
| `LIVE_SYNC_INTERVAL_SECONDS` | Frecuencia durante un partido |
| `DATA_STALE_AFTER_MINUTES` | Umbral para avisar de datos desactualizados |

## Datos y proveedores

La UI depende de contratos en `src/providers`, no de APIs concretas. El proveedor
`DemoMatchDayProvider` devuelve un snapshot determinista para desarrollo y pruebas.
Los futuros adaptadores reales deberán validar, normalizar y guardar los datos antes
de exponerlos a la presentación.

No hay fuentes reales, scraping ni API de pago conectados en esta fase. Los marcadores,
horarios, noticias y clasificación visibles son ejemplos ficticios.

## Base de datos

`db/schema.ts` define el modelo inicial con Drizzle para PostgreSQL, compatible con
Supabase. Crear un proyecto externo, aplicar migraciones y configurar políticas de
seguridad se deja para la fase 2 y requiere aprobación.

## PWA

La aplicación incluye manifiesto, colores de tema y metadatos para instalación. Antes
de producción quedará añadir los iconos definitivos, service worker y estrategia de
caché offline según las fuentes reales.

## Plan

La arquitectura, fases y decisiones pendientes están en [PLAN.md](./PLAN.md).

