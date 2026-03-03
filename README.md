# Portfolio — Rafael Diogo

Portfólio minimalista construído com HTML, CSS puro e Firebase para gestão dinâmica de projetos e certificados.

## 🚀 Tecnologias
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Backend**: Firebase Firestore (Base de Dados)
- **CMS**: Painel de Administração customizado em `/admin.html`
- **Upload**: Firebase Storage para imagens de projetos

## 📦 Como Publicar no GitHub Pages
1. Cria um novo repositório no GitHub.
2. Abre o terminal na pasta do projeto e corre:
   ```bash
   git init
   git add .
   git commit -m "Primeira versão do portfólio"
   git branch -M main
   git remote add origin https://github.com/TEU_USER/TEU_REPOSITORIO.git
   git push -u origin main
   ```
3. No GitHub: **Settings > Pages**.
4. Em **Build and deployment**, escolhe a branch `main` e a pasta `/ (root)`.
5. Clica em **Save**. Em minutos o teu site estará online!

## 🔐 Segurança
- O painel em `/admin.html` está protegido por **Firebase Authentication**.
- Apenas o utilizador configurado no Firebase Console terá acesso para editar os dados.
- **Recomendação**: No Firebase Console (API & Services), restringe a tua API Key para aceitar apenas pedidos do teu domínio do GitHub Pages.
