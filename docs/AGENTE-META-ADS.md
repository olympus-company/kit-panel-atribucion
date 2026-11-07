# Agente de Meta Ads · cañerías y método

## Qué hace
Una vez por semana (o cuando se le pide «informe del lunes») lee las cuentas de Meta de los clientes, **solo con GET**, arma una tabla por anuncio (gasto, CPM, frecuencia diaria, costo por resultado) con 14 días diarios, la **cruza con el CRM** (oportunidades por anuncio) y entrega un informe con **máximo 3 acciones**, cada una con el número que la justifica. Nunca pausa, edita ni cambia presupuestos.

## Qué viene en este kit
- `codigo/src/features/agente-meta/graph.ts`: lector de Meta con paginación; el token va en el encabezado, no en la URL. Tipos en `tipos.ts` y una prueba (`graph.test.ts`).
- `codigo/src/features/agente-meta/crm.ts`: cruce con el CRM. Saca el ID del anuncio de un campo del contacto, de la atribución nativa del CRM o de la tabla `ctwa_attribution` por teléfono. Recibe tu propio mapeo de etapas (`tierDeEtapa`: nombre de etapa → 0 sin hito, 1 calificado, 2 venta). Si el cliente no guarda el ID, lo dice («sin atribución por anuncio») y no inventa.
- `meta-ads-kit/`: el método de Olympus para Meta Ads, escrito con palabras propias: una skill de 8 etapas (`meta-ads-olympus`) y un auditor de solo lectura (`meta-auditor`). Es el criterio con el que se interpreta lo que lee `graph.ts`.

## Qué no viene
La versión interna del agente usa material de método de terceros que no se redistribuye, y el generador de su informe. Aquí no están. Lo que reemplaza ese criterio es `meta-ads-kit/`.

## Cómo armar tu propio agente con este kit
1. Instala `meta-ads-kit/` (instrucciones en su `LEEME-INSTALAR.md`).
2. Usa `graph.ts` para leer 14 días por anuncio y `crm.ts` para cruzar con las oportunidades.
3. Pide al modelo un informe con este formato: diagnóstico de cuenta (¿se puede gastar más mañana: sí o no, y por qué?), tabla por anuncio, máximo 3 acciones, quién las hace.
4. Antes de recomendar sobre una campaña, averigua **para qué existe**: juzgar una campaña de tráfico al perfil por su costo por conversación es el error típico.
5. Deja el informe en revisión humana. Nada se ejecuta en Meta sin OK del dueño de la cuenta, con cifras e IDs.
