# Escudos de equipos

Revisión y sincronización realizadas el 28 de julio de 2026 para el prototipo
local y de uso personal MatchDay ZGZ.

## Fuente elegida

Se usa exclusivamente la API v1 oficial de
[TheSportsDB](https://www.thesportsdb.com/documentation), mediante
`searchteams.php` y la clave pública gratuita `123` documentada por el propio
servicio. No se raspa su web y no se consumen resultados, calendarios ni
clasificaciones de TheSportsDB.

La API gratuita permite buscar datos y artwork para proyectos de desarrollo,
tiene un límite publicado de 30 peticiones por minuto y no permite publicar una
aplicación gratuita en una tienda de aplicaciones. Sus
[condiciones](https://www.thesportsdb.com/docs_terms_of_use.php) exigen usar los
endpoints oficiales y mantener los logotipos con marca registrada «tal cual»,
sin modificarlos. Esta integración no concede derechos adicionales sobre las
marcas de los clubes y debe revisarse de nuevo antes de cualquier publicación.

## Coincidencias validadas

| Equipo canónico | ID TheSportsDB | Escudo |
| --- | ---: | --- |
| Águilas FC | 144249 | `h70lhf1677639069.png` |
| AD Alcorcón | 134699 | `bu9ngq1537723817.png` |
| Algeciras CF | 138306 | `xfayh61579989400.png` |
| FC Cartagena | 137446 | `xzrxd71677472112.png` |
| Atlético Madrileño | 137820 | `zk7lk31719984307.png` |
| Juventud de Torremolinos CF | 146798 | `4bh1zt1660660153.png` |
| Antequera CF | 144237 | `f7brqy1721094011.png` |
| UD Ibiza | 137748 | `vtxbel1784094189.png` |
| CE Europa | 144229 | `xdfie41784675774.png` |
| Real Jaén CF | 137763 | `may3aj1735056799.png` |
| Hércules de Alicante CF | 133815 | `3evl161711252098.png` |
| Real Murcia CF | 133878 | `zoo96h1747995489.png` |
| SD Huesca | 135454 | `tuxusx1447590509.png` |
| UE Sant Andreu | 144942 | `v33d1n1685918619.png` |
| CF Rayo Majadahonda | 136249 | `k2kkjx1609532963.png` |
| Villarreal CF "B" | 134488 | `6mwply1690219069.png` |
| Gimnàstic de Tarragona | 134211 | `tpytry1447591259.png` |
| Real Zaragoza | 133737 | `sxpwxs1473503702.png` |
| CD Teruel | 142536 | `d8mm071678162748.png` |
| Real Madrid Castilla | 134485 | `djtemm1639480207.png` |

Las URLs HTTPS completas, aliases usados, endpoint exacto de procedencia, fecha
de sincronización, MIME, dimensiones y ruta de la copia local se conservan en
`src/data/team-branding-snapshot.json`.

No había un archivo de escudo real del Real Zaragoza en `public/` antes de esta
fase. Por ello se utiliza el registro validado de TheSportsDB, con la misma
procedencia y reglas que los demás equipos.

## Equipos no encontrados y coincidencias dudosas

En esta sincronización:

- equipos no encontrados: 0;
- imágenes rechazadas: 0;
- coincidencias dudosas: 0.

La búsqueda `Atletico Madrid B` puede devolver el primer equipo Atlético Madrid.
Esa coincidencia no se acepta: el proveedor exige coincidencia entre nombre o
alias del registro devuelto y el club esperado. El registro aceptado para
Atlético Madrileño es el `137820`.

## Validación

Un escudo solo se publica en el snapshot cuando:

- la entidad es de deporte `Soccer` y país `Spain`;
- el nombre principal o alternativo coincide con los aliases controlados;
- procede del campo `strBadge`, nunca de fanart, fotografía o logo de liga;
- la URL usa HTTPS;
- la respuesta es correcta y declara PNG, WebP, JPEG o SVG;
- la firma del archivo coincide con el MIME;
- mide como mínimo 48 × 48 px y no es una imagen vacía;
- su relación de aspecto está entre 1:5 y 5:1;
- un SVG no incluye una fotografía incrustada.

La interfaz usa `object-fit: contain`, conserva la proporción, no recorta, no
recolorea y no aplica fondos circulares ni efectos al escudo.

## Caché y actualización

- El resultado se guarda en `.cache/team-branding.json`.
- La copia normalizada que consume la interfaz se guarda en
  `src/data/team-branding-snapshot.json`.
- Los bytes ya validados se copian sin modificación a `public/team-badges/`
  durante la sincronización. La interfaz usa esa copia y no vuelve a descargar
  el escudo de TheSportsDB en cada apertura de página.
- La caducidad es de siete días.
- Si la lista canónica de equipos no cambia, el comando reutiliza el snapshot y
  no realiza solicitudes antes de la fecha de actualización.
- Un cambio en los IDs canónicos invalida la caché aunque no haya transcurrido
  una semana.
- Actualización manual:

```powershell
npm run sports:sync-badges
```

`--force` existe únicamente para desarrollo y revisión expresa.

## Fallback

Si falta un escudo, la coincidencia es dudosa, la imagen se rechaza o falla la
carga remota:

- se muestra el nombre del equipo sin iniciales ni icono inventado;
- se conserva un espacio neutro y discreto para mantener la alineación;
- el equipo aparece como pendiente en `npm run sports:inspect`;
- nunca se usa el escudo de otro equipo.
