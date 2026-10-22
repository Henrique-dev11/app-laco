-- CreateTable
CREATE TABLE "FotoPerfil" (
    "usuarioId" INTEGER NOT NULL,
    "mime" VARCHAR(20) NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FotoPerfil_pkey" PRIMARY KEY ("usuarioId")
);

-- AddForeignKey
ALTER TABLE "FotoPerfil" ADD CONSTRAINT "FotoPerfil_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
