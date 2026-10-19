# Auditoría de privacidad y seguridad del Asistente IA odontológico

**Alcance:** revisión del flujo `POST /api/odontologo/ai/chat`, su pantalla, autenticación, autorización, carga del contexto clínico y configuración de transporte. Esta revisión técnica no constituye una certificación ni una opinión legal.

## 1. Arquitectura de privacidad

```text
Odontólogo
  ↓ HTTPS en despliegue productivo
Frontend (no contiene la API key)
  ↓ JWT
Backend
  ↓ valida rol odontólogo
  ↓ comprueba relación Usuario → Odontólogo → cita con odontologo_id o atención clínica
  ↓ consulta solo las secciones relevantes a la pregunta
  ↓ elimina IDs internos y redacta identificadores detectables
Proveedor IA configurado (HTTPS obligatorio fuera de desarrollo local)
```

El selector usa `GET /api/odontologo/ai/pacientes`, que solo devuelve el ID interno necesario para seleccionar (uso backend/frontend) y nombres/apellidos para mostrar al usuario; no devuelve DNI ni contacto. El frontend envía al backend `patientId`, la pregunta y hasta 12 mensajes previos temporales. `patientId` se usa solo para localizar y autorizar al paciente en el backend; no se incluye en el cuerpo enviado al proveedor. El servidor reenvía como máximo los dos últimos mensajes y solo cuando la pregunta actual necesita resolver una referencia ambigua (por ejemplo, “¿eso influye?”); para preguntas independientes no reenvía historial. El cambio de paciente inicia una conversación nueva en el navegador. El backend no persiste chats ni respuestas.

La consulta clínica se realiza en el servidor. El clasificador selecciona secciones por términos de la pregunta; las consultas de base de datos se ejecutan solo para esas secciones. Una pregunta específica sobre alergias no carga odontograma, planes, atenciones ni citas. Un resumen explícito de historia clínica sí puede cargar las secciones clínicas resumibles.

## 2. Datos enviados al proveedor

Además de la pregunta y la conversación temporal, se envía únicamente el contexto de las secciones detectadas como pertinentes. Cada fila se proyecta mediante una lista de campos permitidos; no se serializa el objeto completo de Sequelize.

| Dato | ¿Se envía? | Condición y motivo |
|---|---|---|
| Motivo de consulta (`motivo`, `motivo_tipo`, `motivo_descripcion`) | Sí, condicional | Cuando la pregunta menciona el motivo; también en un resumen de historia. |
| Antecedentes médicos (`antecedentes_medicos`, `antecedentes_medicos_otros`, `embarazo`, `antecedentes`) | Sí, condicional | Cuando pregunta por antecedentes, enfermedades o factores de salud; también en un resumen. |
| Alergias (`sustancia`, `reaccion`, `severidad`) | Sí, condicional | Preguntas sobre alergias o reacciones; también en un resumen. |
| Medicamentos (`nombre`, `dosis`, `frecuencia`, `via`, `indicaciones`, `activo`) | Sí, condicional | Preguntas sobre medicamentos; también en un resumen. |
| Antecedentes odontológicos (`tipo`, `descripcion`, `fecha`) | Sí, condicional | Preguntas odontológicas específicas o resumen. |
| Examen extraoral/intraoral y exámenes (`examen_extraoral`, `examen_intraoral`, `examenes`) | Sí, condicional | Si se preguntan exámenes/hallazgos o en un resumen. |
| Odontograma (`pieza`, `estado`, `notas`) | Sí, condicional | Preguntas sobre piezas o odontograma; también en un resumen. |
| Periodontograma (`pieza`, `sitio`, `profundidad_sondaje`, `nivel_insercion`, `sangrado`, `movilidad`, `furcacion`, `notas`) | Sí, condicional | Preguntas periodontales; también en un resumen. |
| Diagnósticos (`codigo`, `descripcion`, `tipo`, `estado`, `notas`) | Sí, condicional | Preguntas diagnósticas o resumen. Se presentan como registros, no como diagnóstico generado por IA. |
| Planes de tratamiento (`titulo`, `descripcion`, `estado`, `prioridad`, `fecha_inicio`, `fecha_fin`) | Sí, condicional | Preguntas sobre tratamiento/pendientes o resumen. |
| Atenciones (`fecha`, motivo, antecedentes, evaluación, hallazgos, diagnóstico, procedimiento, tratamiento, evolución, indicaciones, próxima cita, observaciones) | Sí, condicional | Preguntas sobre consultas, evolución o atenciones; máximo las 5 más recientes. |
| Procedimientos (`pieza`, `codigo`, `descripcion`, `fecha`, `observaciones`) | Sí, condicional | Preguntas sobre procedimientos o resumen; máximo 20 registros. |
| Citas futuras (`fecha`, `hora_inicio`, `motivo`, `servicio`, `estado`) | Sí, solo si se pregunta por citas | Máximo 5; no se envían por defecto ni en el resumen clínico. |
| Edad | Sí, solo si se pregunta por edad | Se calcula en el backend; no se envía la fecha de nacimiento. |
| Sexo | Sí, solo si se pregunta por sexo | Dato clínico/demográfico, excluido de forma predeterminada. |
| Pregunta del odontólogo | Sí | Necesaria para generar la respuesta. Se eliminan el DNI de 8 dígitos, teléfonos/correos detectables y datos de contacto/nombre del paciente seleccionado cuando se reconocen. |
| Hasta 2 mensajes previos de la conversación | Sí, solo para preguntas de seguimiento ambiguas | Memoria temporal para referencias; se aplica la misma redacción detectable. No se confían como fuente clínica. Las preguntas independientes no reenvían historial. |
| Modelo solicitado | Sí, como metadato del protocolo | Se configura con `AI_MODEL`; el proveedor lo necesita para procesar la solicitud. |
| API key | Sí, solo en cabecera `Authorization` de transporte | Credencial necesaria para autenticar la llamada HTTPS al proveedor. No forma parte del prompt ni del contenido clínico. |

