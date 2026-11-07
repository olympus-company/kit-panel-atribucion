---
name: meta-ads-olympus
description: |
  Sistema completo para gestionar campañas de Meta Ads (Facebook e Instagram) de un negocio de
  servicios o agenda: perfil y oferta, medición y conexión con el CRM, estructura de campañas,
  creativos y pruebas, loop de decisión (escalar, iterar, matar) y medición real por resultado.
  Usar cuando el usuario diga: "arma la campaña de <cliente>", "ángulos de anuncios", "qué escalo /
  qué mato", "estructura de ads", "conecta el pixel", "mide bien esto", "por qué no me llegan leads",
  "revisa mis campañas", "reporte de Meta".
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
---

# meta-ads-olympus

Método de Olympus para campañas de Meta de negocios de servicios y agenda (leads, citas, ventas).
Es el criterio que se formó mirando resultados reales de muchas cuentas de presupuesto bajo
(pocos resultados al día), destilado en etapas verificables. Más que una metodología de curso,
es disciplina práctica.

## Principio raíz
**Criterio > metodología.** Cada curso enseña una metodología distinta; lo que gana es el criterio
que se forma observando resultados reales. La meta siempre es **darle un mejor resultado al negocio**,
no tener el costo por resultado más bajo de la pantalla.

## Al empezar cualquier tarea
1. Lee `meta/PERFIL.md`. Si no existe, corre la Etapa 0.
2. Lee `meta/ESTADO.md` para saber en qué etapa vas y qué sigue.
3. Lee `meta/BITACORA.md` para no repetir errores.
4. Si el usuario pregunta "¿qué hago ahora?", responde con la primera tarea pendiente de la etapa
   más baja sin terminar.

## Tres niveles de evidencia
Marca siempre de dónde sale cada afirmación:
- **[OFICIAL]** documentación de Meta (fase de aprendizaje, Advantage+, API de conversiones).
- **[PROBADO]** lo que verificamos funciona en nuestras cuentas, con ejemplo real.
- **[HIPÓTESIS]** regla de trabajo o criterio propio todavía sin confirmar en datos duros. Es
  disciplina útil, no una ley. Si los datos dicen otra cosa, gana el dato.

## Reglas duras
- **Solo lectura por defecto.** Nunca pausar, apagar, crear ni cambiar presupuestos o creativos sin
  OK escrito del dueño, con **cifras e IDs explícitos**. Las acciones se **proponen**, no se ejecutan solas.
- **Respeta siempre el techo de presupuesto** mensual acordado con el cliente.
- **No sobre-toques la cuenta.** Ajustes chicos por semana. Nunca des de baja todas las campañas para
  empezar de cero: es el peor error. [PROBADO]
- Nunca inventes cifras, clientes, reseñas ni resultados. Cada cifra lleva **fuente, fecha y ventana**.
- Un resultado que vino de varios canales **no se le atribuye entero a Meta**.
- Si una herramienta o el panel falla 2 veces en la misma acción, cambia de enfoque y avisa.
- Máximo 3 rondas de auditoría por pieza. Si sigue fallando, para y explica qué bloquea.
- Toda campaña o set de creativos pasa por el agente `meta-auditor` antes de pedir OK. Quien arma no audita.
- No copies material con derechos de terceros (cursos, academias). Este método se explica con palabras propias.

---

## Etapa 0 · Perfil, oferta y accesos
Entrevista al dueño, **una pregunta a la vez**, y escribe `meta/PERFIL.md`:
- Negocio, rubro, qué vende, **ticket** y **a quién NO quiere venderle**.
- **Qué cuenta como resultado real:** ¿una conversación, un lead, una cita agendada, una venta? Sin
  esto no se puede juzgar ningún costo. La pantalla de Meta miente si no sabes qué es un buen resultado.
- Cuál es el **servicio más rentable** (muchas veces no está en el brief, y es a eso a lo que hay que empujar).
- Cuentas de Meta y páginas, moneda, presupuesto mensual (techo).
- Cómo entra el lead: web + formulario, formulario instantáneo de Meta, clic a WhatsApp (CTWA) o DM
  de Instagram. Esto define toda la medición de la Etapa 1.
- CRM que usa, y si Claude Code tiene acceso de lectura al panel.
- Objetivo a 90 días, en contactos o ventas.
Crea `meta/ESTADO.md` con las etapas y `meta/BITACORA.md` vacío. **Nunca guardes claves ni tokens en estos archivos.**
**Listo cuando:** el perfil no tiene campos vacíos sin explicar y está claro qué es "un buen resultado".

## Etapa 1 · Medición y conexión con el CRM
Sin esto, Meta optimiza a ciegas y el reporte al cliente es humo. Es el cimiento.
1. **Pixel + API de conversiones (CAPI).** El pixel (navegador) solo no basta; el servidor manda los
   eventos buenos. [OFICIAL]
