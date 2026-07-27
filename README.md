# MatchDay ZGZ

Aplicación web móvil y de escritorio para seguir la actualidad del Real Zaragoza.
Los datos deportivos permanecen como demostración, mientras que la sección Actualidad
consume feeds RSS reales desde el servidor.

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
npm run sync:news    # sincroniza y valida las noticias reales
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
| `NEWS_DATA_MODE` | `real` para RSS o `demo` para volver temporalmente al fixture |
| `NEWS_CACHE_MINUTES` | Duración de la caché de noticias; mínimo 5 minutos |
| `NEWS_IMAGE_VALIDATION_LIMIT` | Máximo de imágenes comprobadas por sincronización |
| `NEWS_SYNC_SECRET` | Secreto para proteger el endpoint programado |
| `SYNC_INTERVAL_MINUTES` | Frecuencia normal de actualización |
| `LIVE_SYNC_INTERVAL_SECONDS` | Frecuencia durante un partido |
| `DATA_STALE_AFTER_MINUTES` | Umbral para avisar de datos desactualizados |
| `NEXT_PUBLIC_SITE_URL` | Origen público usado por los metadatos sociales |

## Datos y proveedores

La UI depende de contratos en `src/providers`, no de APIs concretas.
`DemoMatchDayProvider` devuelve un snapshot deportivo determinista. Las noticias usan
adaptadores `RssNewsProvider`, se validan, normalizan, clasifican y agrupan antes de
exponerse a la presentación.

No se realiza scraping ni se usa ninguna API de pago. Los marcadores, horarios y
clasificación siguen siendo ficticios. La evaluación de fuentes se encuentra en
[`docs/NEWS_SOURCES.md`](./docs/NEWS_SOURCES.md).

### Fuentes de Actualidad

- Aragón Digital: RSS específico del Real Zaragoza.
- MARCA: RSS específico del Real Zaragoza.
- Heraldo de Aragón: RSS general con filtrado estricto.
- El Periódico de Aragón: RSS general con filtrado estricto.

Solo se conserva el título, un resumen breve, metadatos, imagen validada y enlace
original. La caché evita solicitar los feeds desde cada navegador. Si falla una
actualización, el proceso conserva el último snapshot válido del proceso activo y lo
marca como desactualizado. La persistencia duradera queda preparada en PostgreSQL y
se activará cuando exista una instancia Supabase autorizada.

## Sincronización programada

El endpoint interno acepta únicamente `POST` con el secreto configurado:

```bash
curl -X POST \
  -H "Authorization: Bearer $NEWS_SYNC_SECRET" \
  https://tu-dominio.example/api/internal/news/sync
```

En producción debe programarse cada 30 minutos desde el scheduler del proveedor. La
URL pública y `NEWS_SYNC_SECRET` se configuran como secretos del scheduler. Una
frecuencia inferior no aporta valor para noticias y aumenta la carga sobre los medios.

Para desarrollo no es necesario exponer el endpoint: usa `npm run sync:news`.

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
