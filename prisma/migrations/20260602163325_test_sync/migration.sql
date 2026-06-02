/*
  Warnings:

  - Added the required column `SAP` to the `UbicacionReportada` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO');

-- AlterTable
ALTER TABLE "UbicacionReportada" ADD COLUMN     "SAP" TEXT NOT NULL DEFAULT 'S/N',
ADD COLUMN     "diasVisita" "DiaSemana"[],
ADD COLUMN     "rutaId" TEXT;

-- AlterTable
ALTER TABLE "Vendedor" ADD COLUMN     "rutaActualId" TEXT;

-- CreateTable
CREATE TABLE "Ruta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#3B82F6',

    CONSTRAINT "Ruta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ruta_nombre_key" ON "Ruta"("nombre");

-- AddForeignKey
ALTER TABLE "UbicacionReportada" ADD CONSTRAINT "UbicacionReportada_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "Ruta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendedor" ADD CONSTRAINT "Vendedor_rutaActualId_fkey" FOREIGN KEY ("rutaActualId") REFERENCES "Ruta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
