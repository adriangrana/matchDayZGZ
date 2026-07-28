# Investigación de resultados y clasificación públicos de la RFEF

Fecha de comprobación: 28 de julio de 2026.

## Objetivo

Encontrar una fuente oficial, pública y gratuita que permita completar los
resultados y la clasificación del Grupo II de Primera Federación sin eludir
autenticación, captchas, bloqueos ni restricciones técnicas.

## Superficies revisadas

### Página oficial de Primera Federación

- URL: <https://rfef.es/es/competiciones/primera-federacion>
- La página pública presenta un enlace denominado «Actas, clasificaciones y
  calendario».
- Ese enlace conduce al sistema de marcadores de la RFEF.
- La respuesta directa automatizada de la página de competición fue `403`, por
  lo que no se empleará como origen de scraping.
- El HTML indexado públicamente no muestra una tabla completa de resultados ni
  clasificación y no ofrece un estado JSON utilizable como fuente estable.

### Sistema oficial de marcadores

- URL enlazada por la RFEF:
  <https://marcadores.rfef.es/pnfg/NLogin?NSess=1>
- La navegación pública termina en una pantalla de inicio de sesión.
- `https://marcadores.rfef.es/robots.txt` declara `Disallow: /` para agentes
  genéricos.
- No se han intentado peticiones internas, credenciales, evasión de sesión,
  captchas ni técnicas de ingeniería inversa.

### JSON-LD y estados incluidos en página

- No se ha encontrado un bloque JSON-LD, un estado JSON embebido o un endpoint
  público documentado que contenga todos los partidos y resultados del Grupo
  II.
- No se utilizarán peticiones privadas de la aplicación ni endpoints que
  requieran sesión.

### Documentos y noticias oficiales

- El calendario oficial 2026/27 está publicado como PDF:
  <https://rfef.es/sites/default/files/2026-06/Primera_Federacion_Grupo_II.pdf>
- El PDF aporta emparejamientos y fechas base de jornada, pero no confirma el
  día, la hora o el estadio de cada partido.
- Las noticias y resúmenes oficiales encontrados contienen información
  selectiva de jornadas o temporadas anteriores. No forman una fuente
  estructurada, completa y estable para calcular la clasificación actual.

## Conclusión

No se ha localizado una fuente oficial pública, estable y permitida que
proporcione todos los resultados del Grupo II. Por tanto:

- el calendario del PDF se conserva únicamente como calendario base;
- sus fechas se etiquetan como fechas base de jornada;
- no se inventan horarios, estadios, resultados ni posiciones;
- la clasificación permanece pendiente hasta disponer de todos los resultados
  necesarios;
- la interfaz muestra el último snapshot válido y su fecha de actualización;
- el proveedor de resultados sigue desacoplado para poder sustituirlo cuando
  exista una fuente pública adecuada.

## Criterio para reconsiderar esta decisión

La clasificación completa podrá activarse cuando la RFEF publique un feed,
documento o página accesible sin sesión que incluya, como mínimo, identificador
de jornada, equipos, marcador final y estado del partido para todos los
encuentros del grupo. Antes de integrarlo se volverán a comprobar sus términos,
`robots.txt`, estabilidad y coste de peticiones.
