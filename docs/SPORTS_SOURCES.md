# Fuentes de partidos y clasificación

Evaluación realizada el 27 de julio de 2026 para sustituir los partidos y la
clasificación de demostración por datos automáticos del Real Zaragoza.

## Contexto deportivo actual

La fuente oficial de la RFEF sitúa al Real Zaragoza en el **grupo 2 de Primera
Federación 2026/27**, no en LALIGA HYPERMOTION. El calendario oficial de la
categoría tiene 38 jornadas y está publicado en PDF:

- [Grupos de Primera Federación 2026/27](https://rfef.es/es/noticias/aprobados-los-grupos-de-primera-federacion-para-la-temporada-202627)
- [Calendarios completos de Primera Federación](https://rfef.es/es/noticias/calendarios-completos-primera-federacion-temporada-202627)
- [PDF oficial del grupo 2](https://rfef.es/sites/default/files/2026-06/Primera_Federacion_Grupo_II.pdf)

La interfaz demo conserva por ahora la temporada ficticia con su distintivo
`DEMO`. No debe mezclarse con datos reales ni presentarse como información
vigente.

## Comparativa

| Fuente | Acceso | Cobertura útil | Coste y límites | Fiabilidad | Restricciones / riesgo | Decisión |
| --- | --- | --- | --- | --- | --- | --- |
| RFEF | Web y PDF oficiales | Calendario de Primera Federación, grupos y documentación oficial | Gratuito | Máxima para calendario y composición | No se ha encontrado API o feed documentado. Automatizar resultados o clasificación exigiría scraping; el PDF sirve como documento, no como feed vivo | Referencia oficial. No automatizar sin permiso para una estrategia de extracción mantenible |
| LALIGA | Web pública | Histórico de Segunda División hasta 2025/26 | Gratuito | Oficial para competiciones profesionales | El Real Zaragoza ya no compite en una categoría gestionada por LALIGA en 2026/27. No hay API pública documentada | No aplicable como fuente principal actual |
| API-Football | API REST JSON con clave | Primera Federación, Copa del Rey, fixtures, resultados, tabla, eventos y alineaciones según cobertura | Plan gratuito: 100 solicitudes/día; cuenta obligatoria; temporadas del plan gratis limitadas | Buena para un MVP, sin garantía de disponibilidad | Sus términos no conceden licencia de publicación y trasladan al usuario la obtención de permisos de titulares de derechos. El plan gratis puede cambiar sin aviso | Mejor opción técnica para prototipo, pendiente de aceptación expresa y clave |
| football-data.org | API REST JSON con clave | Fixtures y tablas de competiciones seleccionadas | Gratis: 12 competiciones y 10 solicitudes/minuto | Servicio estable y sencillo | Primera Federación no figura en las competiciones gratuitas. La cobertura gratis española se limita a Primera División | Descartada para la temporada actual |
| TheSportsDB | API REST JSON v1; clave pública gratuita | Equipos, eventos y algunas tablas | Gratis: 30 solicitudes/minuto, pero respuestas muy recortadas | Base comunitaria | En la comprobación, Real Zaragoza seguía asociado a una competición anterior. Los endpoints gratuitos de equipo solo devuelven un evento local y v2 es de pago | Descartada como fuente principal por datos desactualizados e incompletos |
| Sportmonks | API REST JSON con token | Primera Federación y competiciones españolas, según plan | Desde 29 €/mes; prueba de 14 días. El plan permanente gratuito no incluye España | Alta, soporte y cobertura comercial | Requiere contratar un plan para la competición relevante | Alternativa de pago; no seleccionar sin aprobación |

## Evaluación de API-Football

Es la opción con menor barrera técnica para una primera integración real:

- incluye todas las competiciones y endpoints en el plan gratis, con temporadas
  limitadas;
- publica cobertura para Primera Federación;
- ofrece fixtures, clasificación, equipos, eventos y alineaciones;
- 100 solicitudes diarias permiten una sincronización cada varias horas con
  caché de servidor;
- el acceso se haría únicamente desde el servidor mediante
  `x-apisports-key`, nunca desde el navegador.

Sin embargo, sus [términos](https://www.api-football.com/terms) indican que el
servicio no concede una licencia para publicar los datos y que pueden existir
derechos o restricciones de ligas, federaciones y organizadores. Su uso fue
aprobado el 28 de julio de 2026 exclusivamente para un prototipo gratuito,
local y personal, sin imágenes ni publicación.

## Estrategia aprobada para API-Football

1. Crear una cuenta gratuita directamente en API-Football, sin RapidAPI y sin
   introducir un método de pago.
2. Guardar la clave como `API_FOOTBALL_KEY` exclusivamente en el servidor.
3. Descubrir y validar mediante API los identificadores de Real Zaragoza,
   Primera Federación grupo 2, temporada 2026 y Copa del Rey.
4. Implementar un adaptador sustituible que normalice equipos, competición,
   jornadas, horarios, estados, marcadores y clasificación.
5. Sincronizar como máximo cada seis horas en condiciones normales. Aumentar la
   frecuencia solo alrededor de un partido y siempre dentro de cuota.
6. Conservar el último snapshot válido, registrar cuota y errores, y volver al
   modo demo mediante variable de entorno.
7. No utilizar logotipos o imágenes de la API hasta aclarar sus derechos.

La configuración paso a paso está en
[`docs/API_FOOTBALL_SETUP.md`](./API_FOOTBALL_SETUP.md).

## Alternativas

- **Máxima prudencia legal:** mantener el modo demo y solicitar a RFEF una vía
  oficial/licenciada de datos.
- **Prototipo sin coste:** aprobar API-Football para desarrollo local, aceptar
  sus condiciones y aportar una clave gratuita.
- **Producción con soporte:** evaluar Sportmonks u otro proveedor licenciado y
  presentar costes antes de contratar.
- **Extracción RFEF:** estudiar el PDF oficial para el calendario inicial y la
  web para resultados. Esta vía implica scraping/extracción frágil y requiere
  aprobación específica antes de implementarse.
