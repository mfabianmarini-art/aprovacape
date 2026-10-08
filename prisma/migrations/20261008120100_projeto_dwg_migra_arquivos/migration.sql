-- O campo único de projeto arquitetônico aceitava PDF ou DWG. Os DWG já enviados vão para o
-- campo novo, deixando no antigo só o que é PDF.
UPDATE "SolicitacaoDocumento"
   SET "tipo" = 'PROJETO_ARQUITETONICO_DWG'
 WHERE "tipo" = 'PROJETO_ARQUITETONICO'
   AND lower("nomeArquivo") ~ '\.(dwg|zip)$';