Los campos vacíos/no existentes de una sección consultada se representan como `null` o lista vacía. Una sección no incluida significa que no se consultó para esa pregunta; el prompt exige no presentarla como dato inexistente.

### Datos excluidos del prompt/contexto

No se consultan ni se proyectan nombre/apellidos, DNI, fecha de nacimiento completa, teléfono, correo, dirección, identificador de paciente, identificador de odontólogo, IDs de citas/atenciones/registros, usuario que creó/actualizó, marcas de auditoría, tokens, JWT, contraseñas, información de autenticación, pagos, presupuestos, deudas, notas financieras, datos de otros pacientes, información administrativa del odontólogo, consentimientos/documentos ni archivos.

La fecha/hora/motivo/servicio/estado de citas futuras solo se incluyen ante una pregunta explícita sobre citas. Las fechas clínicas de atenciones/procedimientos pueden ser necesarias para responder preguntas de seguimiento longitudinal.

### Límites de la redacción

El backend elimina el nombre, apellidos, DNI, teléfono y correo del paciente seleccionado cuando aparecen literalmente; también redacta formatos detectables de correo, DNI de 8 dígitos, teléfono peruano, JWT, prefijos conocidos de API keys, IDs de paciente etiquetados y valores etiquetados como DNI/contacto/dirección/fecha de nacimiento/credencial. Los campos JSONB excluyen claves con nombres de identificador, contacto, usuario, autor o marca temporal.

Esto **no equivale a anonimización certificada**. No es posible detectar de forma fiable todos los nombres de terceros, domicilios escritos en texto libre, identificadores no estándar o datos indirectamente identificables dentro de narrativas clínicas, ni cualquier identificador que el odontólogo escriba con un formato no reconocido. El proveedor puede recibir datos clínicos sensibles y fechas/detalles clínicos incluso después de esta reducción. Se requiere evaluación legal/organizacional antes de datos reales.

## 3. Medidas de seguridad existentes tras la auditoría

