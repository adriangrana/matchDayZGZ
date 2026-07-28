# Fuentes de noticias para MatchDay ZGZ

Revisión técnica realizada el 27 de julio de 2026. Esta evaluación no sustituye
asesoramiento legal. La integración debe almacenar únicamente metadatos, un extracto
breve y el enlace al artículo original.

## Criterios

- Preferencia: API documentada → RSS/Atom publicado → JSON-LD → HTML.
- No se seleccionan servicios de pago ni APIs con alta obligatoria en esta fase.
- No se descarga ni republica el cuerpo completo de los artículos.
- Se aplican caché de 30 minutos, `User-Agent` identificable, timeout y reintentos
  limitados.
- Una noticia solo recibe estado `official` si procede del dominio oficial del club.

## Fuentes evaluadas

| Fuente | Acceso estructurado | Cobertura y frecuencia | Fiabilidad | Riesgo de rotura | Restricciones y decisión |
| --- | --- | --- | --- | --- | --- |
| [Real Zaragoza — web oficial](https://www.realzaragoza.com/noticias) | No se ha encontrado RSS/Atom ni API pública documentada. La página se sirve con Next.js y contiene datos internos y JSON-LD de sitio/equipo, no un feed público de artículos. | Noticias institucionales, primer equipo y cantera; varias publicaciones semanales y más frecuencia en días de actividad. | Máxima para comunicados del club. | Medio/alto si se consume el HTML o el estado interno de la aplicación. | El aviso legal y la ausencia de un feed documentado aconsejan no automatizar el HTML. **No integrada**: requeriría scraping o acuerdo/autorización. |
| [Aragón Digital — RSS Real Zaragoza](https://www.aragondigital.es/rss/real-zaragoza/) | RSS 2.0 público y específico, con título, URL, `guid`, fecha, autor, descripción y `enclosure`. La propia [página de RSS](https://www.aragondigital.es/rss/listado/) ofrece la categoría Real Zaragoza. | Cobertura local frecuente; el feed declara actualización horaria. | Alta para actualidad local; no es fuente oficial del club. | Bajo/medio: feed explícito y específico. | Usar solo metadatos y descripción breve, con atribución y enlace. **Integrada**. |
| [El Periódico de Aragón — RSS](https://www.elperiodicodearagon.com/rss/) | RSS 2.0 general publicado; incluye título, URL, fecha, autor, descripción y `enclosure`. No se localizó feed exclusivo del club. | Medio local con publicaciones continuas; los artículos del club aparecen mezclados con otras secciones. | Alta como medio local; no oficial. | Medio: requiere filtrado textual dentro de un feed público, no scraping HTML. | Filtrar únicamente elementos que mencionen inequívocamente al Real Zaragoza. **Integrada**. |
| [Heraldo de Aragón — RSS](https://www.heraldo.es/rss/) | RSS 2.0 general publicado con título, URL, fecha, autor, descripción e imagen. No se localizó feed exclusivo verificable. | Cobertura local amplia y actualización varias veces al día. Parte del contenido puede requerir suscripción. | Alta como medio local; no oficial. | Medio: feed estable pero general y potencialmente amplio. | Mostrar metadatos/enlace incluso cuando el destino sea de suscripción; nunca sortear el paywall. **Integrada**. |
| [MARCA — RSS Real Zaragoza](https://e00-marca.uecdn.es/rss/futbol/zaragoza.xml) | RSS 2.0 público específico con Media RSS, autor, fecha, resumen e imagen con dimensiones. | Medio deportivo nacional; frecuencia ligada a la actividad deportiva y de mercado. | Alta como medio deportivo; no oficial. | Bajo/medio: endpoint específico, aunque alojado en CDN editorial. | Usar extracto y enlace; confirmar antes de cualquier uso comercial ampliado. **Integrada**. |
| [AS — Real Zaragoza](https://as.com/tag/real_zaragoza) | AS ofrece un [directorio RSS público](https://as.com/rss/index.html), pero no se encontró un endpoint vigente y específico del club. La página de etiqueta es HTML. | Cobertura deportiva nacional frecuente. | Alta como medio deportivo; no oficial. | Alto si se raspa la página de etiqueta. | **No integrada** hasta disponer de un RSS específico estable o permiso para otro mecanismo. |
| Google News RSS | RSS de búsqueda no documentado como API de producto; enlaces intermedios y condiciones sujetas a cambios. | Cobertura agregada muy amplia. | Variable según medio original. | Alto: resolución de enlaces y funcionamiento opacos. | No usar como fuente primaria mientras existan feeds directos de los editores. |
| GDELT DOC API | API pública de agregación global, sin coste directo; cobertura irregular para prensa local y resúmenes no garantizados. | Muy amplia, con latencia y ruido variables. | Media para descubrimiento, no para atribución editorial final. | Medio. | Reserva para descubrimiento futuro; no necesaria en esta primera integración. |

## Selección de la primera integración

Se integran cuatro feeds RSS publicados por los propios editores:

1. Aragón Digital, específico del Real Zaragoza.
2. MARCA, específico del Real Zaragoza.
3. Heraldo de Aragón, general con filtrado estricto.
4. El Periódico de Aragón, general con filtrado estricto.

La combinación cubre fuente local y deportiva sin depender de scraping, claves o
servicios de pago. Ninguna de estas cuatro fuentes es oficial del club; por tanto,
sus noticias nunca se clasifican automáticamente como `official`.

## Revisión pendiente de la fuente oficial

Antes de incorporar la web oficial debe ocurrir una de estas condiciones:

- publicación de RSS/Atom o API documentada;
- permiso expreso para consumir el listado de noticias;
- acuerdo técnico con LaLiga/Maker para un endpoint estable.

Hasta entonces, MatchDay ZGZ mostrará las noticias oficiales únicamente si llegan a
través de un feed oficial autorizado. La ausencia de fuente oficial no se suplirá
marcando como oficial una noticia de terceros.

## Conservación y derechos

- Guardar: identificador, título, resumen breve, URL del artículo, fuente,
  autor, fechas, categoría, confirmación, entidades y fecha de sincronización.
- Las imágenes se obtienen de los campos `enclosure`, Media RSS u OpenGraph que
  el propio feed editorial publica. Se conserva solamente su URL durante la
  vida del snapshot en memoria; el archivo no se descarga, almacena ni replica.
- Antes de entregar una URL a la interfaz se aceptan únicamente esquemas HTTP o
  HTTPS sin credenciales y se comprueba que la respuesta sea una imagen con un
  tamaño mínimo razonable. La validación tiene timeout y no reintenta de forma
  ilimitada.
- La tarjeta reserva desde el primer render una zona de altura fija con fondo
  local. La imagen remota usa `object-fit: cover`; si la carga falla, el
  componente la sustituye inmediatamente por el placeholder local MZ. Así se
  evitan tarjetas rotas y saltos de diseño.
- No guardar ni mostrar: cuerpo completo, galerías, contenido tras paywall o material
  no incluido en el feed.
- Mantener siempre enlace y nombre del editor.
- Respetar futuras instrucciones `robots`, cambios de términos, retiradas de feed y
  solicitudes de exclusión.
