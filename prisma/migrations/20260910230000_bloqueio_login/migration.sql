-- AlterTable
ALTER TABLE "User" ADD COLUMN     "tentativasLogin" INTEGER NOT NULL DEFAULT 0,
                  ADD COLUMN     "bloqueadoAte" TIMESTAMP(3);
