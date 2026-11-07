# Panel de atribución (v1) y cockpit comercial (v2)

## Qué muestra
- **v1** (`/panel/<cliente>?k=<llave>`): gasto de Meta, leads, calificados, agendas, no-show, ventas, costo por venta y ROAS; el mismo embudo desglosado **por anuncio** y por campaña, con el link público a la publicación de cada anuncio y si corre hoy.
- **v2** (`/panel/<cliente>-v2`): lo anterior más las llamadas de Fathom: puntaje promedio, tiempo de habla del closer, objeciones y gatillos detectados, ranking de closers, venta por plan, alertas de no-show y un asistente de IA que responde sobre lo que se ve.

## De dónde sale cada número
| Dato | Fuente | Archivo |
|---|---|---|
| Gasto, CPM, CTR, leads de Meta | Graph API `act_<cuenta>/insights` (cuenta y por anuncio) | `panel-cliente/meta.ts` |
| Oportunidades y etapa | API del CRM, pipeline del cliente, paginadas | `panel-cliente/data.ts` |
| Etapa → tipo (calificado, agenda, no-show, venta, descarte) y precio del plan | configuración por cliente | `panel-cliente/config.ts` |
| Anuncio de cada oportunidad | UTM de contenido del CRM = nombre del anuncio en Meta | `panel-cliente/attribution.ts` |
| Ingresos | valor monetario de las oportunidades en etapas de venta | `panel-cliente/attribution.ts` |
| Llamadas, puntaje, closers | tablas `fathom_calls` y `client_closers` | `panel-cliente-v2/data.ts` |

## Detalles que costaron aprenderlos
- **Anuncios con el mismo nombre.** Se suman por nombre normalizado (sin espacios dobles ni mayúsculas) para no contar uno dos veces.
- **Campañas escritas distinto** (mayúsculas distintas) se unifican por clave en minúscula y se muestran con el nombre original.
- **«Corre hoy».** El estado «activo» no basta: un conjunto con fecha de término vencida sigue figurando activo. Se revisa también `end_time` (`codigo/src/lib/meta/estado-anuncios.ts`).
- **Link a la publicación.** Siempre la publicación pública del anuncio (con comentarios), nunca el enlace de vista previa de Meta.
- **Rango por defecto.** Ciclo de venta largo → sin rango explícito abre en histórico completo.
- **Si una fuente falla, el panel no cae**: cada lectura va envuelta en `safe(...)` y muestra «sin data».
- **Acceso.** Llave propia del cliente en `?k=`; el asistente de IA acepta esa llave en el encabezado `x-panel-key` o una sesión del equipo.

## Datos simulados del cockpit v2
`buildActionData` y `buildTrend` en `panel-cliente-v2/data.ts` generan valores de demostración (no vienen del CRM). Están marcados en el código; reemplázalos por consultas reales antes de mostrarlos a un cliente.

## Para adaptarlo a otro cliente
1. Duplica `panel-cliente/config.ts` con la cuenta de Meta, la ubicación y el pipeline del CRM de ese cliente, y el nombre y tipo de cada etapa.
2. Elige el cruce: por nombre del anuncio (si el CRM guarda el UTM de contenido) o por ID del anuncio (mejor).
3. Define la moneda de gasto, la de venta y la constante de conversión.
4. Crea su variable de llave. Las páginas del panel la leen directo del entorno (`app/panel/<cliente>*/page.tsx`); `clientes-infra/panel-access.ts` solo la usa para la ruta del asistente de IA y para armar enlaces. La llave va en `?k=` también en el cockpit v2.
