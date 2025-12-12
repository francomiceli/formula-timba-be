# Guía Técnica Completa: CI/CD con GitHub Actions y AWS EC2

## Índice
1. [Arquitectura General](#arquitectura-general)
2. [Creación de Instancia EC2](#creación-de-instancia-ec2)
3. [GitHub Actions y CI/CD](#github-actions-y-cicd)
4. [PM2 Process Manager](#pm2-process-manager)
5. [Nginx como Reverse Proxy](#nginx-como-reverse-proxy)
6. [SSL con Certbot](#ssl-con-certbot)
7. [Route 53 y DNS](#route-53-y-dns)

---

## Arquitectura General

### ¿Qué estamos construyendo?

```
[Usuario] → [Route 53 DNS] → [EC2 Instance]
                                    ↓
                    [Nginx (Reverse Proxy + SSL)]
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            [Frontend Vue.js]              [Backend Node.js]
            (archivos estáticos)           (PM2 Process)
            puerto 80/443                  puerto 3000
```

### Flujo de despliegue:

```
[Git Push] → [GitHub] → [GitHub Actions]
                              ↓
                    [SSH a EC2] → [Deploy]
                              ↓
                    [PM2 reinicia procesos]
```

---

## Creación de Instancia EC2

### 1. ¿Qué es EC2?

**EC2 (Elastic Compute Cloud)** es el servicio de servidores virtuales de AWS. Es como tener una computadora en la nube que puedes configurar y usar como servidor.

**Conceptos clave:**
- **Instancia**: Un servidor virtual individual
- **AMI (Amazon Machine Image)**: La plantilla del sistema operativo
- **Instance Type**: El tamaño/potencia del servidor (CPU, RAM)

### 2. Selección de AMI

**¿Por qué Ubuntu Server 22.04 LTS?**

- **LTS (Long Term Support)**: Soporte y actualizaciones de seguridad por 5 años
- **Ubuntu**: Gran comunidad, documentación extensa, compatible con la mayoría de herramientas
- **Server Edition**: Versión optimizada sin interfaz gráfica, consume menos recursos
- **22.04**: Versión estable y moderna con paquetes actualizados

**Alternativas:**
- Amazon Linux 2: Optimizada para AWS pero menos estándar
- Debian: Similar a Ubuntu, más minimalista
- CentOS/RHEL: Preferido en entornos empresariales tradicionales

### 3. Instance Type (t2.micro)

**Estructura del nombre: t2.micro**

- **t**: Familia "burstable" (rendimiento con picos)
- **2**: Generación
- **micro**: Tamaño (1 vCPU, 1 GB RAM)

**¿Qué significa "burstable"?**
- CPU funciona al 10% base
- Acumula "créditos" cuando está idle
- Puede usar hasta 100% CPU temporalmente usando créditos
- Ideal para aplicaciones con tráfico variable

**Para tu caso:**
- **Desarrollo/Testing**: t2.micro (Free Tier)
- **Producción pequeña**: t2.small (2 GB RAM)
- **Producción media**: t2.medium (4 GB RAM)
- **Tráfico alto**: t3.large o superior

### 4. Key Pair (Par de Claves SSH)

**¿Qué es SSH?**
SSH (Secure Shell) es un protocolo para conectarse de forma segura a servidores remotos.

**¿Cómo funciona el par de claves?**

```
Clave Privada (.pem en tu computadora)
         +
Clave Pública (instalada en EC2)
         =
Conexión Autenticada y Encriptada
```

**Proceso técnico:**
1. Generas un par de claves RSA (algoritmo criptográfico)
2. La clave pública se instala en el servidor
3. La clave privada la guardas en tu computadora
4. Al conectar, tu clave privada "prueba" que eres el dueño sin enviar contraseñas

**Formato .pem vs .ppk:**
- **.pem**: Formato estándar OpenSSH (Linux/Mac/Windows moderno)
- **.ppk**: Formato propietario de PuTTY (cliente SSH antiguo de Windows)

**¿Por qué es más seguro que contraseñas?**
- Las claves RSA 2048-bit son prácticamente imposibles de romper por fuerza bruta
- No se transmite información sensible en la red
- No hay contraseña que hackear o robar

### 5. Security Groups (Grupos de Seguridad)

**¿Qué son?**
Un firewall virtual que controla el tráfico de red hacia/desde tu instancia.

**Conceptos:**
- **Inbound Rules**: Tráfico que ENTRA a tu servidor
- **Outbound Rules**: Tráfico que SALE de tu servidor (por defecto: todo permitido)
- **Stateful**: Si permites entrada, la respuesta está automáticamente permitida

**Puertos explicados:**

```
Puerto 22 (SSH):
- Protocolo para conectarte al servidor
- Solo tu IP: Más seguro (nadie más puede intentar conectarse)
- 0.0.0.0/0: Cualquier IP puede intentar (menos seguro pero más flexible)

Puerto 80 (HTTP):
- Tráfico web no encriptado
- 0.0.0.0/0: Debe estar abierto al mundo para que usuarios accedan

Puerto 443 (HTTPS):
- Tráfico web encriptado (SSL/TLS)
- 0.0.0.0/0: Debe estar abierto al mundo

Puerto 3000 (Custom):
- Puerto donde corre tu backend Node.js
- Solo necesario durante desarrollo para pruebas directas
- En producción: Cerrar este puerto, acceso solo a través de Nginx
```

**CIDR Notation (0.0.0.0/0):**
- `0.0.0.0/0` = Todas las IPs del mundo
- `192.168.1.0/24` = Rango de IPs locales (192.168.1.1 a 192.168.1.254)
- `TU.IP.PUBLICA/32` = Solo tu IP específica

### 6. Storage (Almacenamiento)

**EBS (Elastic Block Store):**
Es un disco duro virtual para tu instancia.

**Tipos de volúmenes:**

```
gp3 (General Purpose SSD v3):
- Uso general, balanceado
- 3,000 IOPS base, 125 MB/s
- Mejor precio/rendimiento
- Recomendado: Aplicaciones web estándar

gp2 (General Purpose SSD v2):
- Versión anterior
- IOPS escalables con tamaño
- Más caro que gp3

io2 (Provisioned IOPS):
- Alto rendimiento
- Para bases de datos críticas
- Más caro

st1 (Throughput Optimized HDD):
- Para grandes volúmenes de datos secuenciales
- Más barato pero más lento
```

**¿Cuánto espacio necesitas?**
- Sistema operativo: ~4 GB
- Node.js + dependencias: ~2-4 GB
- Logs, archivos temporales: ~2 GB
- Tus aplicaciones: ~2-5 GB
- **Recomendado: 20-30 GB** para tener espacio cómodo

### 7. User Data (Script de Inicialización)

**¿Qué es?**
Un script que se ejecuta automáticamente la primera vez que se inicia la instancia.

**¿Por qué usarlo?**
- Automatiza la configuración inicial
- Reduce errores manuales
- Documentación ejecutable (el script es tu documentación)

**Desglose del script:**

```bash
#!/bin/bash
# Shebang: indica que es un script Bash

apt update && apt upgrade -y
# apt: Gestor de paquetes de Ubuntu/Debian
# update: Actualiza la lista de paquetes disponibles
# upgrade: Instala actualizaciones de paquetes
# -y: Responde "yes" automáticamente

curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
# curl: Descarga el script de instalación de NodeSource
# -fsSL: Flags para modo silencioso y seguir redirecciones
# | bash -: Ejecuta el script descargado
# NodeSource: Repositorio oficial de Node.js con versiones actualizadas

apt install -y nodejs
# Instala Node.js y npm desde el repositorio agregado

npm install -g pm2
# -g: Instalación global (disponible en todo el sistema)
# pm2: Process manager para mantener Node.js corriendo

mkdir -p /var/www/backend
# -p: Crea directorios padre si no existen
# /var/www: Convención estándar para aplicaciones web

chown -R ubuntu:ubuntu /var/www
# chown: Cambia el propietario
# -R: Recursivo (incluyendo subdirectorios)
# ubuntu:ubuntu: Usuario:Grupo
# Da permisos al usuario ubuntu para escribir en /var/www
```

### 8. Elastic IP

**Problema que resuelve:**
- Por defecto, cada vez que detienes/inicias una instancia, la IP pública cambia
- Esto rompe configuraciones DNS, conexiones, etc.

**¿Qué es una Elastic IP?**
- Una IP pública estática que posees
- Puedes asociarla/desasociarla de instancias
- Sobrevive a reinicios y reconfiguraciones

**Costos:**
- **Gratis** mientras esté asociada a una instancia en ejecución
- **Se cobra** si la reservas pero no la usas (para evitar acaparamiento)
- **Se cobra** por más de una Elastic IP por instancia

---

## GitHub Actions y CI/CD

### ¿Qué es CI/CD?

**CI (Continuous Integration):**
- **Integración continua**: Cada cambio se integra y prueba automáticamente
- Detecta errores temprano
- Mantiene el código siempre en estado funcional

**CD (Continuous Deployment):**
- **Despliegue continuo**: Código aprobado se despliega automáticamente
- Reduce tiempo entre desarrollo y producción
- Elimina pasos manuales propensos a errores

### GitHub Actions: Conceptos

**Workflow:**
Un archivo YAML que define un proceso automatizado.

**Trigger (on):**
El evento que inicia el workflow.

```yaml
on:
  push:
    branches: [ main ]
# Se ejecuta cada vez que haces push a la rama main
```

**Jobs:**
Conjunto de pasos que se ejecutan en una máquina virtual.

**Steps:**
Tareas individuales dentro de un job.

**Actions:**
Bloques de código reutilizables (como funciones).

### Desglose del Workflow de Backend

```yaml
name: Deploy Backend to EC2
# Nombre descriptivo que aparece en GitHub

on:
  push:
    branches: [ main ]
# Trigger: Se ejecuta en cada push a main

jobs:
  deploy:
    runs-on: ubuntu-latest
    # GitHub proporciona una máquina virtual con Ubuntu
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v3
      # Action oficial de GitHub
      # Clona tu repositorio en la VM
    
    - name: Deploy to EC2
      uses: appleboy/ssh-action@master
      # Action de terceros para conexiones SSH
      with:
        host: ${{ secrets.EC2_HOST }}
        # IP de tu EC2 (guardada como secreto)
        username: ${{ secrets.EC2_USER }}
        # Usuario SSH (ubuntu)
        key: ${{ secrets.EC2_SSH_KEY }}
        # Clave privada SSH (contenido del .pem)
        script: |
          # Comandos que se ejecutan en tu EC2
          cd /var/www/backend
          git pull origin main
          # Descarga últimos cambios
          npm install
          # Instala/actualiza dependencias
          pm2 restart backend
          # Reinicia la aplicación sin downtime
```

### Desglose del Workflow de Frontend

```yaml
- name: Build
  run: |
    npm install
    npm run build
  # Se ejecuta en la VM de GitHub (NO en tu EC2)
  # Compila tu Vue.js a HTML/CSS/JS estáticos
  # Genera carpeta /dist con archivos optimizados

- name: Deploy to EC2
  uses: appleboy/scp-action@master
  # SCP: Secure Copy Protocol (copia archivos por SSH)
  with:
    source: "dist/*"
    # Archivos compilados
    target: "/var/www/frontend"
    # Destino en EC2
```

**¿Por qué compilar en GitHub y no en EC2?**
- GitHub tiene más recursos (más CPU, RAM)
- Reduce carga en tu servidor de producción
- Proceso más rápido
- Tu EC2 solo sirve archivos, no compila

### GitHub Secrets

**¿Qué son?**
Variables encriptadas que GitHub almacena de forma segura.

**¿Por qué usarlos?**
- No expones credenciales en el código
- Pueden ser compartidos entre workflows
- Son específicos por repositorio

**Cómo agregarlos:**
1. Repositorio → Settings → Secrets and variables → Actions
2. New repository secret
3. Name: `EC2_HOST`, Value: `3.45.67.89`

**Variables necesarias:**

```
EC2_HOST:
- IP pública de tu EC2
- Ejemplo: 54.123.45.67

EC2_USER:
- Usuario SSH del servidor
- Ubuntu: "ubuntu"
- Amazon Linux: "ec2-user"

EC2_SSH_KEY:
- Contenido COMPLETO del archivo .pem
- Incluye: -----BEGIN RSA PRIVATE KEY-----
           ... (todo el contenido) ...
           -----END RSA PRIVATE KEY-----
```

---

## PM2 Process Manager

### ¿Qué problema resuelve PM2?

**Sin PM2:**
```bash
node server.js
# Si cierras la terminal, la app se detiene
# Si hay un error, la app se cae
# Sin logs centralizados
# No puedes gestionar múltiples apps fácilmente
```

**Con PM2:**
```bash
pm2 start server.js
# Corre en background
# Se reinicia automáticamente si hay errores
# Logs organizados
# Gestión de múltiples procesos
# Monitoreo de recursos
```

### Características técnicas

**1. Daemon Process:**
PM2 corre como un proceso daemon (background permanente) que supervisa tus aplicaciones.

**2. Cluster Mode:**
```bash
pm2 start server.js -i max
# -i max: Crea un proceso por núcleo de CPU
# Load balancing automático
# Aprovecha todos los cores del servidor
```

**3. Restart Strategies:**

```javascript
// Restart en 0 downtime
pm2 reload app
// Inicia nuevas instancias antes de matar las viejas

// Restart con downtime mínimo
pm2 restart app
// Mata instancias y las reinicia
```

**4. Logs:**
```bash
pm2 logs
# Muestra logs en tiempo real de todas las apps

pm2 logs backend
# Logs de una app específica

# Los logs se guardan en:
~/.pm2/logs/backend-out.log  # stdout
~/.pm2/logs/backend-error.log  # stderr
```

**5. Startup Script:**
```bash
pm2 startup
# Genera un script para que PM2 inicie automáticamente al arrancar el servidor
# El script se registra en systemd (gestor de servicios de Linux)

pm2 save
# Guarda la configuración actual de procesos
# Al reiniciar el servidor, PM2 restaura esta configuración
```

### Ecosystem File (Configuración avanzada)

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'backend',
    script: './server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm Z',
    max_memory_restart: '500M',
    // Reinicia si consume más de 500MB
    watch: false,
    // No recargar en cambios de archivos (para prod)
    ignore_watch: ['node_modules', 'logs'],
    min_uptime: '10s',
    // Considera "arrancado" después de 10s
    max_restarts: 10
    // Máximo 10 reinicios en 1 minuto antes de parar
  }]
};

// Usar: pm2 start ecosystem.config.js
```

---

## Nginx como Reverse Proxy

### ¿Qué es un Reverse Proxy?

**Flujo sin Reverse Proxy:**
```
Usuario → http://54.123.45.67:3000 → Node.js
         (expone puerto, IP, sin SSL)
```

**Flujo con Reverse Proxy:**
```
Usuario → https://api.tudominio.com → Nginx → Node.js
         (dominio amigable, SSL, puerto oculto)
```

### Ventajas de usar Nginx

**1. Seguridad:**
- Oculta la estructura interna de tu aplicación
- Filtra requests maliciosos
- Maneja SSL/TLS (encriptación)
- Protección contra DDoS básico

**2. Rendimiento:**
- Sirve archivos estáticos muy rápido (más que Node.js)
- Compresión gzip/brotli automática
- Caching de contenido
- HTTP/2 support

**3. Flexibilidad:**
- Balancea carga entre múltiples backends
- Redirecciones y rewrites
- Rate limiting
- Múltiples aplicaciones en un servidor

**4. Gestión SSL:**
- Centraliza certificados SSL
- Renovación automática con Certbot
- Tu app no maneja SSL (simplifica código)

### Desglose de la Configuración

```nginx
server {
    listen 80;
    # Escucha en puerto 80 (HTTP estándar)
    
    server_name api.tudominio.com;
    # Dominio que atiende este bloque server
    
    location / {
        # Para todas las rutas (/)
        
        proxy_pass http://localhost:3000;
        # Redirige a tu app Node.js en puerto 3000
        
        proxy_http_version 1.1;
        # Usa HTTP/1.1 (necesario para WebSockets)
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        # Headers para WebSockets
        
        proxy_set_header Host $host;
        # Preserva el Host header original
        
        proxy_cache_bypass $http_upgrade;
        # No cachea requests con Upgrade header
        
        proxy_set_header X-Real-IP $remote_addr;
        # IP real del cliente (no la de Nginx)
        
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # Cadena de IPs si hay múltiples proxies
        
        proxy_set_header X-Forwarded-Proto $scheme;
        # Protocolo original (http/https)
        # Tu app sabe si la petición original era HTTPS
    }
}
```

### Configuración para Frontend (SPA)

```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    
    root /var/www/frontend/dist;
    # Directorio con archivos estáticos compilados
    
    index index.html;
    # Archivo por defecto
    
    location / {
        try_files $uri $uri/ /index.html;
        # Intenta servir el archivo solicitado
        # Si no existe, intenta como directorio
        # Si no existe, sirve index.html (para Vue Router)
    }
}
```

**¿Por qué `try_files $uri $uri/ /index.html`?**

Vue.js con Vue Router usa modo "history":
- URL amigables: `/productos/123` en lugar de `/#/productos/123`
- Estas rutas no son archivos reales en el servidor
- Nginx las devolvería como 404

Con `try_files`:
1. Usuario pide `/productos/123`
2. Nginx busca archivo `productos/123` → No existe
3. Nginx busca directorio `productos/123/` → No existe
4. Nginx sirve `index.html`
5. Vue Router carga y procesa la ruta `/productos/123`

### Estructura de directorios de Nginx

```
/etc/nginx/
├── nginx.conf              # Configuración principal
├── sites-available/        # Configs disponibles
│   ├── default
│   └── tu-sitio            # Tu configuración
├── sites-enabled/          # Configs activas (symlinks)
│   └── tu-sitio -> ../sites-available/tu-sitio
└── conf.d/                 # Configs adicionales
```

**Sites-available vs Sites-enabled:**
- **sites-available**: Todas las configuraciones (activas o no)
- **sites-enabled**: Solo symlinks a configs activas
- Ventaja: Puedes tener configs preparadas y activarlas/desactivarlas fácilmente

```bash
# Activar sitio
sudo ln -s /etc/nginx/sites-available/tu-sitio /etc/nginx/sites-enabled/

# Desactivar sitio
sudo rm /etc/nginx/sites-enabled/tu-sitio
```

### Comandos útiles de Nginx

```bash
# Probar configuración (detecta errores de sintaxis)
sudo nginx -t

# Recargar configuración (sin downtime)
sudo systemctl reload nginx

# Reiniciar Nginx (con downtime mínimo)
sudo systemctl restart nginx

# Ver status
sudo systemctl status nginx

# Ver logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## SSL con Certbot

### ¿Qué es SSL/TLS?

**SSL (Secure Sockets Layer) / TLS (Transport Layer Security):**
Protocolo que encripta la comunicación entre navegador y servidor.

**Sin SSL (HTTP):**
```
Usuario → [Datos en texto plano] → Servidor
         ↑
    Cualquiera puede leer: contraseñas, datos personales, etc.
```

**Con SSL (HTTPS):**
```
Usuario → [Datos encriptados] → Servidor
         ↑
    Solo usuario y servidor pueden desencriptar
```

### ¿Qué es Let's Encrypt?

- **Autoridad Certificadora (CA)** gratuita
- Proporciona certificados SSL sin costo
- Certificados válidos por 90 días (renovación automática)
- Respaldado por grandes organizaciones (Mozilla, Google, Facebook)

### ¿Qué es Certbot?

**Certbot** es el cliente oficial de Let's Encrypt:
- Automatiza la obtención de certificados
- Configura automáticamente Nginx
- Programa renovación automática

### Proceso técnico de obtención de certificado

**Desafío ACME (Automated Certificate Management Environment):**

```
1. Certbot solicita certificado para tudominio.com
   ↓
2. Let's Encrypt desafía: "Prueba que controlas ese dominio"
   ↓
3. Certbot coloca archivo especial en:
   tudominio.com/.well-known/acme-challenge/TOKEN
   ↓
4. Let's Encrypt verifica que puede acceder al archivo
   ↓
5. Si verifica correctamente, emite certificado
```

**Tipos de desafío:**
- **HTTP-01**: Coloca archivo en servidor web (el que usamos)
- **DNS-01**: Agrega registro TXT en DNS (para wildcards)
- **TLS-ALPN-01**: Validación mediante TLS

### Instalación y uso de Certbot

```bash
# Instalar Certbot con plugin de Nginx
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

**¿Qué hace `--nginx`?**
1. Lee tu configuración de Nginx
2. Obtiene certificado de Let's Encrypt
3. Modifica automáticamente tu configuración
4. Añade redirección HTTP → HTTPS
5. Configura SSL headers

**Resultado en configuración:**

```nginx
server {
    listen 80;
    server_name tudominio.com;
    
    # Certbot añade redirección automática
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tudominio.com;
    
    # Certbot añade estas líneas
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Tu configuración continúa...
}
```

### Renovación automática

```bash
# Probar renovación (modo dry-run)
sudo certbot renew --dry-run

# Certbot instala automáticamente un cron job:
/etc/cron.d/certbot
```

**Contenido del cron job:**
```
0 */12 * * * root certbot renew --quiet
# Se ejecuta cada 12 horas
# Renueva certificados que expiran en menos de 30 días
```

### Estructura de archivos SSL

```
/etc/letsencrypt/
├── live/
│   └── tudominio.com/
│       ├── fullchain.pem    # Certificado completo (+ intermedios)
│       ├── privkey.pem      # Clave privada
│       ├── cert.pem         # Solo tu certificado
│       └── chain.pem        # Certificados intermedios
├── archive/                 # Versiones anteriores
└── renewal/                 # Configs de renovación
```

### Seguridad SSL

**Headers de seguridad que Certbot configura:**

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
# Solo versiones seguras de TLS

ssl_ciphers 'ECDHE-RSA-AES128-GCM-SHA256:...';
# Algoritmos de encriptación permitidos

ssl_prefer_server_ciphers on;
# Servidor elige el algoritmo más seguro

ssl_session_cache shared:SSL:10m;
# Cachea sesiones SSL (mejora rendimiento)

ssl_stapling on;
ssl_stapling_verify on;
# OCSP Stapling (verifica revocación de certificados)
```

---

## Route 53 y DNS

### ¿Qué es DNS?

**DNS (Domain Name System):**
Sistema que traduce nombres de dominio a direcciones IP.

```
tudominio.com → 54.123.45.67
```

**Sin DNS:**
```
Tendrías que recordar: http://54.123.45.67
```

**Con DNS:**
```
Recuerdas: https://tudominio.com
```

### Jerarquía DNS

```
.                          (Root)
└── .com                   (TLD - Top Level Domain)
    └── tudominio.com      (Domain)
        └── api.tudominio.com (Subdomain)
```

### ¿Qué es Route 53?

Servicio de DNS de AWS que:
- Traduce dominios a IPs
- Enruta tráfico (routing policies)
- Gestiona health checks
- Integra con otros servicios AWS

**¿Por qué "53"?**
Puerto 53 es el puerto estándar para DNS.

### Conceptos DNS

**1. Hosted Zone:**
Contenedor para registros DNS de un dominio.

```
Hosted Zone: tudominio.com
├── A Record: tudominio.com → 54.123.45.67
├── A Record: www → 54.123.45.67
├── A Record: api → 54.123.45.67
└── NS Records: (nameservers)
```

**2. Tipos de registros DNS:**

```
A Record:
- Mapea dominio a IPv4
- tudominio.com → 54.123.45.67

AAAA Record:
- Mapea dominio a IPv6
- tudominio.com → 2001:0db8:85a3::8a2e:0370:7334

CNAME Record:
- Alias de un dominio a otro
- www.tudominio.com → tudominio.com
- Limitación: No puede usarse en dominio raíz

NS Record:
- Nameservers que controlan el dominio
- Apuntan a servidores DNS de Route 53

MX Record:
- Servidores de email
- tudominio.com → mail.tudominio.com

TXT Record:
- Texto arbitrario
- Usos: Verificación, SPF (email), DKIM
```

**3. TTL (Time To Live):**
```
A Record: tudominio.com → 54.123.45.67 [TTL: 300]
```

- TTL = 300 segundos (5 minutos)
- Servidores DNS cachean el registro por 5 minutos
- Cambias IP: Puede tardar hasta 5 minutos en propagarse globalmente

**TTL bajo (60-300s):**
- Propagación rápida de cambios
- Más queries DNS (más costo en Route 53)

**TTL alto (3600-86400s):**
- Mejor rendimiento (menos queries)
- Cambios tardan más en propagarse

### Nameservers

**¿Qué son?**
Servidores que contienen los registros DNS de tu dominio.

**Flujo de resolución DNS:**

```
1. Usuario escribe: tudominio.com
   ↓
2. Navegador pregunta a DNS Resolver
   ↓
3. DNS Resolver pregunta a Root