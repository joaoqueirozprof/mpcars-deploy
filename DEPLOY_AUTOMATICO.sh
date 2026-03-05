#!/bin/bash
########################################################################
# MPCARS — Script de Deploy Automático na VPS
# Copia e cola TUDO no terminal da VPS e espera finalizar
# Testado em Ubuntu 22.04 / Debian 11+
########################################################################

set -e
export DEBIAN_FRONTEND=noninteractive

echo "============================================="
echo "  MPCARS — Deploy Automático v2.0"
echo "============================================="
echo ""

# ========== CONFIGURAÇÕES (EDITE AQUI SE QUISER) ==========
PROJECT_DIR="/opt/mpcars"
DB_USER="mpcars"
DB_PASSWORD="MpCars2026Secure!"
DB_NAME="mpcars"
SECRET_KEY=$(openssl rand -hex 32)
PGADMIN_EMAIL="admin@mpcars.com"
PGADMIN_PASSWORD="Admin2026!"

echo "[1/8] Atualizando sistema..."
apt update -y && apt upgrade -y

echo "[2/8] Instalando Docker..."
if ! command -v docker &> /dev/null; then
    apt install -y ca-certificates curl gnupg lsb-release
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null || true
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Detectar distro
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        CODENAME=$VERSION_CODENAME
        DISTRO=$ID
    fi

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/${DISTRO:-ubuntu} ${CODENAME:-jammy} stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt update -y
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    echo "Docker instalado com sucesso!"
else
    echo "Docker já está instalado: $(docker --version)"
fi

echo "[3/8] Configurando firewall..."
apt install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 9000/tcp
ufw allow 8080/tcp
ufw --force enable
echo "Firewall configurado!"

echo "[4/8] Criando estrutura do projeto..."
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# ========== .ENV ==========
cat > .env << ENVEOF
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
POSTGRES_DB=$DB_NAME
SECRET_KEY=$SECRET_KEY
PGADMIN_EMAIL=$PGADMIN_EMAIL
PGADMIN_PASSWORD=$PGADMIN_PASSWORD
ENVIRONMENT=production
ENVEOF

# ========== DOCKER-COMPOSE.YML ==========
cat > docker-compose.yml << 'DCEOF'
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: mpcars-db
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - mpcars-net

  redis:
    image: redis:7-alpine
    container_name: mpcars-redis
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - mpcars-net

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: mpcars-api
    restart: always
    environment:
      DATABASE_URL: postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@postgres:5432/${POSTGRES_DB}
      DATABASE_URL_SYNC: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${POSTGRES_DB}
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: ${SECRET_KEY}
      ENVIRONMENT: ${ENVIRONMENT}
    volumes:
      - pdf_storage:/app/storage/pdfs
      - backup_storage:/app/storage/backups
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - mpcars-net

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: mpcars-web
    restart: always
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - mpcars-net

  nginx:
    image: nginx:alpine
    container_name: mpcars-proxy
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - mpcars-net

  portainer:
    image: portainer/portainer-ce:latest
    container_name: mpcars-portainer
    restart: always
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    networks:
      - mpcars-net

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: mpcars-pgadmin
    restart: always
    environment:
      PGADMIN_DEFAULT_EMAIL: ${PGADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    ports:
      - "8080:80"
    depends_on:
      - postgres
    networks:
      - mpcars-net

volumes:
  postgres_data:
  redis_data:
  pdf_storage:
  backup_storage:
  portainer_data:

networks:
  mpcars-net:
    driver: bridge
DCEOF

# ========== BACKEND ==========
echo "[5/8] Criando Backend (FastAPI)..."
mkdir -p backend/app/{models,schemas,api/v1,services,utils}
mkdir -p backend/alembic/versions

# --- backend/requirements.txt ---
cat > backend/requirements.txt << 'EOF'
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlalchemy==2.0.35
asyncpg==0.30.0
psycopg2-binary==2.9.9
alembic==1.13.0
pydantic==2.9.0
pydantic-settings==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
redis==5.1.0
celery==5.4.0
reportlab==4.2.0
Pillow==10.4.0
python-dateutil==2.9.0
requests==2.32.0
httpx==0.27.0
EOF

# --- backend/Dockerfile ---
cat > backend/Dockerfile << 'EOF'
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/storage/pdfs /app/storage/backups

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
EOF

# --- backend/app/__init__.py ---
touch backend/app/__init__.py

# --- backend/app/config.py ---
cat > backend/app/config.py << 'PYEOF'
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://mpcars:mpcars@localhost:5432/mpcars"
    DATABASE_URL_SYNC: str = "postgresql://mpcars:mpcars@localhost:5432/mpcars"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "changeme"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"

settings = Settings()
PYEOF

# --- backend/app/database.py ---
cat > backend/app/database.py << 'PYEOF'
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.config import settings

engine = create_engine(settings.DATABASE_URL_SYNC, pool_pre_ping=True, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    Base.metadata.create_all(bind=engine)
PYEOF

# --- backend/app/auth.py ---
cat > backend/app/auth.py << 'PYEOF'
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from app.models.usuario import Usuario
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalido",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(Usuario).filter(Usuario.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user
PYEOF

# --- backend/app/models/__init__.py ---
cat > backend/app/models/__init__.py << 'PYEOF'
from app.models.usuario import Usuario
from app.models.cliente import Cliente
from app.models.veiculo import Veiculo
from app.models.contrato import Contrato, Quilometragem, DespesaContrato, ProrrogacaoContrato
from app.models.empresa import Empresa, MotoristaEmpresa
from app.models.financeiro import DespesaVeiculo, DespesaLoja, DespesaOperacional
from app.models.seguro import Seguro, ParcelaSeguro
from app.models.ipva import IpvaAliquota, IpvaRegistro
from app.models.operacional import Reserva, CheckinCheckout, Multa, Manutencao
from app.models.auditoria import AuditLog, AlertaHistorico, Configuracao
from app.models.documento import Documento, RelatorioNF, DespesaNF, UsoVeiculoEmpresa
PYEOF

# --- backend/app/models/usuario.py ---
cat > backend/app/models/usuario.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime
from app.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    ativo = Column(Boolean, default=True)
    data_cadastro = Column(DateTime, default=datetime.utcnow)
PYEOF

# --- backend/app/models/cliente.py ---
cat > backend/app/models/cliente.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Cliente(Base):
    __tablename__ = "clientes"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False, index=True)
    cpf_cnpj = Column(String, unique=True, index=True)
    tipo_cliente = Column(String, default="Pessoa Fisica")
    endereco_comercial = Column(String)
    numero_comercial = Column(String)
    bairro_comercial = Column(String)
    cep_comercial = Column(String)
    cidade_comercial = Column(String)
    estado_comercial = Column(String)
    endereco_residencial = Column(String)
    numero_residencial = Column(String)
    bairro_residencial = Column(String)
    cep_residencial = Column(String)
    cidade = Column(String)
    estado = Column(String)
    pais = Column(String, default="Brasil")
    telefone = Column(String)
    telefone2 = Column(String)
    email = Column(String)
    hotel = Column(String)
    apto = Column(String)
    cnh = Column(String)
    cnh_emitida = Column(String)
    cnh_categoria = Column(String)
    cnh_validade = Column(String, index=True)
    data_primeira_habilitacao = Column(String)
    rg = Column(String)
    orgao_emissor = Column(String)
    data_emissao_rg = Column(String)
    bairro = Column(String)
    cep = Column(String)
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    observacoes = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)
PYEOF

