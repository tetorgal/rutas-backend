-- CreateTable
CREATE TABLE "UbicacionReportada" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "latitud" DOUBLE PRECISION NOT NULL,
    "longitud" DOUBLE PRECISION NOT NULL,
    "urlOriginal" TEXT NOT NULL,
    "telefonoVendedor" TEXT NOT NULL,
    "nombreVendedor" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UbicacionReportada_pkey" PRIMARY KEY ("id")
);