2. **El embudo de eventos**, no un solo evento: `Lead` (entró) → evento de **lead calificado** (el bot
   o el equipo confirmó que sirve) → **agenda** (cita tomada) → **venta**. Que Meta optimice por el
   evento de más abajo que tengas con volumen suficiente. [PROBADO]
3. **Calidad del match (saber QUIÉN es):** manda email y teléfono **hasheados** en el CAPI. Pedir el
   correo en el formulario, obligatorio, sube la calidad del match. [PROBADO]
4. **Atribución (saber DE QUÉ ANUNCIO vino):** el match dice quién; el **click-id** dice de qué anuncio.
   Son dos cosas distintas y Meta necesita las dos. El click-id cambia según cómo entró el lead:
   - Web + formulario → `fbclid` (queda en la URL, la web lo captura). Es la atribución más sólida. [PROBADO]
   - Formulario instantáneo de Meta → Lead ID de Facebook.
   - Clic a WhatsApp (CTWA) → `ctwa_clid` (viaja en el primer mensaje; **no hay `fbclid`**). Es el caso
     más frágil: muchas herramientas no lo exponen, y entonces Meta adivina el anuncio por modelo
     estadístico en vez de saberlo con certeza. [PROBADO]
5. **Regla de oro de la atribución:** toda conversión que quieras reportar **tiene que pasar por una
   automatización** (un tag o un cambio de etapa en el CRM). Una cita o venta hecha a mano, fuera del
   CRM, no dispara nada y Meta nunca se entera. [PROBADO]
6. En la web, evento de lead como conversión, y la pregunta **"¿cómo nos conociste?"** en el formulario.
7. Foto inicial en `meta/linea-base-AAAA-MM-DD.md`: gasto, resultados reales, costo por resultado y
   frecuencia de los últimos 7 y 14 días.
**Listo cuando:** el evento de lead calificado llega a Meta por CAPI, se ve en el administrador de
eventos, y queda claro qué click-id aplica a este funnel.

> **Ojo con reiniciar el aprendizaje:** cambiar el evento por el que optimiza una campaña **reinicia la
> fase de aprendizaje**. [OFICIAL] No lo hagas a la ligera, y nunca con el cliente esperando resultados
> esta semana. Avisa antes.

## Etapa 2 · Chequeo del panel (antes de tocar nada)
Antes de cualquier análisis, verifica en 30 segundos que el panel lee la cuenta: que responde, que
aparece la cuenta del cliente y que está activa. Si el panel está caído o la conexión caducó, **párate
ahí**: no analices con datos a medias. Todo este chequeo es **solo lectura**.
**Listo cuando:** el panel devuelve la cuenta del cliente, activa, en menos de 10 segundos.

## Etapa 3 · Estrategia y oferta (el anuncio es una promesa)
1. **El anuncio es una promesa de marketing, no un folleto.** A primera vista se entiende **qué se
   ofrece y para quién**, lo capta tanto el que tiene el problema como el que no.
2. **Las 2 primeras líneas son las que más importan.** Si ahí no queda claro qué ofrece, se perdió.
3. Incluye el **"para quién NO es"** cuando ayude a filtrar leads que no califican.
4. Cada anuncio con un **síntoma / dolor / solución** concreto: le habla a quien vive ese problema.
5. **Precio al final, no al inicio:** primero necesidad y conexión; el precio recién cuando la persona
   ya invirtió en la conversación.

## Etapa 4 · Estructura de campañas
- **Una campaña = una cosa. Un dolor / ángulo por anuncio.** No hagas 3 anuncios diciendo lo mismo:
  no testeas nada. Cada anuncio ataca un ángulo distinto para ver cuál trae mejores leads.
- **No mezcles públicos** muy distintos en una campaña (ej. niños + adultos). Sepáralos cuando se pueda
  invertir aparte.
- **Video e imagen en conjuntos distintos.** Meta optimiza las imágenes más rápido y les traspasa
  presupuesto por velocidad; si van juntas, el video nunca se mide bien. Separados, ves cuánto rinde
  cada formato. [PROBADO]
- **Audiencia automática (Advantage+): el copy segmenta.** Meta automatiza y amplía la audiencia con sus
  propias señales, y el público que defines a mano pasa a ser una sugerencia. [OFICIAL] En la práctica
  eso hace que el texto del anuncio sea lo que más pesa para elegir a quién se le muestra: por eso el copy
  tiene que **auto-seleccionar** al público correcto. Copy ambiguo = público equivocado. [PROBADO]
- **Revisa los ajustes que Meta activa por defecto** y decide cada uno a conciencia: presupuesto a nivel
  campaña, expansión de audiencia, expansión geográfica, anuncios multi-anunciante. No los dejes por inercia.

## Etapa 5 · Creativos y pruebas
- **Matriz, no anuncios al azar.** Cruza 4 ejes, cada combinación con su hipótesis: **avatar** (segmento),
  **ángulo** (un dolor/ océano libre, evita el saturado), **hook** (los primeros 3 segundos) y **formato**
  (reel, testimonial, estático, carrusel).