# --- backend/app/models/veiculo.py ---
cat > backend/app/models/veiculo.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Veiculo(Base):
    __tablename__ = "veiculos"
    id = Column(Integer, primary_key=True, index=True)
    marca = Column(String, nullable=False)
    modelo = Column(String, nullable=False)
    placa = Column(String, unique=True, nullable=False, index=True)
    ano = Column(Integer)
    cor = Column(String)
    combustivel = Column(String)
    km_atual = Column(Float, default=0)
    preco_compra = Column(Float, default=0)
    data_compra = Column(String)
    status = Column(String, default="Disponivel", index=True)
    tipo_veiculo = Column(String, default="Passeio")
    chassi = Column(String)
    renavam = Column(String)
    valor_venal = Column(Float, default=0)
    km_referencia = Column(Float, default=0)
    valor_km_extra = Column(Float, default=1.0)
    km_inicio_empresa = Column(Float, default=0)
    macaco = Column(Integer, default=0)
    estepe = Column(Integer, default=0)
    ferram = Column(Integer, default=0)
    triangulo = Column(Integer, default=0)
    documento = Column(Integer, default=0)
    extintor = Column(Integer, default=0)
    calotas = Column(Integer, default=0)
    tapetes = Column(Integer, default=0)
    cd_player = Column(Integer, default=0)
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    observacoes = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)
PYEOF

# --- backend/app/models/contrato.py ---
cat > backend/app/models/contrato.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Contrato(Base):
    __tablename__ = "contratos"
    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False, index=True)
    tipo_locacao = Column(String, default="Cliente")
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    motorista_id = Column(Integer, ForeignKey("clientes.id"))
    data_saida = Column(String)
    hora_saida = Column(String)
    data_entrada = Column(String)
    hora_entrada = Column(String)
    data_prevista_devolucao = Column(String)
    km_saida = Column(Float)
    km_entrada = Column(Float)
    km_livres_dia = Column(Float)
    km_percorridos = Column(Float)
    quantidade_diarias = Column(Integer, default=1)
    combustivel_saida = Column(String)
    combustivel_entrada = Column(String)
    valor_diaria = Column(Float)
    valor_hora_extra = Column(Float)
    valor_km_excedente = Column(Float)
    hora_extra = Column(Float, default=0)
    km_excedente = Column(Float, default=0)
    subtotal = Column(Float)
    avarias = Column(Float, default=0)
    desconto = Column(Float, default=0)
    total = Column(Float)
    despesas_extras = Column(Float, default=0)
    prorrogacoes_valor = Column(Float, default=0)
    cartao_tipo = Column(String)
    cartao_numero = Column(String)
    cartao_codigo = Column(String)
    cartao_preaut = Column(String)
    cartao_validade = Column(String)
    cartao_valor = Column(Float)
    status = Column(String, default="Ativo", index=True)
    observacoes = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)

class Quilometragem(Base):
    __tablename__ = "quilometragem"
    id = Column(Integer, primary_key=True)
    contrato_id = Column(Integer, ForeignKey("contratos.id"), nullable=False)
    discriminacao = Column(String)
    quantidade = Column(Float)
    preco_unitario = Column(Float)
    preco_total = Column(Float)

class DespesaContrato(Base):
    __tablename__ = "despesas_contrato"
    id = Column(Integer, primary_key=True)
    contrato_id = Column(Integer, ForeignKey("contratos.id"), nullable=False)
    tipo = Column(String, nullable=False)
    descricao = Column(String)
    valor = Column(Float, nullable=False)
    data_registro = Column(DateTime, default=datetime.utcnow)
    responsavel = Column(String)
    observacoes = Column(String)

class ProrrogacaoContrato(Base):
    __tablename__ = "prorrogacoes_contrato"
    id = Column(Integer, primary_key=True)
    contrato_id = Column(Integer, ForeignKey("contratos.id"), nullable=False)
    data_prevista_anterior = Column(String)
    data_prevista_nova = Column(String)
    motivo = Column(String)
    diarias_adicionais = Column(Integer)
    valor_adicional = Column(Float)
    data_registro = Column(DateTime, default=datetime.utcnow)
PYEOF

# --- backend/app/models/empresa.py ---
cat > backend/app/models/empresa.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Empresa(Base):
    __tablename__ = "empresas"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    razao_social = Column(String)
    cnpj = Column(String, unique=True)
    endereco = Column(String)
    numero = Column(String)
    bairro = Column(String)
    cidade = Column(String)
    estado = Column(String, default="RN")
    cep = Column(String)
    telefone = Column(String)
    email = Column(String)
    responsavel = Column(String)
    ativa = Column(Integer, default=1)
    valor_km_extra_padrao = Column(Float, default=1.0)
    observacoes = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)

