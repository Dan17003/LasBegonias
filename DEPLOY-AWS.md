# Despliegue económico de Las Begonias en AWS

Esta guía prepara el despliegue para una demostración temporal de tesis:

- React/Vite en un bucket S3 privado, servido por CloudFront.
- API Node.js en una instancia EC2 pequeña, detrás de Caddy con HTTPS.
- PostgreSQL en RDS, sin acceso público.
- Documentos clínicos en un bucket S3 privado, accesibles solamente mediante la API autenticada.

No se crean recursos automáticamente. Los nombres entre `<...>` son valores que debes reemplazar. No subas secretos, datos reales de pacientes ni archivos `.env` a GitHub.

## Antes de crear recursos: controlar costos

1. En la consola AWS, revisa **Billing and Cost Management → Credits** y confirma saldo, fecha de vencimiento y servicios elegibles. Los créditos y el Free Tier dependen de la cuenta; no asumas que cubren todos los servicios.
2. Crea un presupuesto de costo bajo con alertas por correo (por ejemplo, al 50 %, 80 % y 100 % del monto que estás dispuesta a gastar). Una alerta no detiene los recursos.
3. Usa una sola región para EC2, RDS y el bucket de documentos. CloudFront y su certificado de ACM son excepciones.
4. No asignes Elastic IP salvo que la necesites y hayas comprobado su costo. Una IPv4 pública y el almacenamiento de volúmenes o snapshots pueden generar cargos.
5. Para pausas de un mes, no dejes RDS simplemente detenido: AWS lo vuelve a iniciar tras siete días. La opción de ahorro es crear un snapshot, eliminar la instancia y restaurarla antes de la siguiente demostración. Snapshots y S3 siguen ocupando almacenamiento facturable.

## 1. Crear los buckets privados

Crea dos buckets S3 en la región elegida, con nombres globalmente únicos:

- `<BUCKET-FRONTEND>`: archivos de la aplicación.
- `<BUCKET-DOCUMENTOS>`: documentos clínicos.

En ambos, deja activado **Block all public access** y el cifrado predeterminado. No habilites el alojamiento de sitio web de S3.

En el bucket de documentos, no agregues una política pública. La API lee y escribe objetos a través del rol IAM de EC2. El cifrado SSE-S3 también lo solicita el backend al subir cada objeto.

## 2. Crear RDS PostgreSQL en red privada

1. Crea una instancia PostgreSQL en la misma región y VPC que usarás para EC2. Elige Single-AZ y la clase/almacenamiento más pequeños que la consola permita para tu cuenta.
2. No habilites acceso público. Guarda el endpoint, nombre de base de datos, usuario y contraseña en un gestor seguro.
3. Crea un security group para RDS. Su única entrada debe ser TCP `5432` desde el security group de EC2, no desde `0.0.0.0/0`.

## 3. Crear el rol IAM de EC2

Crea un rol de instancia EC2 (no guardes claves de acceso AWS en el código ni en `.env`). Adjunta una política limitada al bucket de documentos. Sustituye el nombre del bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<BUCKET-DOCUMENTOS>/documentos-clinicos/*"
    }
  ]
}
```

Asigna el rol a EC2 al crearla. El SDK de AWS usará automáticamente las credenciales temporales del rol.

## 4. Crear EC2 y configurar la red

1. Crea una instancia Ubuntu LTS pequeña en la misma VPC de RDS, en una subred pública con asignación de IPv4 pública, y asigna el rol IAM del paso anterior. La base RDS permanece sin IP pública.
2. En su security group permite:
   - SSH TCP `22` solo desde tu IP pública actual.
   - HTTP TCP `80` y HTTPS TCP `443` desde Internet, para que Caddy pueda emitir/renovar el certificado HTTPS y recibir tráfico de CloudFront.
3. Añade el security group de EC2 como origen permitido de la entrada PostgreSQL `5432` del security group de RDS.
4. Conéctate por SSH. Instala Git, Node.js 22 LTS, npm y Caddy siguiendo las [instrucciones oficiales de Node.js](https://nodejs.org/en/download/package-manager) y [Caddy para Ubuntu](https://caddyserver.com/docs/install#debian-ubuntu-raspbian). Comprueba `node --version` (debe ser 22 o una versión compatible con Vite 8) y `which node`.
5. Clona el repositorio en `/opt/lasbegonias` y ajusta permisos para que el usuario `ubuntu` pueda escribir en esa carpeta:

```bash
sudo mkdir -p /opt/lasbegonias
sudo chown ubuntu:ubuntu /opt/lasbegonias
git clone <URL-DEL-REPOSITORIO> /opt/lasbegonias
```

Usa una rama que contenga estos cambios. Si el repositorio es privado, configura acceso SSH/deploy key; no guardes contraseñas o tokens en la URL de Git.

## 5. Asignar un hostname HTTPS gratuito a la API

CloudFront debe conectarse al origen de API por HTTPS con un certificado válido. No uses la IP pública de EC2 como origen HTTPS ni configures CloudFront hacia EC2 por HTTP.

Si no tienes dominio, puedes usar un subdominio dinámico gratuito, por ejemplo DuckDNS:

1. Crea un hostname y token en el sitio de DuckDNS.
2. Configura la actualización del registro para que apunte a la IPv4 pública actual de EC2. En Ubuntu puedes guardar `DUCKDNS_DOMAIN` (solo el nombre, sin `.duckdns.org`) y `DUCKDNS_TOKEN` en `/etc/duckdns.conf` con permisos `600`, y crear `/usr/local/bin/update-duckdns.sh`:

```bash
#!/usr/bin/env bash
set -eu
. /etc/duckdns.conf
curl --fail --silent --show-error \
  "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip="
```

Protege ambos archivos (`sudo chown root:root /etc/duckdns.conf /usr/local/bin/update-duckdns.sh`, `sudo chmod 600 /etc/duckdns.conf`, `sudo chmod 700 /usr/local/bin/update-duckdns.sh`) y ejecuta el script para actualizar el DNS. Para renovarlo cada cinco minutos, agrega `*/5 * * * * /usr/local/bin/update-duckdns.sh >/dev/null 2>&1` con `sudo crontab -e`. No guardes el token en el repositorio ni lo imprimas en registros.
3. Copia `deploy/Caddyfile.example` a `/etc/caddy/Caddyfile` y reemplaza `api-demo.duckdns.org` por tu hostname.
4. Valida y reinicia Caddy (`sudo caddy validate --config /etc/caddy/Caddyfile` y `sudo systemctl reload caddy`). Caddy solicitará y renovará automáticamente un certificado de Let's Encrypt cuando DNS y puertos 80/443 estén listos.
5. Prueba `https://<API-HOSTNAME>/health`. Debe responder `{"status":"ok"}`.

