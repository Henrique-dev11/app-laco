CREATE TABLE "FotoIdoso" (
    "idosoId" INTEGER NOT NULL,
    "mime" VARCHAR(20) NOT NULL,
    "conteudo" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FotoIdoso_pkey" PRIMARY KEY ("idosoId")
);

ALTER TABLE "FotoIdoso" ADD CONSTRAINT "FotoIdoso_idosoId_fkey"
    FOREIGN KEY ("idosoId") REFERENCES "Idoso"("id") ON DELETE CASCADE ON UPDATE CASCADE;