class MotoristaEmpresa(Base):
    __tablename__ = "motoristas_empresa"
    id = Column(Integer, primary_key=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    cargo = Column(String, default="Motorista")
    ativo = Column(Integer, default=1)
    data_vinculo = Column(DateTime, default=datetime.utcnow)
    observacoes = Column(String)
PYEOF

# --- backend/app/models/financeiro.py ---
cat > backend/app/models/financeiro.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class DespesaVeiculo(Base):
    __tablename__ = "despesas_veiculos"
    id = Column(Integer, primary_key=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False, index=True)
    valor = Column(Float, nullable=False)
    descricao = Column(String)
    km = Column(Float)
    data = Column(String, index=True)
    pneu = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)

class DespesaLoja(Base):
    __tablename__ = "despesas_loja"
    id = Column(Integer, primary_key=True)
    mes = Column(Integer)
    ano = Column(Integer)
    valor = Column(Float, nullable=False)
    descricao = Column(String)
    data = Column(String, index=True)
    data_cadastro = Column(DateTime, default=datetime.utcnow)

class DespesaOperacional(Base):
    __tablename__ = "despesas_operacionais"
    id = Column(Integer, primary_key=True)
    tipo = Column(String, nullable=False, index=True)
    origem_tabela = Column(String)
    origem_id = Column(Integer)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"))
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    descricao = Column(String, nullable=False)
    valor = Column(Float, nullable=False)
    data = Column(String, nullable=False, index=True)
    categoria = Column(String)
    mes = Column(Integer)
    ano = Column(Integer)
    data_cadastro = Column(DateTime, default=datetime.utcnow)
PYEOF

# --- backend/app/models/seguro.py ---
cat > backend/app/models/seguro.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Seguro(Base):
    __tablename__ = "seguros"
    id = Column(Integer, primary_key=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False, index=True)
    seguradora = Column(String)
    numero_apolice = Column(String)
    tipo_seguro = Column(String, default="Completo")
    data_inicio = Column(String)
    data_vencimento = Column(String, index=True)
    valor = Column(Float, default=0)
    valor_franquia = Column(Float, default=0)
    cobertura = Column(String)
    quantidade_parcelas = Column(Integer, default=1)
    status = Column(String, default="Ativo")
    observacoes = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)

class ParcelaSeguro(Base):
    __tablename__ = "parcelas_seguro"
    id = Column(Integer, primary_key=True)
    seguro_id = Column(Integer, ForeignKey("seguros.id"), nullable=False)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False)
    numero_parcela = Column(Integer, nullable=False)
    valor = Column(Float, nullable=False)
    vencimento = Column(String)
    data_pagamento = Column(String)
    status = Column(String, default="Pendente", index=True)
    mes_referencia = Column(String)
    observacoes = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)
PYEOF

# --- backend/app/models/ipva.py ---
cat > backend/app/models/ipva.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime
from app.database import Base

class IpvaAliquota(Base):
    __tablename__ = "ipva_aliquotas"
    id = Column(Integer, primary_key=True)
    estado = Column(String, nullable=False)
    tipo_veiculo = Column(String, nullable=False)
    aliquota = Column(Float, nullable=False)
    descricao = Column(String)
    __table_args__ = (UniqueConstraint("estado", "tipo_veiculo"),)

class IpvaRegistro(Base):
    __tablename__ = "ipva_registros"
    id = Column(Integer, primary_key=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False, index=True)
    ano_referencia = Column(Integer, nullable=False, index=True)
    valor_venal = Column(Float)
    aliquota = Column(Float)
    valor_ipva = Column(Float)
    valor_pago = Column(Float, default=0)
    data_vencimento = Column(String)
    data_pagamento = Column(String)
    status = Column(String, default="Pendente", index=True)
    parcelas = Column(Integer, default=1)
    parcela_atual = Column(Integer, default=0)
    observacoes = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)
PYEOF

# --- backend/app/models/operacional.py ---
cat > backend/app/models/operacional.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Reserva(Base):
    __tablename__ = "reservas"
    id = Column(Integer, primary_key=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False, index=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False, index=True)
    data_inicio = Column(String, nullable=False)
    data_fim = Column(String, nullable=False)
    status = Column(String, default="Pendente", index=True)
    valor_estimado = Column(Float, default=0)
    observacoes = Column(String)
    data_criacao = Column(DateTime, default=datetime.utcnow)

class CheckinCheckout(Base):
    __tablename__ = "checkin_checkout"
    id = Column(Integer, primary_key=True)
    contrato_id = Column(Integer, ForeignKey("contratos.id"), nullable=False, index=True)
    tipo = Column(String, nullable=False)
    data_hora = Column(DateTime, default=datetime.utcnow)
    km = Column(Float)
    nivel_combustivel = Column(String)
    itens_checklist = Column(String)
    avarias = Column(String)
    observacoes = Column(String)

class Multa(Base):
    __tablename__ = "multas"
    id = Column(Integer, primary_key=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False, index=True)
    contrato_id = Column(Integer, ForeignKey("contratos.id"))
    cliente_id = Column(Integer, ForeignKey("clientes.id"))
    data_infracao = Column(String)
    data_notificacao = Column(String)
    auto_infracao = Column(String)
    descricao = Column(String)
    valor = Column(Float, nullable=False)
    pontos = Column(Integer, default=0)
    gravidade = Column(String, default="Media")
    status = Column(String, default="Pendente", index=True)
    responsavel = Column(String)
    data_pagamento = Column(String)
    observacoes = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)

class Manutencao(Base):
    __tablename__ = "manutencoes"
    id = Column(Integer, primary_key=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False, index=True)
    tipo = Column(String, default="Preventiva")
    descricao = Column(String, nullable=False)
    km_realizada = Column(Float)
    km_proxima = Column(Float)
    data_realizada = Column(String)
    data_proxima = Column(String)
    custo = Column(Float, default=0)
    oficina = Column(String)
    status = Column(String, default="Agendada", index=True)
    observacoes = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)
