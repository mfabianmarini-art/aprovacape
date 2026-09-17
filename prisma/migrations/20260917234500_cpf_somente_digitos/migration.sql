-- CPF vinha gravado ora com máscara, ora só com dígitos. Isso quebrava a comparação
-- entre o CPF que o RT declara e o do proprietário do lote, e deixava a restrição de CPF
-- único passar a mesma pessoa duas vezes, uma com pontos e outra sem.
--
-- Usuários internos da CAPE e síndicos não têm CPF: usam um marcador "PEND-...". A
-- condição de 11 dígitos os deixa de fora, e não vira número.
UPDATE "User"
   SET cpf = regexp_replace(cpf, '[^0-9]', '', 'g')
 WHERE length(regexp_replace(cpf, '[^0-9]', '', 'g')) = 11
   AND cpf <> regexp_replace(cpf, '[^0-9]', '', 'g');

UPDATE "User"
   SET "vinculoPropCpf" = regexp_replace("vinculoPropCpf", '[^0-9]', '', 'g')
 WHERE "vinculoPropCpf" IS NOT NULL
   AND length(regexp_replace("vinculoPropCpf", '[^0-9]', '', 'g')) = 11
   AND "vinculoPropCpf" <> regexp_replace("vinculoPropCpf", '[^0-9]', '', 'g');
