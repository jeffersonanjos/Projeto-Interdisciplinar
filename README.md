# Escopo do Projeto  
**Título:** Sistema de Recomendação de Livros e Filmes com Avaliações Personalizadas  

## Objetivo Geral  
Desenvolver um sistema web interativo que permita aos usuários cadastrar, avaliar e descobrir livros e filmes, recebendo recomendações personalizadas de acordo com suas preferências e histórico de avaliações.

## Objetivos Específicos  
- Criar uma interface intuitiva e responsiva, inspirada no layout de plataformas de streaming.  
- Implementar sistema de cadastro e autenticação de usuários.  
- Permitir que os usuários avaliem livros e filmes com notas e comentários.  
- Utilizar algoritmos de similaridade ou aprendizado de máquina para gerar recomendações personalizadas.  
- Integrar o sistema com APIs externas, como Google Books (livros) e TMDB (filmes), para buscar automaticamente informações e capas.  
- Disponibilizar histórico de avaliações e recomendações no perfil de cada usuário.  

## Público-Alvo  
Leitores e cinéfilos que desejam descobrir novos conteúdos com base em preferências pessoais, buscando praticidade e personalização na experiência.

## Como resolver o problema no github com email e nome
```text
git config --global user.name "Jefferson Santos"
git config --global user.email "jefferson@email.com"
```


## Executando o back-end passo a passo
O sistema **só funciona corretamente** quando você inicia o servidor **dentro da pasta `app`**, porque todos os imports e caminhos relativos foram configurados considerando esse diretório. Siga os passos abaixo:

### Entrando na pasta `app`
No terminal, estando na raiz do projeto, execute:
```bash
cd app
uvicorn main:app --port 8001
```
---

### Instalando as dependências

No terminal, estando dentro da pasta do front-end, execute:

```bash
npm install
npm run dev
```

## Funcionalidades Principais  
1. **Cadastro e Login de Usuários** ✅ **CONCLUÍDO** (Sistema completo implementado)
2. **Busca e Exibição de Livros e Filmes** ❌ **PENDENTE** (Modelos criados, endpoints não implementados)
3. **Sistema de Avaliação (notas e comentários)** ✅ **CONCLUÍDO** (Endpoint de criação de avaliações implementado)
4. **Recomendações personalizadas** ❌ **PENDENTE** (Modelo criado, algoritmo não implementado)
5. **Integração com APIs externas (Google Books e TMDB)** ❌ **PENDENTE** (Não implementado)
6. **Exibição de cards com capas, notas e sinopses** ❌ **PENDENTE** (Frontend não implementado)
7. **Histórico de Avaliações no perfil do usuário** ❌ **PENDENTE** (Endpoints não implementados)

## Status do Projeto

### ✅ **IMPLEMENTADO:**
- **Backend com FastAPI**: Estrutura base do servidor
- **Modelos de Dados**: User, Book, Movie, Rating, Recommendation (SQLModel/SQLAlchemy)
- **Banco de Dados**: Configuração Mysql
- **Sistema Completo de Autenticação**:
  - Cadastro de Usuários: Endpoint POST `/users/` com hash de senha (bcrypt)
  - Login com JWT: Endpoints POST `/token` e POST `/login`
  - Autenticação de Usuários: Middleware JWT com tokens seguros
  - Perfil do Usuário: Endpoint GET `/users/me/` para dados do usuário logado
  - Atualização de Usuários: Endpoint PUT `/users/{user_id}`
- **Sistema de Avaliações**: Endpoint POST `/ratings/` protegido por autenticação
- **Schemas Pydantic**: Validação de dados de entrada e saída
- **CORS**: Configurado para desenvolvimento
- **Documentação Automática**: Swagger/OpenAPI disponível

### ❌ **PENDENTE:**
- **Endpoints de Livros**: CRUD completo para livros
- **Endpoints de Filmes**: CRUD completo para filmes
- **Integração com APIs Externas**: Google Books e TMDB
- **Sistema de Recomendações**: Algoritmo de recomendação personalizada
- **Frontend**: Interface web responsiva
- **Endpoints de Histórico**: Buscar avaliações do usuário
- **Endpoints de Recomendações**: Buscar recomendações do usuário

### 🔧 **TECNOLOGIAS UTILIZADAS:**
- **Backend**: FastAPI (Python)
- **Banco de Dados**: SQLite (configurável para MySQL)
- **ORM**: SQLModel (SQLAlchemy)
- **Validação**: Pydantic
- **Autenticação**: JWT (python-jose), bcrypt (passlib)
- **Hash de Senhas**: bcrypt (passlib)
- **Servidor**: Uvicorn
- **Segurança**: OAuth2, JWT tokens, hash de senhas

### 📋 **ENDPOINTS DISPONÍVEIS:**

#### **Autenticação:**
- `POST /users/` - Cadastrar novo usuário
- `POST /token` - Login com OAuth2 (form-data)
- `POST /login` - Login com JSON
- `GET /users/me/` - Obter dados do usuário logado
- `PUT /users/{user_id}` - Atualizar dados do usuário

#### **Avaliações:**
- `POST /ratings/` - Criar nova avaliação (requer autenticação)

#### **Documentação:**
- `GET /docs` - Documentação Swagger/OpenAPI
- `GET /redoc` - Documentação ReDoc

## Tecnologias e Ferramentas Previstas  
- **Front-end:** HTML, CSS, JavaScript, com framework como React + Vite.  
- **Back-end:** Node.js, Python, com integração de APIs.  
- **Banco de Dados:** MySQL para armazenamento de dados de usuários, avaliações e histórico.  
- **Integrações:** Google Books API, TMDB API.  
- **Ferramentas de Design:** Figma ou Canva para identidade visual e protótipos.  

## Limitações e Restrições  
- O sistema requer conexão com a internet para consultas às APIs.  
- A geração de recomendações depende do volume de avaliações realizadas pelos usuários.

# Identidade Visual – Sistema de Recomendação de Livros e Filmes

## Público-alvo
O sistema será voltado para **leitores e cinéfilos que buscam personalização** na hora de escolher o que consumir.  

**Características:**
- **Idade:** 16 a 35 anos  
- **Localização:** público nacional, especialmente jovens e adultos conectados à internet e ativos em redes sociais.  
- **Perfil de consumo:** gostam de explorar novos títulos, valorizam avaliações e gostam de receber indicações personalizadas.  
- **Interesses:** literatura, cinema, cultura pop, plataformas de streaming, clubes do livro, comunidades online.  
- **Comportamento digital:** utilizam smartphones e computadores, acostumados com interfaces de plataformas como Netflix, Skoob e Letterboxd.  

---

# Link da logo, paleta de cores e tipografia 
https://www.canva.com/design/DAGvhDDOAsQ/ubqk8OcMjWd8rD36G38qpA/edit?utm_content=DAGvhDDOAsQ&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton
# Requisitos do Projeto 
https://docs.google.com/document/d/1agT58mKhabCQoydbFlBOjwG71Odg-32IwTi0d6ZBiRo/edit?usp=sharing

## Componentes:
- **Anna Júlia Galvão de Medeiros**
- **Andrei Moisés Medeiros Delfino**
- **Jeffersson Dos Anjos Santos**
- **Luiza Souza e Silva**
- **Henrique Soares Oliveira Medeiros**