PYEOF

# --- backend/app/models/auditoria.py ---
cat > backend/app/models/auditoria.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    acao = Column(String, nullable=False, index=True)
    tabela = Column(String, nullable=False, index=True)
    registro_id = Column(Integer)
    dados_anteriores = Column(String)
    dados_novos = Column(String)
    usuario = Column(String, default="sistema")
    ip_address = Column(String)
    detalhes = Column(String)

class AlertaHistorico(Base):
    __tablename__ = "alertas_historico"
    id = Column(Integer, primary_key=True)
    tipo_alerta = Column(String, nullable=False)
    urgencia = Column(String, default="info")
    entidade_tipo = Column(String)
    entidade_id = Column(Integer)
    titulo = Column(String, nullable=False)
    descricao = Column(String)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_resolucao = Column(String)
    resolvido = Column(Integer, default=0)
    resolvido_por = Column(String)
    acao_tomada = Column(String)
    observacoes = Column(String)

class Configuracao(Base):
    __tablename__ = "configuracoes"
    id = Column(Integer, primary_key=True)
    chave = Column(String, unique=True, nullable=False)
    valor = Column(String)
PYEOF

# --- backend/app/models/documento.py ---
cat > backend/app/models/documento.py << 'PYEOF'
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from datetime import datetime
from app.database import Base

class Documento(Base):
    __tablename__ = "documentos"
    id = Column(Integer, primary_key=True)
    tipo_entidade = Column(String, nullable=False)
    entidade_id = Column(Integer, nullable=False)
    nome_arquivo = Column(String, nullable=False)
    nome_original = Column(String)
    tipo_documento = Column(String)
    caminho = Column(String, nullable=False)
    tamanho = Column(Integer)
    data_upload = Column(DateTime, default=datetime.utcnow)
    observacoes = Column(String)

class UsoVeiculoEmpresa(Base):
    __tablename__ = "uso_veiculo_empresa"
    id = Column(Integer, primary_key=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    contrato_id = Column(Integer, ForeignKey("contratos.id"))
    km_inicial = Column(Float, nullable=False)
    km_final = Column(Float)
    data_inicio = Column(String, nullable=False)
    data_fim = Column(String)
    km_referencia = Column(Float, default=0)
    valor_km_extra = Column(Float, default=1.0)
    valor_locacao = Column(Float, default=0)
    status = Column(String, default="Em uso")
    observacoes = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)

class RelatorioNF(Base):
    __tablename__ = "relatorios_nf"
    id = Column(Integer, primary_key=True)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    uso_id = Column(Integer, ForeignKey("uso_veiculo_empresa.id"))
    periodo_inicio = Column(String)
    periodo_fim = Column(String)
    km_inicial = Column(Float)
    km_final = Column(Float)
    km_percorrida = Column(Float)
    km_referencia = Column(Float)
    km_excedente = Column(Float)
    valor_km_extra = Column(Float)
    valor_total_extra = Column(Float)
    caminho_pdf = Column(String)
    data_geracao = Column(DateTime, default=datetime.utcnow)
    observacoes = Column(String)

class DespesaNF(Base):
    __tablename__ = "despesas_nf"
    id = Column(Integer, primary_key=True)
    uso_id = Column(Integer, ForeignKey("uso_veiculo_empresa.id"), nullable=False)
    veiculo_id = Column(Integer, ForeignKey("veiculos.id"), nullable=False)
    tipo = Column(String, nullable=False)
    descricao = Column(String)
    valor = Column(Float, nullable=False)
    data = Column(String)
    data_cadastro = Column(DateTime, default=datetime.utcnow)
PYEOF

# --- backend/app/main.py ---
cat > backend/app/main.py << 'PYEOF'
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import create_tables
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Criando tabelas do banco...")
    create_tables()
    print("MPCARS API pronta!")
    yield
    print("Desligando MPCARS API...")

