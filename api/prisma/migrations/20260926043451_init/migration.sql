-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('RESPONSAVEL', 'CUIDADOR', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "StatusUsuario" AS ENUM ('ATIVO', 'BLOQUEADO', 'INATIVO');

-- CreateEnum
CREATE TYPE "StatusVerificacao" AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "Parentesco" AS ENUM ('PROPRIO', 'FILHO', 'FILHA', 'CONJUGE', 'NETO', 'NETA', 'OUTRO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "senhaHash" VARCHAR(255) NOT NULL,
    "tipoUsuario" "TipoUsuario" NOT NULL,
    "status" "StatusUsuario" NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endereco" (
    "id" SERIAL NOT NULL,
    "rua" VARCHAR(150) NOT NULL,
    "numero" VARCHAR(20) NOT NULL,
    "complemento" VARCHAR(150),
    "bairro" VARCHAR(100) NOT NULL,
    "cidade" VARCHAR(100) NOT NULL,
    "estado" CHAR(2) NOT NULL,
    "cep" VARCHAR(8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Endereco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsavel" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "enderecoId" INTEGER NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Responsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponsavelIdoso" (
    "id" SERIAL NOT NULL,
    "responsavelId" INTEGER NOT NULL,
    "idosoId" INTEGER NOT NULL,
    "parentesco" "Parentesco" NOT NULL,
    "responsavelPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponsavelIdoso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Idoso" (
    "id" SERIAL NOT NULL,
    "enderecoId" INTEGER NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "sexo" VARCHAR(30),
    "telefone" VARCHAR(20),
    "cpf" VARCHAR(11),
    "observacoes" TEXT,
    "necessidadesEspeciais" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idoso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cuidador" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "enderecoId" INTEGER NOT NULL,
    "telefone" VARCHAR(20) NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "dataNascimento" TIMESTAMP(3) NOT NULL,
    "biografia" TEXT,
    "experienciaProfissional" TEXT,
    "registroProfissional" VARCHAR(100),
    "statusVerificacao" "StatusVerificacao" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cuidador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Responsavel_usuarioId_key" ON "Responsavel"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Responsavel_cpf_key" ON "Responsavel"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "ResponsavelIdoso_responsavelId_idosoId_key" ON "ResponsavelIdoso"("responsavelId", "idosoId");

-- CreateIndex
CREATE UNIQUE INDEX "Idoso_cpf_key" ON "Idoso"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Cuidador_usuarioId_key" ON "Cuidador"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Cuidador_cpf_key" ON "Cuidador"("cpf");

-- AddForeignKey
ALTER TABLE "Responsavel" ADD CONSTRAINT "Responsavel_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Responsavel" ADD CONSTRAINT "Responsavel_enderecoId_fkey" FOREIGN KEY ("enderecoId") REFERENCES "Endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsavelIdoso" ADD CONSTRAINT "ResponsavelIdoso_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Responsavel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsavelIdoso" ADD CONSTRAINT "ResponsavelIdoso_idosoId_fkey" FOREIGN KEY ("idosoId") REFERENCES "Idoso"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idoso" ADD CONSTRAINT "Idoso_enderecoId_fkey" FOREIGN KEY ("enderecoId") REFERENCES "Endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuidador" ADD CONSTRAINT "Cuidador_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cuidador" ADD CONSTRAINT "Cuidador_enderecoId_fkey" FOREIGN KEY ("enderecoId") REFERENCES "Endereco"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
