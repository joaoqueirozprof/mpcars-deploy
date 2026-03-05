# GUIA DE DEPLOY — MPCARS na VPS Hostinger

## Passo a Passo Completo

---

## ETAPA 1: Preparar a VPS

### 1.1 Conectar via SSH

No seu computador, abra o terminal (PowerShell ou CMD) e conecte:

```bash
ssh root@SEU_IP_DA_VPS
```

Se pedir senha, use a senha que a Hostinger forneceu.

### 1.2 Atualizar o sistema

```bash
apt update && apt upgrade -y
```

### 1.3 Instalar Docker (se não tiver ou quiser uma instalação limpa)

```bash
# Remover versões antigas (se houver)
apt remove docker docker-engine docker.io containerd runc -y 2>/dev/null

# Instalar dependências
apt install -y ca-certificates curl gnupg lsb-release

# Adicionar chave do Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Adicionar repositório do Docker
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar
docker --version
docker compose version
```

### 1.4 Configurar Firewall

```bash
ufw allow OpenSSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 9000/tcp    # Portainer (gestão Docker)
ufw allow 8080/tcp    # pgAdmin (gestão banco)
ufw --force enable
ufw status
```

---

## ETAPA 2: Enviar o Projeto para a VPS

### 2.1 No seu computador (Windows), comprima a pasta:

Acesse a pasta `Projeto Marcelo/mpcars-web/` e comprima tudo em um ZIP.

### 2.2 Enviar para a VPS via SCP:

```bash
# No PowerShell do Windows:
scp mpcars-web.zip root@SEU_IP_DA_VPS:/root/
```

### 2.3 Na VPS, descomprimir:

```bash
cd /root
apt install unzip -y
unzip mpcars-web.zip -d /opt/mpcars
cd /opt/mpcars
```

**Alternativa com Git (recomendado):**

Se colocar o projeto no GitHub:
```bash
cd /opt
git clone https://github.com/SEU_USUARIO/mpcars-web.git mpcars
cd /opt/mpcars
```

---

## ETAPA 3: Configurar Variáveis de Ambiente

```bash
cd /opt/mpcars
cp .env.example .env
nano .env
```

Edite o arquivo `.env` com suas senhas:

```
DB_USER=mpcars
DB_PASSWORD=SuaSenhaForte2026!
POSTGRES_DB=mpcars
SECRET_KEY=gere-uma-chave-aleatoria-de-64-caracteres
PGADMIN_EMAIL=seu@email.com
PGADMIN_PASSWORD=SuaSenhaDoAdmin!
ENVIRONMENT=production
```

Para gerar uma SECRET_KEY segura:
```bash
openssl rand -hex 32
```

Salve e feche (Ctrl+O, Enter, Ctrl+X).

---

## ETAPA 4: Subir os Containers

```bash
cd /opt/mpcars

# Buildar e subir tudo
docker compose up -d --build

# Verificar se tudo está rodando
docker compose ps
```

Você deve ver todos os serviços como "running":
- mpcars-db (PostgreSQL)
- mpcars-redis
- mpcars-api (Backend FastAPI)
- mpcars-worker (Celery)
- mpcars-web (Frontend React)
- mpcars-proxy (Nginx)
- mpcars-portainer
- mpcars-pgadmin

### 4.1 Verificar logs se algo der errado:

```bash
# Ver logs de todos os serviços
docker compose logs

# Ver logs de um serviço específico
docker compose logs backend
docker compose logs postgres
docker compose logs frontend
```

---

## ETAPA 5: Criar as Tabelas no Banco

```bash
# Rodar as migrations do Alembic
docker compose exec backend alembic upgrade head
```

Se der erro no Alembic (primeira vez), crie a migration inicial:
```bash
docker compose exec backend alembic revision --autogenerate -m "initial"
docker compose exec backend alembic upgrade head
```

---

## ETAPA 6: Criar o Primeiro Usuário

Acesse a documentação da API no navegador:
```
http://SEU_IP_DA_VPS:8000/docs
```

Use o endpoint `POST /api/v1/auth/register` para criar o primeiro usuário admin:
```json
{
  "email": "admin@mpcars.com",
  "nome": "Administrador",
  "password": "suasenha123"
}
```

---

## ETAPA 7: Migrar Dados do SQLite

Se quiser migrar os dados do banco antigo:

### 7.1 Enviar o banco SQLite para a VPS:

```bash
# No Windows:
scp dados/mpcars.db root@SEU_IP_DA_VPS:/opt/mpcars/
```