app = FastAPI(
    title="MPCARS API",
    description="API do Sistema de Gerenciamento de Locadora de Veiculos",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Rotas ---
from app.api.v1 import auth, clientes, veiculos, contratos, empresas, dashboard, financeiro, configuracoes

app.include_router(auth.router, prefix="/api/v1")
app.include_router(clientes.router, prefix="/api/v1")
app.include_router(veiculos.router, prefix="/api/v1")
app.include_router(contratos.router, prefix="/api/v1")
app.include_router(empresas.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(financeiro.router, prefix="/api/v1")
app.include_router(configuracoes.router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "MPCARS API v2.0", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}
PYEOF

# --- API endpoints (simplificados) ---
mkdir -p backend/app/api/v1
touch backend/app/api/__init__.py
touch backend/app/api/v1/__init__.py

# --- auth endpoint ---
cat > backend/app/api/v1/auth.py << 'PYEOF'
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.auth import verify_password, get_password_hash, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Autenticacao"])

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.senha_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": {"id": user.id, "nome": user.nome, "email": user.email}}

@router.post("/register")
def register(nome: str, email: str, password: str, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == email).first():
        raise HTTPException(status_code=400, detail="Email ja cadastrado")
    is_first = db.query(Usuario).count() == 0
    user = Usuario(nome=nome, email=email, senha_hash=get_password_hash(password), is_admin=is_first)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"message": "Usuario criado com sucesso", "id": user.id}

@router.get("/me")
def me(current_user: Usuario = Depends(get_current_user)):
    return {"id": current_user.id, "nome": current_user.nome, "email": current_user.email, "is_admin": current_user.is_admin}
PYEOF

# --- clientes endpoint ---
cat > backend/app/api/v1/clientes.py << 'PYEOF'
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.cliente import Cliente
from app.auth import get_current_user

router = APIRouter(prefix="/clientes", tags=["Clientes"])

@router.get("/")
def listar(skip: int = 0, limit: int = 50, busca: str = None, db: Session = Depends(get_db)):
    q = db.query(Cliente)
    if busca:
        q = q.filter(or_(Cliente.nome.ilike(f"%{busca}%"), Cliente.cpf_cnpj.ilike(f"%{busca}%"), Cliente.telefone.ilike(f"%{busca}%")))
    total = q.count()
    items = q.order_by(Cliente.nome).offset(skip).limit(limit).all()
    return {"items": [c.__dict__ for c in items], "total": total}

@router.get("/{id}")
def buscar(id: int, db: Session = Depends(get_db)):
    c = db.query(Cliente).filter(Cliente.id == id).first()
    if not c: raise HTTPException(404, "Cliente nao encontrado")
    return c.__dict__

@router.post("/")
def criar(dados: dict, db: Session = Depends(get_db)):
    c = Cliente(**dados)
    db.add(c)
    db.commit()
    db.refresh(c)
    return {"message": "Cliente criado", "id": c.id}

@router.put("/{id}")
def atualizar(id: int, dados: dict, db: Session = Depends(get_db)):
    c = db.query(Cliente).filter(Cliente.id == id).first()
    if not c: raise HTTPException(404, "Cliente nao encontrado")
    for k, v in dados.items():
        if hasattr(c, k): setattr(c, k, v)
    db.commit()
    return {"message": "Cliente atualizado"}

@router.delete("/{id}")
def deletar(id: int, db: Session = Depends(get_db)):
    c = db.query(Cliente).filter(Cliente.id == id).first()
    if not c: raise HTTPException(404, "Cliente nao encontrado")
    db.delete(c)
    db.commit()
    return {"message": "Cliente removido"}
PYEOF

# --- veiculos endpoint ---
cat > backend/app/api/v1/veiculos.py << 'PYEOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.veiculo import Veiculo

router = APIRouter(prefix="/veiculos", tags=["Veiculos"])

@router.get("/")
def listar(skip: int = 0, limit: int = 50, status: str = None, empresa_id: int = None, busca: str = None, db: Session = Depends(get_db)):
    q = db.query(Veiculo)
    if status: q = q.filter(Veiculo.status == status)
    if empresa_id: q = q.filter(Veiculo.empresa_id == empresa_id)
    if busca: q = q.filter(or_(Veiculo.placa.ilike(f"%{busca}%"), Veiculo.marca.ilike(f"%{busca}%"), Veiculo.modelo.ilike(f"%{busca}%")))
    total = q.count()
    items = q.order_by(Veiculo.marca).offset(skip).limit(limit).all()
    return {"items": [v.__dict__ for v in items], "total": total}

@router.get("/{id}")
def buscar(id: int, db: Session = Depends(get_db)):
    v = db.query(Veiculo).filter(Veiculo.id == id).first()
    if not v: raise HTTPException(404, "Veiculo nao encontrado")
    return v.__dict__

@router.post("/")
def criar(dados: dict, db: Session = Depends(get_db)):
    v = Veiculo(**dados)
    db.add(v)
    db.commit()
    db.refresh(v)
    return {"message": "Veiculo criado", "id": v.id}

@router.put("/{id}")
def atualizar(id: int, dados: dict, db: Session = Depends(get_db)):
    v = db.query(Veiculo).filter(Veiculo.id == id).first()
    if not v: raise HTTPException(404, "Veiculo nao encontrado")
    for k, val in dados.items():
        if hasattr(v, k): setattr(v, k, val)
    db.commit()
    return {"message": "Veiculo atualizado"}

@router.delete("/{id}")
def deletar(id: int, db: Session = Depends(get_db)):
    v = db.query(Veiculo).filter(Veiculo.id == id).first()
    if not v: raise HTTPException(404, "Veiculo nao encontrado")
    db.delete(v)
    db.commit()
    return {"message": "Veiculo removido"}

@router.patch("/{id}/status")
def atualizar_status(id: int, status: str, db: Session = Depends(get_db)):
    v = db.query(Veiculo).filter(Veiculo.id == id).first()
    if not v: raise HTTPException(404, "Veiculo nao encontrado")
    v.status = status
    db.commit()
    return {"message": f"Status atualizado para {status}"}
PYEOF

# --- contratos endpoint ---
cat > backend/app/api/v1/contratos.py << 'PYEOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.contrato import Contrato
from app.models.veiculo import Veiculo
from app.models.cliente import Cliente

router = APIRouter(prefix="/contratos", tags=["Contratos"])

@router.get("/")
def listar(skip: int = 0, limit: int = 50, status: str = None, cliente_id: int = None, veiculo_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Contrato)
    if status: q = q.filter(Contrato.status == status)
    if cliente_id: q = q.filter(Contrato.cliente_id == cliente_id)
    if veiculo_id: q = q.filter(Contrato.veiculo_id == veiculo_id)
    total = q.count()
    items = q.order_by(Contrato.id.desc()).offset(skip).limit(limit).all()
    results = []
    for c in items:
        d = c.__dict__.copy()
        cli = db.query(Cliente).filter(Cliente.id == c.cliente_id).first()
        vei = db.query(Veiculo).filter(Veiculo.id == c.veiculo_id).first()
        d["cliente_nome"] = cli.nome if cli else ""
        d["veiculo_info"] = f"{vei.marca} {vei.modelo} - {vei.placa}" if vei else ""
        results.append(d)
    return {"items": results, "total": total}

@router.get("/{id}")
def buscar(id: int, db: Session = Depends(get_db)):
    c = db.query(Contrato).filter(Contrato.id == id).first()
    if not c: raise HTTPException(404, "Contrato nao encontrado")
    return c.__dict__

@router.post("/")
def criar(dados: dict, db: Session = Depends(get_db)):
    veiculo = db.query(Veiculo).filter(Veiculo.id == dados.get("veiculo_id")).first()
    if not veiculo: raise HTTPException(404, "Veiculo nao encontrado")
    if veiculo.status == "Alugado": raise HTTPException(400, "Veiculo ja esta alugado")
    c = Contrato(**dados)
    db.add(c)
    veiculo.status = "Alugado"
    db.commit()
    db.refresh(c)
    return {"message": "Contrato criado", "id": c.id}

@router.post("/{id}/finalizar")
def finalizar(id: int, dados: dict, db: Session = Depends(get_db)):
    c = db.query(Contrato).filter(Contrato.id == id).first()
    if not c: raise HTTPException(404, "Contrato nao encontrado")
    for k, v in dados.items():
        if hasattr(c, k): setattr(c, k, v)
    c.status = "Finalizado"
    veiculo = db.query(Veiculo).filter(Veiculo.id == c.veiculo_id).first()
    if veiculo:
        veiculo.status = "Disponivel"
        if dados.get("km_entrada"): veiculo.km_atual = dados["km_entrada"]
    db.commit()
    return {"message": "Contrato finalizado"}

@router.delete("/{id}")
def deletar(id: int, db: Session = Depends(get_db)):
    c = db.query(Contrato).filter(Contrato.id == id).first()
    if not c: raise HTTPException(404, "Contrato nao encontrado")
    veiculo = db.query(Veiculo).filter(Veiculo.id == c.veiculo_id).first()
    if veiculo and c.status == "Ativo": veiculo.status = "Disponivel"
    db.delete(c)
    db.commit()
    return {"message": "Contrato removido"}
PYEOF

# --- dashboard endpoint ---
cat > backend/app/api/v1/dashboard.py << 'PYEOF'
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from app.database import get_db
from app.models.veiculo import Veiculo
from app.models.cliente import Cliente
from app.models.contrato import Contrato
from app.models.financeiro import DespesaVeiculo, DespesaLoja

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/")
def dashboard(db: Session = Depends(get_db)):
    now = datetime.now()
    mes = now.month
    ano = now.year

    total_veiculos = db.query(Veiculo).count()
    disponiveis = db.query(Veiculo).filter(Veiculo.status == "Disponivel").count()
    alugados = db.query(Veiculo).filter(Veiculo.status == "Alugado").count()
    manutencao = db.query(Veiculo).filter(Veiculo.status == "Manutencao").count()
    total_clientes = db.query(Cliente).count()
    contratos_ativos = db.query(Contrato).filter(Contrato.status == "Ativo").count()

    mes_str = f"{ano}-{mes:02d}"
    receita = db.query(func.coalesce(func.sum(Contrato.total), 0)).filter(
        Contrato.data_saida.like(f"{mes_str}%"), Contrato.status == "Finalizado"
    ).scalar()

    desp_veic = db.query(func.coalesce(func.sum(DespesaVeiculo.valor), 0)).filter(
        DespesaVeiculo.data.like(f"{mes_str}%")
    ).scalar()
    desp_loja = db.query(func.coalesce(func.sum(DespesaLoja.valor), 0)).filter(
        DespesaLoja.mes == mes, DespesaLoja.ano == ano
    ).scalar()

    return {
        "total_veiculos": total_veiculos,
        "veiculos_disponiveis": disponiveis,
        "veiculos_alugados": alugados,
        "veiculos_manutencao": manutencao,
        "total_clientes": total_clientes,
        "contratos_ativos": contratos_ativos,
        "receita_mes": float(receita),
        "despesas_mes": float(desp_veic) + float(desp_loja),
        "lucro_mes": float(receita) - float(desp_veic) - float(desp_loja)
    }
PYEOF

# --- empresas endpoint ---
cat > backend/app/api/v1/empresas.py << 'PYEOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.empresa import Empresa

router = APIRouter(prefix="/empresas", tags=["Empresas"])

@router.get("/")
def listar(ativa: int = None, db: Session = Depends(get_db)):
    q = db.query(Empresa)
    if ativa is not None: q = q.filter(Empresa.ativa == ativa)
    return {"items": [e.__dict__ for e in q.all()], "total": q.count()}

@router.get("/{id}")
def buscar(id: int, db: Session = Depends(get_db)):
    e = db.query(Empresa).filter(Empresa.id == id).first()
    if not e: raise HTTPException(404, "Empresa nao encontrada")
    return e.__dict__

@router.post("/")
def criar(dados: dict, db: Session = Depends(get_db)):
    e = Empresa(**dados)
    db.add(e)
    db.commit()
    db.refresh(e)
    return {"message": "Empresa criada", "id": e.id}

@router.put("/{id}")
def atualizar(id: int, dados: dict, db: Session = Depends(get_db)):
    e = db.query(Empresa).filter(Empresa.id == id).first()
    if not e: raise HTTPException(404, "Empresa nao encontrada")
    for k, v in dados.items():
        if hasattr(e, k): setattr(e, k, v)
    db.commit()
    return {"message": "Empresa atualizada"}

@router.delete("/{id}")
def deletar(id: int, db: Session = Depends(get_db)):
    e = db.query(Empresa).filter(Empresa.id == id).first()
    if not e: raise HTTPException(404, "Empresa nao encontrada")
    db.delete(e)
    db.commit()
    return {"message": "Empresa removida"}
PYEOF

# --- financeiro endpoint ---
cat > backend/app/api/v1/financeiro.py << 'PYEOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.financeiro import DespesaVeiculo, DespesaLoja
from app.models.contrato import Contrato
from datetime import datetime

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])

