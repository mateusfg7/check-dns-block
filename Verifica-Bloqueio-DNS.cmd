VERIFICA BLOQUEIO DNS
=====================

Serve para conferir, de uma vez, se vários domínios estão bloqueados no DNS 177.137.208.6.

COMO USAR
1. Extraia o arquivo Verifica-Bloqueio-DNS.cmd deste ZIP para uma pasta (não rode de dentro do ZIP).
2. Dê duplo clique nele. Se o Windows mostrar um aviso de segurança, clique em "Mais informações" > "Executar assim mesmo" (ou "Executar").
3. Cole os domínios e/ou IPs na caixa e clique em Verificar.

RESULTADO
BLOQUEADO      = o DNS 177.137.208.6 não resolve o domínio e o DNS público (8.8.8.8) resolve.
NÃO BLOQUEADO  = o domínio resolve normalmente no 177.137.208.6.
NÃO EXISTE     = o domínio não resolve em nenhum dos dois (não comprova bloqueio).
REVERSO OK     = para IP colado, mostra o nome do reverso.

EVIDÊNCIA
"Salvar evidência..." gera um TXT com data/hora e a lista dos domínios bloqueados.
"Mostrar só bloqueados" filtra a tela para tirar o print.

REQUISITOS
Windows 10 ou 11. O computador precisa estar na rede que usa o DNS 177.137.208.6.
Não instala nada e não precisa de administrador.