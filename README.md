# Kit · Panel de atribución + CAPI de Meta + llamadas (Fathom) + agente de Meta Ads

Para: el Claude de Axel. De: Olympus (Patricio). Versión: 7-nov-2026.

## Qué es esto
Es la copia limpia del sistema que Olympus armó para un cliente con embudo de llamadas de venta de ticket alto. Une cuatro cosas:

1. **CAPI de Meta**: el CRM avisa cada escalón del embudo (lead calificado, llamada agendada, venta con valor) y se lo mandamos a Meta atado a la persona y, si existe, al anuncio exacto.
2. **Panel de atribución**: de qué anuncio salió cada oportunidad, cuánto costó, cuánto vendió (ROAS real, sacado del CRM y no de lo que reporta Meta).
3. **Llamadas de venta**: Fathom graba, la IA puntúa la llamada (objeción, precio, tiempo de habla del closer) y el panel muestra el ranking de closers.
4. **Agente de Meta Ads**: lee las cuentas de Meta, las cruza con el CRM y entrega un informe con 3 acciones. Solo lectura.

## Qué se quitó a propósito
Ninguna clave, token, ID de cuenta, pixel, ubicación o etapa del CRM; ningún correo, teléfono, precio ni dato de clientes. Donde había un valor real ahora dice `VALOR_…` o `ejemplo`. Tampoco van los otros paneles de clientes ni material de terceros (ver `docs/AGENTE-META-ADS.md`).

## Cómo usarlo (orden recomendado)
1. Lee `docs/ARQUITECTURA.md` (un solo mapa).
2. Haz ingeniería inversa de `codigo/` con ese mapa. Está copiado con las mismas rutas del proyecto original (`src/...`), así que los imports `@/...` apuntan a esas rutas.
3. Lo que el código importa y NO viene aquí está en `docs/VARIABLES-Y-DEPENDENCIAS.md` (tablas, variables de entorno, módulos que tendrás que reemplazar por los tuyos).
4. Para integrarlo a tu repo: sustituye la capa de datos (nosotros usamos Supabase + HighLevel como CRM) por la tuya y conserva la lógica de los cuatro bloques.
5. Para el agente de Meta Ads, instala `meta-ads-kit/` (lee `meta-ads-kit/LEEME-INSTALAR.md`).

## Reglas que se conservan en cualquier adaptación
- Los eventos a Meta están apagados hasta activar una variable (`…_CAPI_LIVE=true`) y se prueban primero en «Probar eventos».
- Cada evento lleva un `event_id` estable por persona y etapa, para que Meta no cuente dos veces.
- Ninguna acción cambia, pausa ni crea nada en Meta sin OK del dueño de la cuenta, con cifras e IDs.
- El panel de cada cliente abre solo con su propia llave en la URL; no hay llave maestra.
- La verdad del embudo es el CRM, no el número que reporta Meta.

## Prompt para pegar en tu Claude (con este repo abierto)
```
Lee LEEME-PARA-TU-CLAUDE.md y docs/ARQUITECTURA.md. Después haz ingeniería inversa de /codigo y devuélveme:
1) un mapa de cómo viaja un lead desde el anuncio hasta la venta y hasta Meta;
2) qué piezas de mi stack reemplazan a cada dependencia que falta (docs/VARIABLES-Y-DEPENDENCIAS.md);
3) un plan de integración por etapas, empezando por la CAPI y el panel, con una verificación por etapa.
No ejecutes nada contra Meta ni contra ningún CRM real: solo lee y planifica.
```

## Licencia
MIT (ver `LICENSE`). Puedes usarlo, modificarlo y distribuirlo, incluso con fines comerciales.
