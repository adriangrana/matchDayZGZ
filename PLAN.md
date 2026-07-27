# MatchDay ZGZ — plan de producto y arquitectura

## Principios

- La interfaz nunca consume una fuente externa directamente.
- Todo dato conserva su procedencia, fecha de obtención y estado de frescura.
- Si una fuente falla, se conserva el último dato válido; nunca se inventan datos.
- Las credenciales permanecen en el servidor y se configuran mediante variables de entorno.
- La primera fase usa datos ficticios y los identifica visualmente como `DEMO`.

## Arquitectura

```text
Fuentes autorizadas (API / RSS / datos estructurados)
                    ↓
            Adaptadores de proveedor
                    ↓
       validación → normalización → deduplicación
                    ↓
       repositorios PostgreSQL / caché
                    ↓
          casos de uso del servidor
                    ↓
           App Router / componentes UI
```

### Módulos

- `domain/`: contratos y entidades comunes sin dependencias de la interfaz.
- `providers/`: interfaces de proveedores y adaptadores sustituibles.
- `data/`: datos de demostración y, más adelante, repositorios PostgreSQL.
- `services/`: sincronización, validación, deduplicación, caché y reintentos.
- `components/`: sistema de diseño y componentes accesibles reutilizables.
- `app/`: rutas, metadatos, PWA y composición de páginas.
- `db/`: esquema PostgreSQL preparado para Supabase.

### Estrategia de datos

Cada registro sincronizado incluye:

- `sourceId` y `sourceUrl` para trazabilidad.
- `fetchedAt` y `updatedAt`.
- un identificador estable del proveedor.
- `freshness` calculada en servidor (`fresh`, `stale` o `unknown`).

Las noticias se agruparán mediante URL canónica, título normalizado, ventana temporal
y entidades relacionadas. Se guardarán únicamente metadatos, un resumen breve y el
enlace original.

## Automatización prevista

- Sincronización normal configurable mediante `SYNC_INTERVAL_MINUTES`.
- Ventana de alta frecuencia durante partidos mediante `LIVE_SYNC_INTERVAL_SECONDS`.
- Reintentos limitados con espera incremental.
- Caché y control de cuota por proveedor.
- Tareas programadas del proveedor de despliegue en producción.
- Comando local `npm run sync:demo` para comprobar el pipeline sin red.

## Fases

### Fase 1 — vertical funcional

- Base Next.js, TypeScript estricto, Tailwind y App Router.
- Sistema visual deportivo prémium, responsive y accesible.
- Navegación y portada.
- Próximo partido con cuenta atrás.
- Últimos resultados y próximos encuentros.
- Clasificación resumida y noticias.
- Contratos de proveedor, datos demo, deduplicación y pruebas de valor.
- Esquema inicial PostgreSQL/Supabase y documentación de entorno.

### Fase 2 — fuentes reales

- Evaluar opciones gratuitas y de pago antes de elegir.
- Documentar cobertura, estabilidad, coste, límites y términos de cada fuente.
- Implementar el primer adaptador de resultados/clasificación.
- Implementar RSS o API autorizada para noticias.
- Persistencia real, cron, caché y panel de salud de sincronización.

#### Estado de Actualidad

- Completado: evaluación de fuentes y selección de cuatro RSS editoriales gratuitos.
- Completado: normalización, validación, clasificación, deduplicación y relevancia.
- Completado: caché en servidor, último snapshot válido y endpoint protegido para cron.
- Completado: portada real y página `/actualidad` con búsqueda y filtros.
- Pendiente de aprobación: persistencia Supabase y fuente oficial del club.
- Pendiente: resultados y clasificación reales, fuera del alcance de esta iteración.

#### Estado de datos deportivos

- Completado: evaluación de RFEF, LALIGA, API-Football, football-data.org,
  TheSportsDB y Sportmonks en `docs/SPORTS_SOURCES.md`.
- Verificado: el Real Zaragoza compite en Primera Federación, grupo 2, durante
  la temporada 2026/27; los datos demo de Segunda División no son vigentes.
- Pendiente de aprobación: API-Football como fuente gratuita de prototipo, ya
  que sus términos no conceden por sí mismos una licencia de publicación.
- No implementado: scraping de RFEF, contratación de Sportmonks o activación de
  cualquier proveedor externo.

### Fase 3 — profundidad deportiva

- Calendario completo con filtros e integración iCalendar.
- Centro de partido y actualización en directo.
- Clasificación completa y evolución.
- Mercado de fichajes con niveles de confirmación.

### Fase 4 — personalización

- Autenticación y área personal.
- Partidos asistidos, asiento, notas y recordatorios.
- Noticias leídas/guardadas y preferencias.
- Alertas push y resumen diario.

## Decisiones que requieren aprobación

- Selección o contratación de una API de pago.
- Scraping de una web sin API/RSS estable.
- Activación de Supabase y creación de recursos externos.
- Publicación, dominio, analítica o notificaciones push.