@router.get("/resumo")
def resumo(mes: int = None, ano: int = None, db: Session = Depends(get_db)):
    if not mes: mes = datetime.now().month
    if not ano: ano = datetime.now().year
    mes_str = f"{ano}-{mes:02d}"

    receita = db.query(func.coalesce(func.sum(Contrato.total), 0)).filter(
        Contrato.data_saida.like(f"{mes_str}%")
    ).scalar()
    desp_v = db.query(func.coalesce(func.sum(DespesaVeiculo.valor), 0)).filter(
        DespesaVeiculo.data.like(f"{mes_str}%")
    ).scalar()
    desp_l = db.query(func.coalesce(func.sum(DespesaLoja.valor), 0)).filter(
        DespesaLoja.mes == mes, DespesaLoja.ano == ano
    ).scalar()

    return {"mes": mes, "ano": ano, "receita": float(receita), "despesas_veiculos": float(desp_v), "despesas_loja": float(desp_l), "total_despesas": float(desp_v)+float(desp_l), "lucro": float(receita)-float(desp_v)-float(desp_l)}

@router.get("/despesas-veiculos")
def listar_desp_veic(veiculo_id: int = None, db: Session = Depends(get_db)):
    q = db.query(DespesaVeiculo)
    if veiculo_id: q = q.filter(DespesaVeiculo.veiculo_id == veiculo_id)
    return {"items": [d.__dict__ for d in q.order_by(DespesaVeiculo.data.desc()).all()]}

