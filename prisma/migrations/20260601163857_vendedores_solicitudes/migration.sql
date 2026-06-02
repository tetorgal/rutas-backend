-- CreateTable
CREATE TABLE "Vendedor" (
    "lid" TEXT NOT NULL,
    "nombreReal" TEXT NOT NULL,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vendedor_pkey" PRIMARY KEY ("lid")
);

-- CreateTable
CREATE TABLE "SolicitudAcceso" (
    "lid" TEXT NOT NULL,
    "nombreWa" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',

    CONSTRAINT "SolicitudAcceso_pkey" PRIMARY KEY ("lid")
);