- **Saber qué se está testeando:** nunca metas los **mismos** creativos en dos "campañas de test". Eso no
  testea nada.
- **Copies: menos es más.** Gana el que explica en menos palabras y se entiende rápido, no el que pone más
  texto ni más emojis. No pegues lo que escupe la IA: entiende la oferta, lee el copy y dale feedback
  ("esto es ambiguo; menos texto pero que genere la necesidad de contactar; ofrece esto y NO es para tal persona").
- Al cambiar una campaña, **cambia también los copies** (no dejes "presencial en la ciudad X" cuando la oferta ya es online a todo el país).

## Etapa 6 · Loop de decisión: escalar, iterar, matar
Por anuncio, con datos reales del panel (nunca a ojo):
- **Escalar** el ganador (costo por resultado bajo el objetivo, buen CTR, lead de calidad): sube el
  presupuesto **gradual, no de golpe**.
- **Iterar** el prometedor: mismo ángulo, nuevo hook o formato.
- **Matar** el perdedor: costo por resultado alto, lead malo, o frecuencia diaria que se dispara.
- **Lee la frecuencia por día, no por semana.** Una frecuencia de 7-14 días promedia y esconde el problema. [HIPÓTESIS]
- **Jugada canónica (duplicar el ganador en paralelo):** cuando el "fueguito" decae (bajan conversaciones,
  sube el costo), **duplica** la campaña, al viejo bájale el presupuesto gradual, corre la nueva con
  creativos nuevos y separados (un conjunto de videos, otro de imágenes); cuando la nueva le gana, apaga
  la vieja y pásale todo el presupuesto. Repite con lo aprendido. [PROBADO]
- **Reasignar presupuesto:** un anuncio caro que trae resultados a alto costo se puede matar y repartir su
  presupuesto entre los más baratos para que compitan. Mira costo, frecuencia y **calidad del lead** antes de mover.
- **No apagues por ansiedad** el anuncio que más gasta solo porque gasta: muchas veces es el que sostiene la
  cuenta. Construye algo mejor que le quite gasto. [HIPÓTESIS]

## Etapa 7 · Medición real y reporte
- **La verdad está en el CRM, no en la pantalla de Meta.** Meta reporta "resultados" (conversaciones,
  registros); el negocio vive de **citas y ventas**. Reporta por resultado real: cuántas citas y cuántas
  ventas trajo cada anuncio, no solo cuántos clics. [PROBADO]
- **El cuello frecuente es lead → cita**, no la falta de leads. Si entran leads baratos pero no se agendan,
  el problema está en calificación y seguimiento, no en subir presupuesto. [PROBADO]
- **El seguimiento retiene al cliente.** Buen comienzo sin seguimiento = el cliente se va al mes. El bot o
  el equipo con seguimiento a las 24 h, 3 días y 7 días es clave.
- **Reporte semanal** al cliente: qué avatar × ángulo gana, costo por resultado real, y las 3 acciones de la
  semana. Eso alimenta la próxima matriz de creativos.

## El ejercicio de oro (reunión con el cliente)
Ve **anuncio por anuncio** y pregúntale al cliente: *"¿qué te preguntan de este?"*. Ahí se ve qué anuncio
es ambiguo, cuál filtra mal y qué ángulo trae mejores leads. *"Si no sabes hacer buenas preguntas, nunca
vas a tener buenas respuestas."* Pregunta también cuál es su servicio más rentable.

## Cuándo escalar vs cuándo apagar (resumen)
- **Escala** cuando un ganador sostiene buen costo por resultado **y** el lead es de calidad varios días
  seguidos (no una suerte de 24-48 h).
- **Apaga** cuando el lead es malo aunque el costo se vea bajo, cuando la frecuencia diaria se dispara, o
  cuando el copy ya no corresponde a la oferta.
- **Nunca** apagues todo para empezar de cero, ni toques presupuestos sin OK del dueño con cifras e IDs.

## Formato de salida (diagnóstico de una cuenta)
```
<Cliente> · <ventana> · gasto total
¿Conviene gastar más mañana? sí / no — por qué
Lo que gana: <anuncio> — costo por resultado real + calidad del lead (CRM)
Lo que sobra: <anuncio/campaña> — por qué
Estructura: ok / qué consolidar o separar
Medición: pixel/CAPI ok, evento que optimiza, click-id del funnel
3 acciones para la próxima semana (cada una con su número): 1… 2… 3…
Próxima prueba (matriz avatar×ángulo×hook×formato): <concepto>
SIN tocar nada en Meta hasta OK del dueño con cifras e IDs.
```

## Al terminar cada tarea
Actualiza `meta/ESTADO.md` con qué se hizo, la fecha y qué sigue, y agrega a `meta/BITACORA.md`
cualquier error o patrón para no repetirlo. Así el estado no queda desactualizado entre sesiones.