- **Autenticación:** JWT firmado/verificado con `JWT_SECRET` de entorno, sin secreto hardcodeado. Se exige un secreto único de al menos 32 caracteres. No se ofrece un valor por defecto.
- **RBAC backend:** `auth` + `requireOdontologist` en la ruta. No autenticado: `401`; otro rol, incluido administración/recepción/paciente: `403`.
- **Rol vigente:** antes de obtener el contexto, el backend confirma en la base que la cuenta del JWT siga activa y conserve el rol `odontologo`; un JWT con rol antiguo no basta para el chat.
- **Acceso al paciente:** perfil `Odontologo` asociado al usuario autenticado y cita con `odontologo_id` coincidente o atención con `odontologo_id` coincidente. No se autoriza por igualdad del nombre del doctor. La lista de “Mis pacientes” usa las mismas relaciones por ID.
- **Minimización:** clasificación temática y cargas diferidas por sección; campos de salida allowlist sin IDs internos; citas, edad y sexo solo por solicitud explícita.
- **Sugerencias clínicas:** al preguntar por opciones de procedimientos se consultan hallazgos odontológicos y antecedentes pertinentes, sin crear ni modificar atenciones, planes o solicitudes. La IA debe presentar alternativas para valoración profesional, justificar su relación con datos registrados y señalar hallazgos o evaluaciones pendientes; no debe emitir un diagnóstico ni indicar un tratamiento como definitivo.
- **Respuestas del proveedor:** se admite texto de `choices[0].message.content` en formato string o bloques de texto. Las respuestas vacías se presentan como un error controlado para reintentar; se registra solo el motivo técnico general, nunca el contenido clínico ni el cuerpo de error arbitrario del proveedor.
- **Separación del prompt:** instrucciones fijas del sistema separadas del contexto clínico y de la pregunta. Los datos clínicos y el historial se declaran contenido no confiable, no instrucciones. No se aceptan cambios clínicos desde el chat.
- **API key:** leída solo en backend desde entorno; no se incluye en React, respuesta HTTP, prompt ni logs. Los errores del proveedor registran estado/proveedor genérico, no URL, cuerpo, conversación ni credencial. Las respuestas de error al frontend son controladas.
- **Transporte backend → proveedor:** HTTPS requerido salvo HTTP local cuando `NODE_ENV=development`; se rechazan redirecciones para evitar exponer cabeceras a destinos alternativos.
- **Transporte frontend → backend:** en producción el cliente usa `/api` del mismo origen por defecto y rechaza URL API HTTP configurada. Un despliegue debe servir la aplicación por HTTPS y enrutar `/api` al backend sobre una conexión protegida.
- **CORS:** se restringe por `CORS_ORIGINS`; en producción sin orígenes configurados no se permite acceso cross-origin. En desarrollo local se permite `http://localhost:5173`.
- **No persistencia:** no existe tabla, archivo ni almacenamiento permanente de conversación/respuesta en esta implementación.
- **Caché HTTP:** las respuestas de las rutas IA llevan `Cache-Control: no-store`.

### Archivos de historia clínica

Los consentimientos, radiografías y otros documentos adjuntos se guardan en el directorio privado `backend/uploads/documentos-clinicos`, fuera del acceso estático público y excluido de Git. La descarga requiere autenticación y acceso odontológico vigente al paciente. Se aceptan PDF, JPG, PNG y WebP de hasta 12 MB; el servidor comprueba la firma del contenido y no confía únicamente en la extensión o el MIME declarado. La previsualización se limita al navegador del usuario autorizado.

Este almacenamiento local requiere un volumen persistente y protegido en despliegues, permisos restrictivos, copias de seguridad cifradas, retención definida y protección antimalware adecuada para el entorno. No despliegues en una plataforma con disco efímero ni expongas esa carpeta públicamente; la autenticación de la aplicación no sustituye el cifrado del almacenamiento ni las políticas de custodia clínica.

Las citas históricas que solo tengan el texto `doctor` y no tengan `odontologo_id` ya no habilitan acceso clínico al chat ni aparecen en “Mis pacientes”. Esta decisión evita autorizar por un nombre modificable o no único; la clínica debe revisar y corregir las relaciones históricas por un procedimiento administrativo separado, no mediante el chatbot.

## 4. API key y secretos

`.env` está excluido por `.gitignore` y `backend/.env` no está versionado. `.env.example` contiene nombres de variables, no credenciales reales. Las búsquedas en el código del chatbot no encontraron una API key literal. `AI_API_KEY` aparece únicamente como lectura de variable de entorno y en el ejemplo vacío.

Configurar fuera del repositorio:

- `JWT_SECRET`: valor criptográficamente aleatorio, exclusivo de esta aplicación y con 32 caracteres o más. Ejemplo de generación local: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
- `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`: endpoint, credencial y modelo autorizados por la organización.
- `CORS_ORIGINS`: origen(es) HTTPS reales de la aplicación, separados por coma, sin rutas ni barras finales.
- `VITE_API_URL`: `/api` si frontend y backend comparten origen; de lo contrario una URL HTTPS del backend.
- `PUBLIC_BACKEND_URL`: URL HTTPS pública en producción; la aplicación la usa para enlaces generados en comunicaciones de citas.
- `NODE_ENV=production` en el despliegue productivo; el modo local HTTP del proveedor solo se permite en `development`.

Al sustituir el antiguo secreto JWT hardcodeado, los tokens firmados con el secreto anterior dejan de validarse. Tras configurar `JWT_SECRET`, los usuarios deben iniciar sesión de nuevo. No reutilizar el texto `"secreto"`.

## 5. Proveedor IA: configuración y decisiones pendientes

El código implementa un protocolo compatible con **Chat Completions**. `.env.example` muestra como ejemplo el endpoint público de OpenAI. En el entorno local revisado para esta auditoría no estaban configurados `AI_API_URL`, `AI_MODEL` ni `AI_API_KEY`, así que actualmente no hay proveedor habilitado y no se realizó ninguna llamada real. Esto no demuestra qué proveedor se configurará en el despliegue; la organización debe confirmarlo sin publicar la clave.

