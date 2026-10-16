# Rotinas Administrativas Josi

Organizador compartilhado de demandas, com interface escura e destaque lilás.
O aplicativo é independente da conta e da assinatura do ChatGPT.

## Estado atual

Arquivos adaptados para GitHub Pages + Firebase. **A configuração do Firebase
está pendente. O aplicativo não recebe demandas enquanto ela não for concluída.**
Nenhuma senha, documento ou dado de trabalho deve ser colocado neste repositório público.

## Permissões previstas

- Josi: visualiza e administra o quadro, altera etapas, edita, exclui, exporta e gerencia integrantes.
- Equipe: somente insere demandas e anexos, sem consultar ou editar registros existentes.
- As regras do banco devem verificar essas permissões independentemente da interface.

## Publicar o site no GitHub Pages

Em Settings → Pages → Build and deployment, selecione **Deploy from a branch**,
branch **main**, pasta **/(root)** e salve. Use o endereço confirmado pelo GitHub.
A publicação da página não configura automaticamente o banco de dados.

## Concluir a configuração do Firebase

1. Crie um projeto seu no Firebase, mantendo o plano gratuito **Spark** e sem ativar faturamento.
2. Registre um aplicativo Web. Copie sua configuração pública para `firebase-config.js`.
   Inclua `databaseURL` depois de criar o Realtime Database.
3. Habilite Authentication → E-mail/senha. Crie seu usuário de administradora no console
   e copie apenas o UID dele para `adminUid`. Não coloque a senha no repositório.
4. Crie o Realtime Database em **modo bloqueado**, nunca em modo de teste aberto.
5. Em `database.rules.json`, substitua todas as ocorrências de `ADMIN_UID_CONFIGURAR`
   pelo seu UID e publique essas regras na aba Rules do banco. Confira as regras
   com o simulador antes de cadastrar dados reais.
6. Configure o domínio do GitHub Pages nos domínios autorizados do Authentication.
7. Entre no aplicativo com seu e-mail e senha. No primeiro acesso administrativo,
   o quadro vazio será inicializado no seu próprio banco.
8. Em Equipe e acesso, crie as contas dos integrantes com o e-mail de cada um.
   Os integrantes criados pelo aplicativo entram na lista de usuários autorizados.

Não copie configurações, usuários ou dados do projeto do colega.
As chaves públicas de configuração do Firebase identificam o projeto; a segurança
é feita por autenticação e regras do banco. Nunca use chaves de conta de serviço
ou segredos administrativos em arquivos do site.

## Atualização e conflitos

O Firebase notifica alterações do quadro. A tela administrativa aplica as atualizações
em até aproximadamente 3 segundos quando está aberta e fora de uma edição.
Durante a edição, a atualização é adiada. Se outra pessoa alterou os dados,
a gravação administrativa é recusada para evitar sobrescrever mudanças.

## Anexos e limites

Até cinco anexos de 2 MB por demanda, guardados como dados codificados no
Realtime Database. Essa implementação dispensa Cloud Storage e se destina
a uma equipe pequena, com volume moderado de documentos. Arquivos grandes
ou numerosos consomem rapidamente a cota gratuita de armazenamento e tráfego.
Não ative plano pago para ultrapassar limites sem avaliar os custos.
As demandas e os anexos NÃO ficam no repositório GitHub.

Use o backup administrativo e confira regularmente a restauração.
O backup antigo pode precisar de adequação se tiver mais de cinco anexos por
demanda ou documentos com tamanho superior a 2 MB.

## Verificações

A sintaxe da interface e da integração foi validada, bem como a conversão dos
registros e o bloqueio de acesso enquanto não houver configuração.
Não foi possível validar a interface visualmente nem testar as regras no Firebase
real: o projeto ainda não foi criado/conectado. Teste com um usuário integrante
separado antes de usar documentos reais.

A versão Python/ZIP preparada anteriormente não é usada nesta publicação:
o GitHub Pages serve esta interface, conectada ao Firebase.
