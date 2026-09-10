-- AlterEnum
-- Adds the ADMIN_CAPE role: like CAPE_ANALISTA (full access, unscoped to a single
-- empreendimento) but also allowed to create new empreendimentos and other internal accounts.
ALTER TYPE "Role" ADD VALUE 'ADMIN_CAPE';