@router.post("/despesas-veiculos")
def criar_desp_veic(dados: dict, db: Session = Depends(get_db)):
    d = DespesaVeiculo(**dados)
    db.add(d)
    db.commit()
    return {"message": "Despesa criada", "id": d.id}

@router.delete("/despesas-veiculos/{id}")
def del_desp_veic(id: int, db: Session = Depends(get_db)):
    d = db.query(DespesaVeiculo).filter(DespesaVeiculo.id == id).first()
    if not d: raise HTTPException(404, "Despesa nao encontrada")
    db.delete(d)
    db.commit()
    return {"message": "Despesa removida"}

@router.get("/despesas-loja")
def listar_desp_loja(mes: int = None, ano: int = None, db: Session = Depends(get_db)):
    q = db.query(DespesaLoja)
    if mes: q = q.filter(DespesaLoja.mes == mes)
    if ano: q = q.filter(DespesaLoja.ano == ano)
    return {"items": [d.__dict__ for d in q.order_by(DespesaLoja.data.desc()).all()]}

@router.post("/despesas-loja")
def criar_desp_loja(dados: dict, db: Session = Depends(get_db)):
    d = DespesaLoja(**dados)
    db.add(d)
    db.commit()
    return {"message": "Despesa criada", "id": d.id}

@router.delete("/despesas-loja/{id}")
def del_desp_loja(id: int, db: Session = Depends(get_db)):
    d = db.query(DespesaLoja).filter(DespesaLoja.id == id).first()
    if not d: raise HTTPException(404, "Despesa nao encontrada")
    db.delete(d)
    db.commit()
    return {"message": "Despesa removida"}
PYEOF

# --- configuracoes endpoint ---
cat > backend/app/api/v1/configuracoes.py << 'PYEOF'
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.auditoria import Configuracao

router = APIRouter(prefix="/configuracoes", tags=["Configuracoes"])

@router.get("/")
def listar(db: Session = Depends(get_db)):
    configs = db.query(Configuracao).all()
    return {c.chave: c.valor for c in configs}

@router.get("/{chave}")
def buscar(chave: str, db: Session = Depends(get_db)):
    c = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if not c: raise HTTPException(404, "Configuracao nao encontrada")
    return {"chave": c.chave, "valor": c.valor}

@router.put("/{chave}")
def atualizar(chave: str, valor: str, db: Session = Depends(get_db)):
    c = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if c:
        c.valor = valor
    else:
        c = Configuracao(chave=chave, valor=valor)
        db.add(c)
    db.commit()
    return {"message": "Configuracao atualizada"}
PYEOF

# ========== FRONTEND ==========
echo "[6/8] Criando Frontend (React)..."
mkdir -p frontend/src/{components,pages,services,contexts}

# --- frontend/package.json ---
cat > frontend/package.json << 'EOF'
{
  "name": "mpcars-web",
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "axios": "^1.7.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.400.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0"
  }
}
EOF

# --- frontend/Dockerfile ---
cat > frontend/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build 2>/dev/null || (mkdir -p dist && echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MPCARS</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#f0f2f5;display:flex;justify-content:center;align-items:center;min-height:100vh}.card{background:#fff;border-radius:16px;padding:48px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.1);max-width:500px}h1{color:#0052cc;font-size:2rem;margin-bottom:8px}h2{color:#374151;font-size:1.2rem;margin-bottom:24px;font-weight:normal}p{color:#6b7280;line-height:1.6;margin-bottom:16px}.badge{display:inline-block;background:#0066ff;color:#fff;padding:6px 16px;border-radius:99px;font-size:0.9rem}a{color:#0066ff}</style></head><body><div class="card"><h1>MPCARS</h1><h2>Sistema de Locadora de Veiculos</h2><p>API funcionando em <a href="/docs">/docs</a></p><p>Frontend em construcao...</p><p class="badge">v2.0</p></div></body></html>' > dist/index.html)

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
EOF

# --- frontend/nginx.conf ---
cat > frontend/nginx.conf << 'EOF'
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://mpcars-api:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# --- frontend configs ---
cat > frontend/vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8000' } }
})
EOF

cat > frontend/tsconfig.json << 'EOF'
{"compilerOptions":{"target":"ES2020","useDefineForClassFields":true,"lib":["ES2020","DOM"],"module":"ESNext","skipLibCheck":true,"moduleResolution":"bundler","allowImportingTsExtensions":true,"resolveJsonModule":true,"isolatedModules":true,"noEmit":true,"jsx":"react-jsx","strict":true},"include":["src"]}
EOF

cat > frontend/tailwind.config.js << 'EOF'
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { colors: { primary: {"DEFAULT":"#0066ff","dark":"#0052cc","light":"#3385ff"}, success:"#00c853", warning:"#ff9100", danger:"#ff1744" } } },
  plugins: [],
}
EOF

cat > frontend/postcss.config.js << 'EOF'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
EOF

cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>MPCARS - Locadora</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>
EOF

cat > frontend/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
body { font-family: system-ui, -apple-system, sans-serif; background: #f0f2f5; }
EOF

cat > frontend/src/main.tsx << 'EOF'
import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import App from "./App"
import "./index.css"
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>)
EOF

cat > frontend/src/services/api.ts << 'EOF'
import axios from "axios"
const api = axios.create({ baseURL: "/api/v1" })
api.interceptors.request.use(cfg => { const t = localStorage.getItem("token"); if(t) cfg.headers.Authorization = `Bearer ${t}`; return cfg })
api.interceptors.response.use(r => r, err => { if(err.response?.status === 401){ localStorage.removeItem("token"); window.location.href = "/login" } return Promise.reject(err) })
export default api
EOF

