# Estrategia gratuita de datos deportivos

Fecha de revisión: 28 de julio de 2026.

Esta estrategia se limita a un prototipo local y de uso personal. No autoriza
la publicación de bases de datos, textos, fotografías, logotipos, escudos ni
otros contenidos de terceros. Cada proveedor se puede desactivar sin cambiar
la interfaz de MatchDay ZGZ.

## Política común

- User-agent: `MatchDay-ZGZ/0.4 (local personal prototype; low-volume sports facts fetcher)`.
- Solo se conservan hechos mínimos: equipo local, visitante, jornada, fecha,
  hora, resultado, estadio y clasificación.
- No se descargan imágenes ni se recorren archivos históricos completos.
- No se evaden captchas, autenticación, Cloudflare, bloqueos ni restricciones.
- Cada respuesta guarda URL, estado HTTP, duración, ETag, Last-Modified, hash y
  fecha de consulta.
- Se usan peticiones condicionales y el último snapshot válido.
- Un rechazo, cambio incompatible o prohibición accesible desactiva la fuente y
  activa el siguiente fallback.

## Fuente 1: calendario oficial RFEF

Página utilizada:

- `https://rfef.es/sites/default/files/2026-06/Primera_Federacion_Grupo_II.pdf`
- `https://rfef.es/sites/default/files/2026-06/Primera_Federacion_Grupo_I.pdf`

Campos:

- temporada y grupo;
- 38 jornadas y su fecha base;
- equipo local y visitante;
- los 380 partidos de cada grupo;
- los 38 partidos del Real Zaragoza.

Robots y condiciones:

- `https://rfef.es/robots.txt` respondió `200`.
- La ruta `/sites/default/files/` no aparece bloqueada para `User-agent: *`.
- El aviso legal accesible prohíbe reproducir contenido audiovisual; el
  prototipo no usa contenido audiovisual y conserva solo una normalización
  factual del calendario textual.
- Uso exclusivamente local; debe revisarse de nuevo antes de publicar.

Detección y selectores:

- encabezado: `GRUPO 1` o `GRUPO 2`, `2026/2027` y `Calendario`;
- jornada: `Jornada <n> (dd/mm/aaaa)`;
- partidos: diez líneas posteriores a cada jornada, divididas mediante el
  catálogo cerrado de 20 equipos y coincidencia de nombre más largo;
- validación fuerte: jornadas 1-38, diez partidos por jornada, 20 equipos,
  380 partidos y exactamente un partido del Real Zaragoza por jornada.

Frecuencia y cambios:

- comprobación máxima una vez cada 24 horas;
- `If-None-Match` y `If-Modified-Since` si el servidor ofrece validadores;
- SHA-256 del PDF para detectar cambios aunque falten validadores;
- un `304` o un hash idéntico conserva el snapshot sin reprocesarlo;
- un hash nuevo se acepta solo si vuelve a superar todas las invariantes;
- fallback normalizado del Grupo II incluido en el repositorio; el Grupo I se
  conserva en el último snapshot válido tras su primera sincronización.

Riesgos:

- el PDF puede cambiar de maquetación;
- las fechas son fechas base de jornada, nunca horarios definitivos;
- una revisión oficial puede cambiar emparejamientos o fechas;
- no hay resultados ni clasificación en este documento.

## Fuente 2: AS Primera Federación

Páginas evaluadas:

- `https://as.com/resultados/futbol/primera_rfef/`
- `https://as.com/resultados/futbol/primera_rfef/jornada/`
- `https://as.com/resultados/futbol/primera_rfef/clasificacion/`
- `https://as.com/resultados/futbol/primera_rfef/calendario/`

Robots y condiciones:

- `https://as.com/robots.txt` respondió `200`.
- Las rutas `/resultados/futbol/primera_rfef/` no están bloqueadas para el
  user-agent del proyecto.
- Sin embargo, el aviso legal actualizado en julio de 2025 formula una reserva
  expresa frente a reproducciones y usos mediante lectura mecánica.
- Por esa condición accesible, el scraping de AS queda **desactivado**. Robots
  por sí solo no constituye autorización.

Adaptador y selectores:

