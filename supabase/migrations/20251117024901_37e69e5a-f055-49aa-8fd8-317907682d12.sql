-- Alterar o valor padrão de metodo_pagamento na tabela sessions para 'A definir'
ALTER TABLE public.sessions 
ALTER COLUMN metodo_pagamento SET DEFAULT 'A definir';

-- Comentário: Isso garante que novas sessões criadas terão 'A definir' como método padrão,
-- mantendo consistência com os pagamentos que também usam 'A definir' como padrão