Antes de producción, obtener y documentar del proveedor seleccionado:

- política contractual aplicable a datos de salud y tratamiento de datos;
- si la solicitud/respuesta se guarda, por cuánto tiempo y con qué opción de retención;
- si se usa para entrenamiento o mejora de modelos y cómo desactivarlo;
- región/país de procesamiento, subencargados y transferencias internacionales;
- controles de eliminación, acceso, cifrado, incidentes y acuerdos de procesamiento;
- versión exacta del modelo, cambios de política y evaluación de riesgo del proveedor.

No se afirma ni se presume que las solicitudes no se retengan o no se usen para entrenamiento.

## 6. Logs, auditoría y pruebas

El código del chat no registra prompts, contexto, diagnósticos, alergias, medicamentos, respuestas, IDs de paciente, JWT ni API keys. Solo registra errores técnicos controlados (estado HTTP/proveedor genérico o tipo de fallo). No hay un sistema persistente de auditoría de consultas IA que vincule usuario, instante y paciente; la implementación tampoco guarda el contenido de conversación. La clínica debe decidir si necesita un registro mínimo de acceso (usuario, instante y referencia protegida al paciente), su finalidad, retención y responsables, sin conservar el texto clínico.

Las pruebas del endpoint deben usar únicamente fixtures ficticios, por ejemplo:

```json
{
  "testRecord": "FICTICIO-TEST-001",
  "edad": 35,
  "motivo": "dolor dental",
  "alergias": [],
  "antecedentesMedicos": { "registro": "hipertensión (dato ficticio)" }
}
```

`FICTICIO-TEST-001` es una etiqueta local de fixture y **no se envía al proveedor**. No probar con historias reales si no es necesario y sin aprobación institucional.

## 7. Consideraciones legales y organizacionales pendientes

Referencias que deben revisarse en su versión vigente con asesoría legal y responsables clínicos/de privacidad:

- Ley N.° 29733, Ley de Protección de Datos Personales: [texto del Congreso](https://www.leyes.congreso.gob.pe/Documentos/Leyes/29733.pdf).
- Decreto Supremo N.° 016-2024-JUS, nuevo Reglamento de la Ley N.° 29733: [búsqueda en el portal oficial del Estado](https://www.gob.pe/busquedas?term=Decreto%20Supremo%20016-2024-JUS).
- Ley N.° 29414, derechos de las personas usuarias de los servicios de salud: [texto del Congreso](https://www.leyes.congreso.gob.pe/Documentos/Leyes/29414.pdf).
- Norma técnica aplicable a gestión de historias clínicas del MINSA (incluida NTS N.° 139-MINSA/2018/DGAIN y sus actualizaciones, si corresponde): [normas del MINSA](https://www.gob.pe/institucion/minsa/normas-legales).

La clínica debe determinar y documentar, con asesoría competente, la base que habilita el tratamiento y comunicación de datos de salud a un proveedor externo, información/transparencia al paciente, consentimiento o excepción aplicable, encargo de tratamiento, transferencias internacionales, retención, ejercicio de derechos, atención de incidentes y requisitos de custodia de historias clínicas. La autenticación y minimización técnicas no bastan por sí solas para afirmar cumplimiento legal.

## 8. Riesgos residuales / no resueltos por código

1. El proveedor puede procesar datos clínicos sensibles y no se conoce su retención, entrenamiento, ubicación ni contrato hasta revisar la cuenta/política efectivamente configurada.
2. La redacción automática es heurística; texto clínico libre puede contener identificadores indirectos no detectados.
3. La conversación temporal y la pregunta son controladas por el navegador y reenviadas por el backend. No hay almacenamiento durable ni verificación criptográfica de turnos; no se deben copiar historias de terceros al chat.
4. No existe limitación de frecuencia/cuota por odontólogo; configurar controles del proveedor y evaluar límites operativos antes de producción.
5. No hay auditoría durable específica del uso IA. Definir si hace falta sin guardar el contenido clínico.
6. `CORS_ORIGINS`, `NODE_ENV=production`, `JWT_SECRET`, `PUBLIC_BACKEND_URL`, dominio HTTPS, terminación TLS y proxy `/api` dependen del despliegue y deben verificarse.
7. El JWT permanece en `localStorage` en el patrón actual del frontend; una vulnerabilidad XSS podría exponerlo. Se requiere defensa XSS/CSP en el despliegue y evaluar una sesión con cookie `HttpOnly`, `Secure` y `SameSite`.
8. No se ha hecho una evaluación legal, de impacto de privacidad, prueba de penetración ni validación clínica del proveedor/modelo.