- `AsPrimeraFederacionProvider` existe como adaptador sustituible y devuelve un
  diagnóstico `blocked-by-terms` sin descargar las páginas de datos.
- Si en el futuro se obtiene autorización, el parser se habilitará con fixtures
  sintéticos y selectores semánticos de jornada, grupo II, tabla y partidos;
  nunca con imágenes ni artículos.
- La regla de horario placeholder queda preparada: si todos los partidos de una
  jornada muestran `02:00`, ninguno se considera confirmado.

Fallback:

- calendario RFEF;
- web oficial del Real Zaragoza;
- clasificación calculada localmente;
- último snapshot válido;
- demo señalada.

## Fuente 3: Real Zaragoza oficial

Páginas utilizadas:

- `https://www.realzaragoza.com/partidos`
- `https://www.realzaragoza.com/agenda`
- `https://www.realzaragoza.com/noticias`

Campos:

- competición y jornada;
- local, visitante, fecha, hora, estadio y resultado cuando estén presentes;
- amistosos claramente identificados;
- enlaces a la página original;
- de noticias, únicamente enlaces candidatos cuyo título indique confirmación
  de horarios o amistosos; nunca el cuerpo completo.

Robots y condiciones:

- `https://www.realzaragoza.com/robots.txt` respondió `200`.
- Para `User-agent: *` bloquea `/api/`, `/preview/` y `/_next/`; las tres
  páginas públicas anteriores están permitidas.
- El aviso legal permite visualizar, copiar y almacenar para uso personal y
  privado. Esta integración permanece local y no reutiliza imágenes, escudos,
  logotipos ni textos completos.

Selectores estables:

- tarjeta: clase semántica `MkFootballMatchCard`;
- competición: `MkFootballMatchCard__competition`;
- jornada: `MkFootballMatchCard__matchWeek`;
- estadio: `MkFootballMatchCard__venue`;
- equipos: `MkFootballMatchCard--homeTeam` y
  `MkFootballMatchCard--awayTeam`;
- estado: `MkFootballMatchCard--status-*`;
- respaldo de equipos: atributo `aria-label="<local> vs <visitante>"`;
- se ignoran por completo `img`, `picture`, `srcset` y datos de imagen.

Frecuencia y cambios:

- máximo una descarga por página cada seis horas;
- ETag/Last-Modified y SHA-256;
- parser validado con fixtures locales mínimos;
- si cambian las clases, se conserva el último snapshot y se marca revisión.

Riesgos:

- HTML generado por Next.js y clases de estilo variables;
- algunas tarjetas futuras no publican fecha u hora;
- agenda actualmente puede no contener partidos;
- las páginas de noticias no sustituyen una confirmación explícita.

## Clasificación local

`ComputedStandingsProvider` utiliza únicamente partidos terminados del grupo
correspondiente y calcula PJ, PG, PE, PP, GF, GC, diferencia y puntos. El orden inicial es:

1. puntos;
2. diferencia de goles;
3. goles a favor;
4. nombre del equipo.

Ese orden no intenta reproducir todos los desempates reglamentarios. La tabla
publicada se usa solo como comprobación. Una discrepancia conserva ambas
versiones en el informe, prioriza la versión oficial cuando exista y marca el
snapshot `reviewRequired`.

## Prioridad y fallback

1. confirmación oficial del Real Zaragoza o RFEF;
2. fuente estructurada autorizada (AS permanece desactivada);
3. clasificación calculada;
4. último snapshot válido;
5. datos demo claramente señalados.

## Pruebas de detección de cambios

- PDF sin cambios por ETag, Last-Modified o hash;
- PDF cambiado pero válido;
- PDF cambiado e incompleto: rechazo y último snapshot;
- exactamente 38 jornadas y 380 partidos;
- exactamente 38 partidos del Real Zaragoza;
- cambio de selector oficial: diagnóstico y fallback;
- jornada completa a `02:00`: diez horarios provisionales o desconocidos;
- cálculo de clasificación con victorias, empates y derrotas;
- discrepancia entre tabla calculada y tabla publicada;
- timeout, error HTTP, bloqueo y caché vigente sin nuevas solicitudes.