Si detienes e inicias EC2, su IPv4 puede cambiar: actualiza DuckDNS y espera a que el DNS se propague. No publiques el token.

## 6. Configurar el backend

En EC2, instala el bundle CA oficial de RDS, instala dependencias de producción y crea un archivo privado de variables:

```bash
sudo curl --fail --location https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
  --output /etc/ssl/certs/rds-global-bundle.pem
sudo chmod 644 /etc/ssl/certs/rds-global-bundle.pem
cd /opt/lasbegonias/backend
npm ci --omit=dev
sudo mkdir -p /etc/lasbegonias
sudo nano /etc/lasbegonias/api.env
sudo chmod 600 /etc/lasbegonias/api.env
sudo chown ubuntu:ubuntu /etc/lasbegonias/api.env
```

Usa `backend/.env.example` como referencia, sin copiar valores vacíos. Configura al menos:

```dotenv
NODE_ENV=production
PORT=3000
DB_NAME=<NOMBRE-DB>
DB_USER=<USUARIO-DB>
DB_PASS=<CONTRASENA-DB>
DB_HOST=<ENDPOINT-RDS>
DB_PORT=5432
DB_SSL=true
DB_SSL_CA=/etc/ssl/certs/rds-global-bundle.pem
DOCUMENT_STORAGE=s3
AWS_REGION=<REGION>
S3_BUCKET=<BUCKET-DOCUMENTOS>
S3_PREFIX=documentos-clinicos
JWT_SECRET=<SECRETO-ALEATORIO-LARGO-Y-UNICO>
PUBLIC_BACKEND_URL=https://<API-HOSTNAME>
PUBLIC_FRONTEND_URL=https://<DOMINIO-CLOUDFRONT>
CORS_ORIGINS=https://<DOMINIO-CLOUDFRONT>
```

Genera un `JWT_SECRET` aleatorio de al menos 32 caracteres y configura las variables SMTP y de IA solo si vas a demostrar esas funciones. No reutilices contraseñas ni publiques el archivo.

Instala el servicio y ajusta `ExecStart` de `deploy/lasbegonias-api.service` al resultado de `which node`, si no es `/usr/bin/node`:

```bash
sudo cp /opt/lasbegonias/deploy/lasbegonias-api.service /etc/systemd/system/lasbegonias-api.service
sudo systemctl daemon-reload
sudo systemctl enable --now lasbegonias-api
sudo systemctl status lasbegonias-api
sudo journalctl -u lasbegonias-api -n 100 --no-pager
```

Revisa los registros ante cualquier fallo de conexión a RDS. El servicio crea/ajusta sus modelos al iniciar, tal como está implementado actualmente; haz primero un snapshot de RDS antes de actualizaciones importantes.

### Llevar la base de datos y documentos actuales

La aplicación no ofrece un registro público inicial para el personal. Para conservar el acceso administrativo, las cuentas y los datos de demostración existentes, migra una base PostgreSQL de prueba/anónima; no uses información identificable de pacientes reales en la tesis.

Desde Windows, crea un respaldo con `pg_dump` instalado y usando los datos de conexión de tu base local. Mantén abierta una sesión SSH que cree un túnel a RDS (sustituye los placeholders):

