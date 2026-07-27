# Adaptador opcional de API-Football

> Este adaptador está desactivado. MatchDay ZGZ usa
> `SPORTS_PROVIDER=free-web` y no necesita cuenta, clave ni plan de
> API-Football. Este documento se conserva únicamente como referencia del
> adaptador sustituible.

Esta integración está aprobada únicamente como prototipo local y de uso
personal. No se deben publicar sus datos sin aclarar previamente los derechos
de publicación indicados en los términos del proveedor.

## 1. Crear la cuenta gratuita

1. Abre [dashboard.api-football.com](https://dashboard.api-football.com/).
2. Elige la opción de registro y crea una cuenta directamente con API-Sports.
3. Confirma el correo electrónico.
4. Conserva el plan **Free**. No es necesario introducir un método de pago ni
   utilizar RapidAPI.

El plan gratuito ofrece actualmente 100 solicitudes diarias. MatchDay ZGZ
aplica un límite interno más conservador de 50.

## 2. Encontrar la clave

Dentro del dashboard:

1. Abre `Account`.
2. Entra en `My Access`.
3. Copia el valor identificado como `API Key`.

No pegues la clave en el chat, no la incluyas en capturas y no la añadas a
ningún archivo versionado.

## 3. Configurar el repositorio

En la raíz del repositorio, crea un archivo local llamado `.env.local`. Puedes
partir de `.env.example`:

```powershell
Copy-Item .env.example .env.local
```

Edita únicamente tu copia local y configura:

```dotenv
SPORTS_PROVIDER=api-football
API_FOOTBALL_KEY=tu_clave_privada
```

Mantén los valores predeterminados de temporada, caché y cuota.
`API_FOOTBALL_LEAGUE_NAME` se deja vacío para descubrir automáticamente la
competición de liga del equipo. `.env.local` está ignorado por Git.

El plan gratuito limita actualmente las temporadas disponibles a 2022–2024.
Por eso la integración real usa `API_FOOTBALL_SEASON=2024`: sirve para validar
el adaptador con datos históricos, mientras el modo demo conserva la
experiencia visual de la temporada actual. No se debe contratar un plan de
pago para ampliar ese acceso.

## 4. Comprobar la sincronización

Ejecuta:

```powershell
node --env-file-if-exists=.env.local --import tsx scripts/sync-sports.ts
```

El comando nunca imprime la clave. Los mensajes deben confirmar los metadatos,
el calendario y la clasificación normalizados, además del consumo estimado.
La primera ejecución usa normalmente cuatro solicitudes: equipo, competición,
calendario y clasificación.

Como la temporada gratuita más reciente es histórica, no contiene próximos
partidos en 2026. En ese caso la salida termina en `mode: "demo"` y explica que
la portada conserva el fallback; esto no indica un fallo de la clave. Los
mensajes `metadatos validados`, `calendario` y `clasificación` confirman que el
adaptador real funciona y que su snapshot quedó guardado.

Después inicia o reinicia la aplicación:

```powershell
npm run dev
```

La portada seguirá mostrando datos demo actuales mientras el plan gratuito no
permita una temporada con próximos partidos. El proveedor permanece
desacoplado y listo para sustituirse sin cambiar la interfaz.

El runtime web local de Vinext tampoco permite escribir archivos desde el
renderizado. Por seguridad, la portada no intenta consultar API-Football si no
puede actualizar de forma duradera el contador de cuota. La sincronización real
se comprueba con el comando anterior, que sí usa la caché local ignorada por
Git. Una futura versión con almacenamiento persistente podrá consumir ese
adaptador desde la web sin modificar la interfaz.

## Caché y límites

- calendario, próximos partidos y resultados: 6 horas;
- clasificación: 12 horas;
- equipo y competición: 24 horas;
- máximo interno: 50 intentos HTTP por día UTC;
- reintentos: uno, únicamente tras timeout, límite temporal o error de servidor;
- estado local: `.cache/api-football-state.json`, ignorado por Git.

Cada intento HTTP, incluido un reintento, incrementa el contador estimado. Al
alcanzar el límite, la aplicación no llama de nuevo al proveedor y conserva el
último snapshot válido. Si todavía no existe uno, vuelve al modo demo.

## Restricción de publicación

Los [términos de API-Football](https://www.api-football.com/terms) indican que
el servicio no concede por sí mismo una licencia para publicar los datos y que
pueden existir derechos de ligas, federaciones u organizadores. Esta versión:

- no se despliega públicamente;
- no utiliza logotipos, fotografías, escudos ni imágenes de la API;
- no contiene resultados en directo;
- no aumenta la frecuencia durante los partidos;
- no contrata ni activa planes de pago.
