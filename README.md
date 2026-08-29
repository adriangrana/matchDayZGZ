# MatchDay ZGZ

Aplicación web móvil y de escritorio para seguir la actualidad del Real Zaragoza.
Actualidad consume feeds RSS reales. Los datos deportivos usan una estrategia
gratuita y local basada en el calendario oficial de la RFEF, confirmaciones del
Real Zaragoza y clasificación calculada.

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
npm run sports:sync         # sincroniza las fuentes deportivas gratuitas
npm run sports:inspect      # muestra extracción, caché, diferencias y cuota
npm run sports:test-sources # comprueba robots y política de cada fuente
npm run db:generate  # genera migraciones Drizzle
npm run deploy:local  # local deploy con runara
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
| `SPORTS_PROVIDER` | `free-web` activa la estrategia gratuita principal |
| `API_FOOTBALL_KEY` | Clave opcional del adaptador desactivado; no es necesaria |
| `API_FOOTBALL_BASE_URL` | Endpoint oficial; normalmente no se modifica |
| `API_FOOTBALL_SEASON` | Año de inicio de temporada; el plan Free permite actualmente hasta `2024` |
| `API_FOOTBALL_TEAM_ID` | ID opcional; vacío permite descubrimiento automático |
| `API_FOOTBALL_LEAGUE_ID` | ID opcional; vacío permite descubrimiento automático |
| `API_FOOTBALL_LEAGUE_NAME` | Competición opcional; vacío activa el descubrimiento automático |
| `API_FOOTBALL_DAILY_LIMIT` | Límite interno; nunca puede superar 50 |
| `SPORTS_FIXTURES_CACHE_HOURS` | Caché de calendario y resultados, 6 horas |
| `SPORTS_STANDINGS_CACHE_HOURS` | Caché de clasificación, 12 horas |
| `SPORTS_METADATA_CACHE_HOURS` | Caché de equipo y competición, 24 horas |
| `SPORTS_SYNC_INTERVAL_HOURS` | Intervalo del sincronizador deportivo local; 6 horas |
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

No se usa ninguna API ni servicio de pago. La UI consume contratos normalizados,
no las fuentes externas. El calendario RFEF se comprueba una vez al día; las
páginas públicas permitidas del club, como máximo cada seis horas. AS se mantiene
desactivado porque su aviso legal reserva el uso mediante lectura mecánica, aunque
sus rutas no estén bloqueadas en `robots.txt`.

La integración es exclusivamente local y no incorpora logotipos, escudos,
fotografías ni artículos. Conserva ETag, Last-Modified, hash y el último snapshot
en `.cache/`, ignorado por Git. Inicio, Partidos y Clasificación leen el último
snapshot persistido; una copia normalizada y validada de las 38 jornadas permite
mantener el calendario cuando una fuente no responde o el snapshot no es válido.

Consulta
[`docs/FREE_SCRAPING_STRATEGY.md`](./docs/FREE_SCRAPING_STRATEGY.md) para revisar
robots, condiciones, selectores, frecuencias, riesgos y fallbacks. API-Football
permanece únicamente como adaptador opcional desactivado.

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

`npm run deploy:local` registra en Runara el proceso
`matchday-zgz-sync`. Este proceso se ejecuta junto a la web y:

- actualiza noticias cada 30 minutos;
- sincroniza las fuentes deportivas cada 6 horas;
- respeta la caché propia de cada fuente: 6 horas para el Real Zaragoza y 24
  horas para el calendario RFEF;
- recalcula la clasificación local sin realizar una petición adicional;
- conserva el último snapshot deportivo válido si una fuente falla.

El proceso hace una primera sincronización al arrancar. El secreto interno se
genera dentro del despliegue local, no se guarda en Git y no se imprime en los
logs.

Los endpoints internos aceptan únicamente `POST` autenticado. Para un scheduler
externo, el endpoint de noticias también admite `NEWS_SYNC_SECRET`:

```bash
curl -X POST \
  -H "Authorization: Bearer $NEWS_SYNC_SECRET" \
  https://tu-dominio.example/api/internal/news/sync
```

Una frecuencia inferior no aporta valor para noticias y aumenta la carga sobre
los medios.

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