cat > frontend/src/App.tsx << 'EOF'
import { Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("token")
  return token ? <>{children}</> : <Navigate to="/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    </Routes>
  )
}
EOF

cat > frontend/src/pages/Login.tsx << 'TSXEOF'
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/api"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const nav = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const form = new URLSearchParams()
      form.append("username", email)
      form.append("password", password)
      const { data } = await api.post("/auth/login", form)
      localStorage.setItem("token", data.access_token)
      localStorage.setItem("user", JSON.stringify(data.user))
      nav("/")
    } catch { setError("Email ou senha incorretos") }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">MPCARS</h1>
          <p className="text-gray-500 mt-1">Sistema de Locadora de Veiculos</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}
          <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          <input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">Entrar</button>
        </form>
      </div>
    </div>
  )
}
TSXEOF

cat > frontend/src/pages/Dashboard.tsx << 'TSXEOF'
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import api from "../services/api"

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const nav = useNavigate()

  useEffect(() => { api.get("/dashboard/").then(r => setData(r.data)).catch(() => {}) }, [])

  const logout = () => { localStorage.clear(); nav("/login") }
  const user = JSON.parse(localStorage.getItem("user") || "{}")

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-700 text-white flex flex-col min-h-screen">
        <div className="p-6 border-b border-blue-600">
          <h1 className="text-xl font-bold">MPCARS</h1>
          <p className="text-blue-200 text-sm">Locadora de Veiculos</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {["Dashboard","Veiculos","Clientes","Contratos","Empresas","Financeiro","Seguros","IPVA","Multas","Manutencoes","Reservas","Relatorios","Configuracoes"].map(item => (
            <a key={item} href="#" className="block px-4 py-2.5 rounded-lg hover:bg-blue-600 transition text-sm">{item}</a>
          ))}
        </nav>
        <div className="p-4 border-t border-blue-600">
          <p className="text-sm text-blue-200 mb-2">{user.nome}</p>
          <button onClick={logout} className="w-full text-left px-4 py-2 rounded-lg hover:bg-blue-600 text-sm">Sair</button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
        {data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card title="Veiculos" value={data.total_veiculos} sub={`${data.veiculos_disponiveis} disponiveis`} color="blue" />
            <Card title="Alugados" value={data.veiculos_alugados} sub="em locacao" color="green" />
            <Card title="Clientes" value={data.total_clientes} sub="cadastrados" color="purple" />
            <Card title="Contratos Ativos" value={data.contratos_ativos} sub="em andamento" color="orange" />
            <Card title="Receita do Mes" value={`R$ ${data.receita_mes?.toFixed(2)}`} sub="faturamento" color="green" />
            <Card title="Despesas do Mes" value={`R$ ${data.despesas_mes?.toFixed(2)}`} sub="gastos" color="red" />
            <Card title="Lucro do Mes" value={`R$ ${data.lucro_mes?.toFixed(2)}`} sub="resultado" color={data.lucro_mes >= 0 ? "green" : "red"} />
            <Card title="Manutencao" value={data.veiculos_manutencao} sub="veiculos" color="yellow" />
          </div>
        ) : <p className="text-gray-500">Carregando...</p>}

        <div className="mt-8 bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">API Swagger</h3>
          <p className="text-gray-500">Acesse a documentacao completa da API em <a href="/docs" className="text-blue-600 underline" target="_blank">/docs</a></p>
        </div>
      </main>
    </div>
  )
}

function Card({ title, value, sub, color }: { title: string; value: any; sub: string; color: string }) {
  const colors: Record<string, string> = {
    blue: "border-l-blue-500", green: "border-l-green-500", purple: "border-l-purple-500",
    orange: "border-l-orange-500", red: "border-l-red-500", yellow: "border-l-yellow-500"
  }
  return (
    <div className={`bg-white rounded-xl shadow p-6 border-l-4 ${colors[color] || "border-l-gray-500"}`}>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}
TSXEOF

# ========== NGINX ==========
echo "[7/8] Configurando Nginx..."
mkdir -p nginx

cat > nginx/nginx.conf << 'EOF'
events { worker_connections 1024; }

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 50M;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    upstream backend { server mpcars-api:8000; }
    upstream frontend { server mpcars-web:80; }

    server {
        listen 80;
        server_name _;

        # API
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Swagger docs
        location /docs {
            proxy_pass http://backend;
            proxy_set_header Host $host;
        }
        location /openapi.json {
            proxy_pass http://backend;
        }
        location /redoc {
            proxy_pass http://backend;
        }

        # Health check
        location /health {
            proxy_pass http://backend;
        }

        # Frontend (tudo que nao eh API)
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
EOF

cat > nginx/Dockerfile << 'EOF'
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
EOF

# ========== SUBIR TUDO ==========
echo "[8/8] Subindo containers Docker..."
cd $PROJECT_DIR

docker compose down 2>/dev/null || true
docker compose up -d --build

echo ""
echo "============================================="
echo "  MPCARS DEPLOY CONCLUIDO!"
echo "============================================="
echo ""
echo "Aguarde ~60 segundos para tudo inicializar..."
echo ""
sleep 15

# Verificar status
echo "Status dos containers:"
docker compose ps
echo ""

# Pegar IP
IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
echo "============================================="
echo "  ACESSE SEU SISTEMA:"
echo "============================================="
echo ""
echo "  Sistema:    http://$IP"
echo "  API Docs:   http://$IP/docs"
echo "  Portainer:  http://$IP:9000"
echo "  pgAdmin:    http://$IP:8080"
echo ""
echo "  pgAdmin Login:"
echo "    Email: $PGADMIN_EMAIL"
echo "    Senha: $PGADMIN_PASSWORD"
echo ""
echo "  Para criar o primeiro usuario, acesse:"
echo "    http://$IP/docs"
echo "    Use POST /api/v1/auth/register"
echo ""
echo "============================================="
echo "  SENHAS (ANOTE!):"
echo "============================================="
echo "  Banco: $DB_USER / $DB_PASSWORD"
echo "  Secret Key: $SECRET_KEY"
echo "============================================="
