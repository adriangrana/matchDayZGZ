# MatchDay ZGZ

Aplicación web móvil y de escritorio para seguir la actualidad del Real Zaragoza.
Actualidad consume feeds RSS reales. Los datos deportivos pueden usar el modo demo
o API-Football como prototipo exclusivamente local y personal.

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
npm run sync:sports  # prueba la sincronización deportiva local
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
| `SPORTS_DATA_MODE` | `demo` por defecto; `real` activa API-Football local |
| `API_FOOTBALL_KEY` | Clave privada, solo en `.env.local` y servidor |
| `API_FOOTBALL_BASE_URL` | Endpoint oficial; normalmente no se modifica |
| `API_FOOTBALL_SEASON` | Año de inicio de temporada; el plan Free permite actualmente hasta `2024` |
| `API_FOOTBALL_TEAM_ID` | ID opcional; vacío permite descubrimiento automático |
| `API_FOOTBALL_LEAGUE_ID` | ID opcional; vacío permite descubrimiento automático |
| `API_FOOTBALL_LEAGUE_NAME` | Competición opcional; vacío activa el descubrimiento automático |
| `API_FOOTBALL_DAILY_LIMIT` | Límite interno; nunca puede superar 50 |
| `SPORTS_FIXTURES_CACHE_HOURS` | Caché de calendario y resultados, 6 horas |
| `SPORTS_STANDINGS_CACHE_HOURS` | Caché de clasificación, 12 horas |
| `SPORTS_METADATA_CACHE_HOURS` | Caché de equipo y competición, 24 horas |
| `NEWS_FEEDS` | Lista de RSS autorizados separada por comas |
| `NEWS_DATA_MODE` | `real` para RSS o `demo` para volver temporalmente al fixture |
| `NEWS_CACHE_MINUTES` | Duración de la caché de noticias; mínimo 5 minutos |
| `NEWS_IMAGE_VALIDATION_LIMIT` | Máximo de imágenes comprobadas por sincronización |
| `NEWS_SYNC_SECRET` | Secreto para proteger el endpoint programado |
| `DATA_STALE_AFTER_MINUTES` | Umbral para avisar de datos desactualizados |
| `NEXT_PUBLIC_SITE_URL` | Origen público usado por los metadatos sociales |

## Datos y proveedores

La UI depende de contratos en `src/providers`, no de APIs concretas.
`DemoMatchDayProvider` devuelve un snapshot deportivo determinista. Las noticias usan
adaptadores `RssNewsProvider`, se validan, normalizan, clasifican y agrupan antes de
exponerse a la presentación.

No se realiza scraping ni se usa ninguna API de pago. La UI nunca conoce
API-Football: consume contratos normalizados del servidor y vuelve al modo demo si
falta la clave o no existe todavía un snapshot real válido.

La integración deportiva está autorizada únicamente en local y no incorpora
logotipos, escudos, fotografías ni otros activos visuales de la API. Su estado se
guarda en `.cache/api-football-state.json`, que está ignorado por Git. El contador
interno registra cada intento HTTP, incluidos los reintentos, y bloquea nuevas
consultas al llegar a 50 por día UTC.

Consulta [`docs/API_FOOTBALL_SETUP.md`](./docs/API_FOOTBALL_SETUP.md) para crear la
cuenta, guardar la clave y ejecutar la primera sincronización. La comparativa y la
restricción de publicación se documentan en
[`docs/SPORTS_SOURCES.md`](./docs/SPORTS_SOURCES.md).

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