```powershell
ssh -i .\<CLAVE-EC2.pem> -L 5433:<ENDPOINT-RDS>:5432 ubuntu@<IP-O-HOSTNAME-EC2>
```

En otra ventana, crea el dump desde la base local y restáuralo a través del túnel en la base RDS vacía. `pg_dump`/`pg_restore` pedirán la contraseña con `-W`:

```powershell
pg_dump -h <HOST-LOCAL> -p <PUERTO-LOCAL> -U <USUARIO-LOCAL> -d <BASE-LOCAL> -Fc -f .\lasbegonias-demo.dump -W
pg_restore -h 127.0.0.1 -p 5433 -U <USUARIO-RDS> -d <BASE-RDS> --clean --if-exists --no-owner --no-acl -W .\lasbegonias-demo.dump
```

No compartas ni subas el dump: puede contener datos personales. Si no necesitas conservar registros y no existe una cuenta administrativa en RDS, detente antes de exponer la web y prepara una base de demostración con acceso de personal usando el flujo autorizado del sistema.

Para transferir documentos locales existentes, desde una terminal con AWS CLI autenticado con una identidad de despliegue (no el rol de la app) ejecuta:

```powershell
aws s3 sync .\backend\uploads\documentos-clinicos s3://<BUCKET-DOCUMENTOS>/documentos-clinicos/ --region <REGION>
```

El bucket sigue privado; la aplicación los entrega solo tras comprobar autorización.

## 7. Compilar y publicar React

En el repositorio local, usa Node.js 22 LTS:

```powershell
cd frontend
npm ci
$env:VITE_API_URL="/api"
npm run build
aws s3 sync .\dist s3://<BUCKET-FRONTEND>/ --delete --region <REGION>
```

`--delete` elimina del bucket archivos antiguos que no están en `dist`; confirma el bucket antes de ejecutar el comando. El frontend debe usar `/api`, para que el navegador se comunique con el mismo origen CloudFront y las llamadas a la API no requieran un endpoint HTTP público.

## 8. Configurar CloudFront y HTTPS público

1. Si usarás el dominio predeterminado `*.cloudfront.net`, no necesitas solicitar un certificado: CloudFront lo administra. Solo si tienes un dominio propio, solicita su certificado público en AWS Certificate Manager, región **us-east-1**, y completa la validación DNS.
2. Crea una distribución CloudFront:
   - Origen predeterminado: bucket S3 del frontend, seleccionando **Origin Access Control (OAC)** y acceso restringido.
   - Comportamiento predeterminado: redirección HTTP a HTTPS; métodos `GET`, `HEAD` y `OPTIONS`.
   - Añade un origen API con dominio `<API-HOSTNAME>` y protocolo del origen **HTTPS only**, puerto `443`.
   - Añade comportamiento `/api/*` hacia el origen API, HTTPS obligatorio, métodos `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`, política de caché **CachingDisabled** y política de solicitud de origen que reenvíe `Authorization`, cookies y query strings.
   - Habilita HTTPS para espectadores y configura `index.html` como objeto raíz.
3. Autoriza el acceso OAC de esa distribución al bucket del frontend cuando AWS lo solicite. No hagas público el bucket.
4. Copia el dominio asignado por CloudFront a `PUBLIC_FRONTEND_URL` y `CORS_ORIGINS` en `api.env`; reinicia el backend.
5. Verifica la web en `https://<DOMINIO-CLOUDFRONT>` y la API a través de la distribución. El health check directo del origen es `https://<API-HOSTNAME>/health`; la distribución enruta `/api/*` al backend.
6. Después de cada publicación, invalida `/*` en CloudFront si sigue mostrándose una versión en caché.

CloudFront→EC2 también va cifrado con HTTPS, protegido por un certificado válido en Caddy. S3 de documentos no se expone a los navegadores.

## 9. Apagar tras la sustentación y restaurar después

1. Guarda un snapshot final de RDS y espera a que termine. Confirma la región y el nombre del snapshot.
2. Anota de forma segura las variables y nombres de recursos necesarios (nunca en un repositorio público).
3. Elimina la instancia RDS después de verificar el snapshot; de lo contrario, AWS la reanudará al cabo de siete días.
4. Detén EC2. Para detener todos los cargos de cómputo, puedes eliminarla después de guardar cualquier dato/cambio necesario; sus volúmenes EBS y snapshots pueden seguir generando cargos.
5. Los buckets, objetos, snapshots, IP reservadas y la distribución CloudFront pueden seguir facturando mientras existan. Elimina lo que ya no necesites, tras descargar y verificar respaldos.
6. Para volver a usarlo, restaura RDS desde el snapshot, actualiza el endpoint en `api.env`, inicia EC2, actualiza el DNS dinámico si cambió la IP, verifica Caddy y reinicia `lasbegonias-api`.
7. Elimina la distribución CloudFront solo si ya no la usarás: la eliminación puede tardar. Revisa costos y recursos activos en Billing después de apagar.

Antes de cada demostración, comprueba el estado de los créditos y el presupuesto. Esta arquitectura reduce recursos, pero AWS no garantiza que el costo sea cero.