### 7.2 Rodar o script de migração:

```bash
cd /opt/mpcars

# Instalar dependências do script
pip3 install psycopg2-binary

# Rodar migração
python3 scripts/migrate_sqlite_to_postgres.py \
  --sqlite-path ./mpcars.db \
  --postgres-url "postgresql://mpcars:SuaSenhaForte2026!@localhost:5432/mpcars"
```

---

## ETAPA 8: Acessar o Sistema

Após tudo rodando, acesse no navegador:

| Serviço | URL |
|---------|-----|
| **Sistema MPCARS** | `http://SEU_IP_DA_VPS` |
| **API (Swagger)** | `http://SEU_IP_DA_VPS:8000/docs` |
| **Portainer (Gestão Docker)** | `http://SEU_IP_DA_VPS:9000` |
| **pgAdmin (Gestão Banco)** | `http://SEU_IP_DA_VPS:8080` |

---

## ETAPA 9: Configurar Domínio (Opcional, mas recomendado)

### 9.1 Registrar um domínio

Registre em: registro.br (R$ 40/ano) ou Hostinger (incluído em alguns planos).

### 9.2 Apontar DNS para a VPS

No painel do registrador, crie um registro A:
```
Tipo: A
Nome: @ (ou mpcars)
Valor: SEU_IP_DA_VPS
TTL: 3600
```

### 9.3 Instalar SSL (HTTPS) com Certbot

```bash
# Instalar Certbot
apt install certbot -y

# Gerar certificado
certbot certonly --standalone -d seudominio.com.br

# Os certificados ficam em:
# /etc/letsencrypt/live/seudominio.com.br/fullchain.pem
# /etc/letsencrypt/live/seudominio.com.br/privkey.pem
```

Depois edite o `nginx/nginx.conf` para usar HTTPS (já tem comentários no arquivo mostrando onde).

### 9.4 Renovação automática do SSL

```bash
# Adicionar cron para renovar automaticamente
crontab -e
# Adicionar esta linha:
0 3 * * * certbot renew --quiet && docker compose -f /opt/mpcars/docker-compose.yml restart nginx
```

---

## ETAPA 10: Backup Automático do PostgreSQL

```bash
# Criar pasta de backups
mkdir -p /opt/mpcars/backups

# Criar script de backup
cat > /opt/mpcars/scripts/backup_postgres.sh << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/opt/mpcars/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker compose -f /opt/mpcars/docker-compose.yml exec -T postgres pg_dump -U mpcars mpcars > "$BACKUP_DIR/mpcars_$DATE.sql"
# Manter apenas últimos 30 backups
ls -t "$BACKUP_DIR"/mpcars_*.sql | tail -n +31 | xargs -r rm
echo "Backup criado: mpcars_$DATE.sql"
SCRIPT

chmod +x /opt/mpcars/scripts/backup_postgres.sh

# Agendar backup diário às 3h da manhã
crontab -e
# Adicionar:
0 3 * * * /opt/mpcars/scripts/backup_postgres.sh
```

---

## Comandos Úteis do Dia a Dia

```bash
# Ver status de todos os containers
docker compose ps

# Reiniciar tudo
docker compose restart

# Parar tudo
docker compose down

# Subir tudo
docker compose up -d

# Ver logs em tempo real
docker compose logs -f

# Ver logs de um serviço
docker compose logs -f backend

# Entrar no container do backend
docker compose exec backend bash

# Acessar o banco PostgreSQL diretamente
docker compose exec postgres psql -U mpcars mpcars

# Rebuild após alterações no código
docker compose up -d --build backend

# Verificar espaço em disco
df -h

# Ver uso de memória dos containers
docker stats
```

---

## Resolução de Problemas

**Container não sobe:**
```bash
docker compose logs NOME_DO_SERVICO
```

**Banco não conecta:**
```bash
docker compose exec postgres pg_isready -U mpcars
```

**Frontend mostra tela em branco:**
```bash
docker compose logs frontend
docker compose exec frontend ls /usr/share/nginx/html
```

**Sem espaço em disco:**
```bash
docker system prune -a  # CUIDADO: remove imagens não usadas
```

**Atualizar o sistema:**
```bash
cd /opt/mpcars
git pull  # se usar git
docker compose up -d --build
docker compose exec backend alembic upgrade head
```

---

*Guia gerado em 05/03/2026 — MPCARS v2.0 Deploy Guide*
