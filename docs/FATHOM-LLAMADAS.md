# Llamadas de venta · de la grabación al puntaje

## Flujo
1. **Closers registrados.** Tabla `client_closers`: nombre, correo con el que graba en Fathom, país, rol (`closer`, `owner`, `sdr`).
2. **Webhook de Fathom** (`/api/fathom/webhook`): verifica la firma (`x-fathom-signature` con `FATHOM_WEBHOOK_SECRET`), busca quién es el anfitrión por su correo y, si es un closer activo, crea la fila en `fathom_calls`. Si el anfitrión no está registrado, la llamada se ignora (así no entran reuniones internas).
3. **Proceso** (`/api/fathom/process`, protegido con secreto interno): obtiene la transcripción (del propio webhook o desde la API de Fathom), la puntúa con IA y busca en el CRM el contacto y la oportunidad por correo del prospecto.
4. **Puntaje** (`features/fathom-scoring/`): el modelo recibe la transcripción más dos listas del cliente (`fathom_config`: gatillos de compra y objeciones conocidas) y devuelve un JSON: `score` 0-100, `outcome` (`ganada`, `perdida`, `no-show`, `pendiente`), plan cotizado, gatillo de llegada y de cierre, objeción principal, % de habla del closer, número de preguntas, minuto en que se mencionó el precio, casos mencionados, silencios y una recomendación accionable. Regla fija: si no hay evidencia, devuelve `null` y lo explica; no inventa citas.
5. **Panel.** El cockpit v2 lee `fathom_calls` y construye el ranking, las objeciones y las alertas.

## Qué hace valiosa la metodología
- La IA no «opina» de la llamada: llena **campos medibles** (habla, preguntas, minuto del precio, silencios) y los compara contra **listas del propio cliente** (sus gatillos y objeciones reales).
- Cada llamada queda atada a su oportunidad del CRM, así se puede cruzar **puntaje de la llamada ↔ si compró ↔ de qué anuncio vino**.

## Variante sin Fathom
Si el cliente usa Google Workspace, Google Meet puede transcribir la llamada por defecto. Esa transcripción puede entrar al mismo flujo (pasos 3 a 5) con un adaptador nuevo que reemplace al webhook de Fathom. Ese adaptador no existe aún en el kit.

## Seguridad
- El webhook valida firma antes de tocar la base; `process` exige secreto interno.
- Las tablas tienen RLS: solo administradores leen desde el navegador; el panel lee con la clave de servicio desde el servidor.
- La transcripción contiene datos personales del prospecto: no se copia a canales abiertos.
