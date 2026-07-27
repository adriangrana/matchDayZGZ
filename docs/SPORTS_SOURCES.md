# Fuentes de partidos y clasificación

Evaluación actualizada el 28 de julio de 2026 para un prototipo gratuito, local
y de uso personal.

## Contexto

El Real Zaragoza compite en el Grupo II de Primera Federación 2026/27. La RFEF
publicó el calendario oficial de 38 jornadas:

- [Grupos de Primera Federación 2026/27](https://rfef.es/es/noticias/aprobados-los-grupos-de-primera-federacion-para-la-temporada-202627)
- [PDF oficial del Grupo II](https://rfef.es/sites/default/files/2026-06/Primera_Federacion_Grupo_II.pdf)

## Decisión vigente

| Fuente | Uso | Frecuencia | Estado |
| --- | --- | --- | --- |
| RFEF | Calendario, jornada y fecha base | 24 horas | Principal y oficial |
| Real Zaragoza | Confirmaciones de fecha, hora, estadio, resultado y amistosos | 6 horas por página | Complementaria oficial |
| AS | Horarios, resultados y clasificación | Ninguna | Desactivada por condiciones |
| Clasificación local | PJ, PG, PE, PP, GF, GC, DG y puntos | Tras cada sincronización | Fallback calculado |
| API-Football | Adaptador histórico opcional | Desactivada | No requiere clave |

`robots.txt` de AS no bloquea las rutas de resultados, pero su aviso legal
actualizado en julio de 2025 formula una reserva expresa frente al uso mediante
lectura mecánica. Como el proyecto debe respetar tanto robots como las
condiciones accesibles, el adaptador `AsPrimeraFederacionProvider` informa
`blocked-by-terms` y no descarga esas páginas.

La web oficial del Real Zaragoza permite almacenar contenido para uso personal
y privado. El prototipo extrae únicamente hechos mínimos de tarjetas de partido
y nunca conserva imágenes, escudos, logotipos o artículos.

## Arquitectura

- `RfefPdfCalendarProvider`: descarga condicional, SHA-256, extracción y 380
  partidos validados.
- `AsPrimeraFederacionProvider`: adaptador desacoplado, desactivado por política
  y regla probada para horarios genéricos `02:00`.
- `RealZaragozaOfficialProvider`: confirmaciones oficiales y amistosos.
- `ComputedStandingsProvider`: clasificación reproducible desde resultados.
- `FreeSportsAggregator`: prioridad, último snapshot y diagnóstico conjunto.

La portada puede leer la copia normalizada del PDF sin acceder a la red. Los
comandos locales actualizan `.cache/` con ETag, Last-Modified, hash y el último
snapshot válido.

## Comandos

```powershell
npm run sports:sync
npm run sports:inspect
npm run sports:test-sources
```

La política completa, selectores, riesgos y pruebas de cambios están en
[`FREE_SCRAPING_STRATEGY.md`](./FREE_SCRAPING_STRATEGY.md).

## Restricción de publicación

Nada en esta implementación concede derechos de publicación. Antes de un
despliegue público deben revisarse de nuevo robots, condiciones, derechos sobre
datos deportivos y cualquier requisito de la RFEF o del club.
