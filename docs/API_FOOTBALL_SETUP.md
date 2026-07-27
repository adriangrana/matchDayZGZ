# Configuración local de API-Football

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
SPORTS_DATA_MODE=real
API_FOOTBALL_KEY=tu_clave_privada
```

Mantén los valores predeterminados de temporada, competición, caché y cuota.
`.env.local` está ignorado por Git.

## 4. Comprobar la sincronización

Ejecuta:

```powershell
npm run sync:sports
```

El comando nunca imprime la clave. El resultado debe indicar `mode: "real"`,
mostrar las fechas de sincronización, el número de partidos y el consumo
estimado. La primera ejecución usa normalmente cuatro solicitudes: equipo,
competición, calendario y clasificación.

Después inicia o reinicia la aplicación:

```powershell
npm run dev
```

La portada mostrará `API-Football local` y la fecha de última actualización.

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

