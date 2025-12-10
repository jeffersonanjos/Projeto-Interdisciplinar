IMPORTANTE: para acessar privilégios de administrador do Alexandria, entre com a seguinte conta:
- alexandria
- 123456

# Escopo do Projeto  
**Título:** Sistema de Recomendação de Livros e Filmes com Avaliações Personalizadas  

## Objetivo Geral  
Desenvolver um sistema web interativo que permita aos usuários cadastrar, avaliar e descobrir livros e filmes, recebendo recomendações personalizadas de acordo com suas preferências e histórico de avaliações.

## Objetivos Específicos  
- Criar uma interface intuitiva e responsiva, inspirada no layout de plataformas de streaming.  
- Implementar sistema de cadastro e autenticação de usuários.  
- Permitir que os usuários avaliem livros e filmes com notas e comentários.  
- Utilizar algoritmos de similaridade ou aprendizado de máquina para gerar recomendações personalizadas.  
- Integrar o sistema com APIs externas, como Google Books (livros) e IMDb (filmes), para buscar automaticamente informações e capas.  
- Disponibilizar histórico de avaliações e recomendações no perfil de cada usuário.  

## Público-Alvo  
Leitores e cinéfilos que desejam descobrir novos conteúdos com base em preferências pessoais, buscando praticidade e personalização na experiência.

## Como resolver o problema no github com email e nome
```text
git config --global user.name "Jefferson Santos"
git config --global user.email "jefferson.anjos@escolar.ifrn.edu.br"
```


## Executando o back-end passo a passo
O sistema **só funciona corretamente** quando você inicia o servidor **dentro da pasta `app`**, porque todos os imports e caminhos relativos foram configurados considerando esse diretório. Siga os passos abaixo:

### Entrando na pasta `app`
No terminal, estando na raiz do projeto, execute:
```bash
cd app
uvicorn main:app --reload --port 8001
```
---

### Instalando as dependências

No terminal, estando dentro da pasta do front-end, execute:

```bash
npm install
npm run dev
```

## Funcionalidades Principais  
1. **Cadastro e Login de Usuários** **CONCLUÍDO** (Sistema completo implementado com JWT)
2. **Busca e Exibição de Livros e Filmes** **CONCLUÍDO** (Integração com Google Books e OMDb APIs)
3. **Sistema de Avaliação (notas e comentários)** **CONCLUÍDO** (CRUD completo de avaliações)
4. **Recomendações personalizadas** **CONCLUÍDO** (Algoritmo baseado em gêneros e autores)
5. **Integração com APIs externas** **CONCLUÍDO** (Google Books, OMDb, TMDb)
6. **Biblioteca Pessoal** **CONCLUÍDO** (Gerenciamento de livros e filmes salvos)
7. **Sistema Social** **CONCLUÍDO** (Follow, timeline, perfis)
8. **Sistema de Moderação** **CONCLUÍDO** (Relatórios, ban, mute, roles)
9. **Interface Responsiva** **CONCLUÍDO** (18 componentes React, tema claro/escuro)

## Status do Projeto (Dez/2025)

**Versão:** 0.2.1

- **Fase atual:** Sistema completo e funcional com backend modularizado e frontend responsivo
- **Arquitetura:** SPA (Single Page Application) com API RESTful
- **Backend:** 80+ endpoints organizados em 9 módulos especializados
- **Frontend:** 18 componentes React com tema adaptativo e Context API
- **Banco de Dados:** 10 entidades com relacionamentos completos
- **Autenticação:** Sistema JWT com 3 níveis de acesso (normal, curator, admin)
- **Integrações:** Google Books API, OMDb API, TMDb API (fallback)
- **Documentação:** SITEMAP completo com 981 linhas documentando toda arquitetura

### **IMPLEMENTADO:**

**Backend (FastAPI 0.115.6):**
- **9 Módulos REST** com 80+ endpoints especializados
- **Modelos de Dados**: 10 entidades (User, Book, Movie, Rating, UserReview, UserProfile, UserLibrary, Follow, Report, Moderation)
- **Banco de Dados**: MySQL com SQLModel/SQLAlchemy
- **Autenticação JWT Completa**:
  - Hash bcrypt, tokens com expiração configurável
  - 3 níveis de acesso: normal, curator, admin
  - Proteção de rotas com dependencies
- **CRUD Completo**: Usuários, livros, filmes, avaliações, perfis
- **Sistema Social**: Follow/unfollow, timeline, atividades
- **Biblioteca Pessoal**: Gerenciamento de livros e filmes salvos
- **Recomendações**: Algoritmo baseado em gêneros e autores da biblioteca
- **Sistema de Moderação**: Relatórios, ban, mute, promoção/demoção de usuários
- **Upload de Arquivos**: Sistema de avatar com multipart/form-data
- **Integração Externa**: Google Books API, OMDb API, TMDb API (fallback)
- **Documentação**: Swagger UI e ReDoc automáticos

**Frontend (React 18.3.1 + Vite 6.0.3):**
- **18 Componentes React** organizados por função
- **Context API**: AuthContext, ThemeContext, UpdateContext
- **Rotas Protegidas**: Sistema de proteção com ProtectedRoute
- **5 Views do Dashboard**: Home, Search, Library, Recommendations, Profile
- **Tema Adaptativo**: Modo claro/escuro
- **Sistema de Notificações**: Toast não-invasivo
- **Modais**: Details, CreateMedia, Moderation, Reports, UserReviews
- **10+ Serviços API**: Comunicação modular com backend via Axios
- **Interceptors JWT**: Adição automática de token nas requisições

### **Code Examples:**

#### Backend (backend/app/routers.py):
```python
from google_books import search_books as google_search_books, get_book_by_id

@router.get("/books/search", response_model=List[BookRead], tags=["books"])
async def search_books(query: str, session: Session = Depends(get_session)):
    logger.info(f"Searching for books with query: {query}")
    books = google_search_books(query)
    # Convert the books to BookRead schema
    book_list = []
    for book in books:
        volume_info = book.get("volumeInfo", {})
        book_data = BookRead(
            id=book.get("id", "N/A"),
            title=volume_info.get("title", "N/A"),
            authors=volume_info.get("authors", ["N/A"]),
            description=volume_info.get("description", "N/A"),
            image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
        )
        book_list.append(book_data)
    return book_list

@router.get("/books/{book_id}", response_model=BookRead, tags=["books"])
async def get_book(book_id: str, session: Session = Depends(get_session)):
    logger.info(f"Getting book with book_id: {book_id}")
    book = get_book_by_id(book_id)
    if book:
        volume_info = book.get("volumeInfo", {})
        book_data = BookRead(
            id=book.get("id", "N/A"),
            title=volume_info.get("title", "N/A"),
            authors=volume_info.get("authors", ["N/A"]),
            description=volume_info.get("description", "N/A"),
            image_url=volume_info.get("imageLinks", {}).get("thumbnail", None),
        )
        return book_data
    else:
        raise HTTPException(status_code=404, detail="Book not found")
```

#### Frontend (frontend/src/components/Search.jsx):
```javascript
import { externalApiService } from '../services/apiService';

const handleSearch = async () => {
  console.log("Search handleSearch called with query:", query);
  setLoading(true);
  setError('');

  try {
    const bookResponse = await externalApiService.searchBooksFromBackend(query);
    console.log("Search handleSearch bookResponse:", bookResponse);
    if (bookResponse.success) {
      setBookResults(bookResponse.data);
      console.log("Search handleSearch bookResults set:", bookResponse.data);
    } else {
      setError(bookResponse.error || 'Erro ao buscar livros');
      console.error("Search handleSearch getBooksFromBackend error:", bookResponse.error);
    }
  } catch (error) {
    setError('Erro ao realizar a busca.');
    console.error("Search handleSearch general error:", error);
  } finally {
    setLoading(false);
    console.log("Search handleSearch loading set to false");
  }
};
```

### Arquitetura Atual dos Routers

Backend modularizado em 9 módulos especializados:

```
routers/
├── __init__.py              # Router principal (agrega todos)
├── utils.py                 # Utilitários compartilhados
│
├── users/                   # Módulo de Usuários
│   ├── __init__.py
│   ├── auth.py              # Autenticação (login/token)
│   ├── crud.py              # CRUD básico de usuários
│   ├── search.py            # Busca de usuários
│   ├── follow.py            # Sistema de follow/unfollow
│   ├── activities.py        # Atividades do usuário
│   ├── user_reviews.py      # Avaliações entre usuários
│   ├── timeline.py          # Timeline da comunidade
│   └── moderation.py        # Promoção/demoção (admin)
│
├── ratings/                 # Módulo de Avaliações
│   ├── __init__.py
│   ├── crud.py              # CRUD de ratings (livros/filmes)
│   ├── user_ratings.py      # Ratings por usuário
│   └── reviews.py           # Reviews com detalhes completos
│
├── profile/                 # Módulo de Perfis
│   ├── __init__.py
│   ├── crud.py              # CRUD de perfis
│   ├── avatar.py            # Upload/remoção de avatares
│   └── delete.py            # Deleção de contas
│
├── books/                   # Módulo de Livros
│   ├── __init__.py
│   ├── search.py            # Busca via Google Books API
│   ├── detail.py            # Detalhes de livros
│   ├── crud.py              # Adicionar livros manualmente
│   └── genres.py            # Atualização de gêneros
│
├── movies/                  # Módulo de Filmes
│   ├── __init__.py
│   ├── search.py            # Busca via OMDb/TMDb APIs
│   ├── detail.py            # Detalhes de filmes
│   ├── crud.py              # Adicionar filmes manualmente
│   └── genres.py            # Atualização de gêneros
│
├── library/                 # Módulo de Biblioteca Pessoal
│   ├── __init__.py
│   ├── books.py             # Biblioteca de livros
│   └── movies.py            # Biblioteca de filmes
│
├── recommendations/         # Módulo de Recomendações
│   ├── __init__.py
│   ├── books.py             # Recomendações de livros
│   └── movies.py            # Recomendações de filmes
│
├── reports/                 # Módulo de Relatórios
│   ├── __init__.py
│   └── crud.py              # CRUD de denúncias e busca de conteúdo
│
└── moderation/              # Módulo de Moderação
    ├── __init__.py
    ├── users.py             # Moderação de usuários (ban/mute)
    ├── books.py             # Moderação de livros
    └── movies.py            # Moderação de filmes
```

**Estatísticas da modularização:**
- **9 módulos** principais especializados
- **80+ endpoints REST** organizados
- **30+ arquivos** `.py` com responsabilidades únicas
- Redução média de **70%** no tamanho de cada arquivo
- Facilita manutenção, testes e expansão futura

### **TECNOLOGIAS UTILIZADAS:**

**Backend:**
- **Framework**: FastAPI 0.115.6
- **Linguagem**: Python 3.x
- **Banco de Dados**: MySQL
- **ORM**: SQLModel + SQLAlchemy
- **Validação**: Pydantic
- **Autenticação**: JWT (python-jose[cryptography])
- **Hash de Senhas**: bcrypt (passlib)
- **Servidor**: Uvicorn
- **CORS**: FastAPI CORS Middleware
- **APIs Externas**: Google Books API, OMDb API, TMDb API

**Frontend:**
- **Framework**: React 18.3.1
- **Build Tool**: Vite 6.0.3
- **Roteamento**: React Router DOM
- **HTTP Client**: Axios
- **State Management**: Context API (Auth, Theme, Update)
- **Estilização**: CSS Modules

**Segurança:**
- OAuth2 Password Bearer Flow
- JWT tokens com expiração configurável (30 min)
- Hash bcrypt com salt automático
- Role-based access control (RBAC)
- Proteção de rotas frontend e backend

### **ENDPOINTS DISPONÍVEIS (80+):**

**Base URL:** http://localhost:8001  
**Documentação Interativa:** http://localhost:8001/docs

#### **Autenticação e Usuários (/users):**
- `POST /token` - Login OAuth2 (form-data)
- `POST /login` - Login JSON
- `POST /users/` - Cadastrar novo usuário
- `GET /users/me/` - Dados do usuário autenticado
- `PUT /users/{user_id}` - Atualizar usuário
- `GET /users/search` - Buscar usuários
- `POST /users/{user_id}/follow` - Seguir usuário
- `DELETE /users/{user_id}/follow` - Deixar de seguir
- `GET /users/{user_id}/followers` - Listar seguidores
- `GET /users/{user_id}/following` - Listar seguidos
- `GET /users/{user_id}/activities` - Atividades do usuário
- `GET /timeline` - Timeline da comunidade
- `POST /users/{user_id}/promote` - Promover a curador (admin)
- `POST /users/{user_id}/demote` - Remover cargo (admin)
- `GET /users/curators` - Listar curadores

#### **Livros (/books):**
- `GET /books/search` - Buscar livros (Google Books API)
- `GET /books/{book_id}` - Detalhes do livro
- `POST /books/manual` - Adicionar livro manualmente
- `PUT /books/{book_id}/update-genres` - Atualizar gêneros
- `POST /books/update-all-genres` - Atualizar gêneros de todos

#### **Filmes (/movies):**
- `GET /movies/search` - Buscar filmes (OMDb/TMDb APIs)
- `GET /movies` - Busca pública de filmes
- `GET /movies/{external_id}` - Detalhes do filme (IMDb ID)
- `POST /movies/manual` - Adicionar filme manualmente
- `PUT /movies/{movie_id}/update-genres` - Atualizar gêneros
- `POST /movies/update-all-genres` - Atualizar gêneros de todos

#### **Avaliações (/ratings):**
- `POST /ratings/` - Criar avaliação (protegido)
- `PUT /ratings/{rating_id}` - Atualizar avaliação
- `DELETE /ratings/{rating_id}` - Deletar avaliação
- `GET /users/{user_id}/ratings` - Avaliações do usuário
- `GET /users/{user_id}/reviews` - Reviews completos

#### **Biblioteca Pessoal (/library):**
- `GET /users/{user_id}/library` - Biblioteca de livros
- `POST /library/add` - Adicionar livro
- `DELETE /library/remove` - Remover livro
- `GET /users/{user_id}/library/movies` - Biblioteca de filmes
- `POST /library/movies/add` - Adicionar filme
- `DELETE /library/movies/remove` - Remover filme

#### **Recomendações (/recommendations):**
- `GET /users/{user_id}/recommendations/books` - Recomendações de livros
- `GET /users/{user_id}/recommendations/movies` - Recomendações de filmes

#### **Perfis (/profiles):**
- `POST /` - Criar perfil
- `GET /{user_id}` - Obter perfil
- `POST /{user_id}/upload-avatar` - Upload de avatar
- `DELETE /{user_id}/avatar` - Remover avatar
- `DELETE /{user_id}` - Deletar conta

#### **Relatórios e Moderação (/reports, /moderation):**
- `POST /reports/` - Criar relatório/denúncia
- `GET /reports/` - Listar relatórios (curator/admin)
- `GET /reports/{report_id}` - Obter relatório específico
- `PATCH /reports/{report_id}` - Atualizar status
- `DELETE /reports/{report_id}` - Deletar relatório
- `GET /reports/search/books` - Buscar livros para moderação
- `GET /reports/search/movies` - Buscar filmes para moderação
- `POST /moderation/users/{user_id}/ban` - Banir usuário (admin)
- `POST /moderation/users/{user_id}/unban` - Desbanir usuário
- `POST /moderation/users/{user_id}/mute` - Silenciar usuário
- `POST /moderation/books/{book_id}/ban` - Banir livro (admin)
- `POST /moderation/movies/{movie_id}/mute` - Silenciar filme

**Documentação Completa:** Consulte o arquivo `SITEMAP.md` para detalhes de todos os endpoints

## Documentação Completa

- **SITEMAP.md**: Documentação técnica completa (981 linhas) com arquitetura, API endpoints, modelos de dados, autenticação, integrações e estrutura de código
- **ROTEIRO_APRESENTACAO.md**: Roteiro completo para apresentação de 15 minutos cobrindo UI, Sistemas Web e SOA
- **Swagger UI**: http://localhost:8001/docs (documentação interativa automática)
- **ReDoc**: http://localhost:8001/redoc (documentação alternativa)  

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

# Slide de apresentação
https://www.canva.com/design/DAG7EPmjaJo/CcLLCUuXOFOFpzNY5xvqoQ/edit?utm_content=DAG7EPmjaJo&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton

# Requisitos do Projeto 
https://docs.google.com/document/d/1agT58mKhabCQoydbFlBOjwG71Odg-32IwTi0d6ZBiRo/edit?usp=sharing

## Componentes:
- **Anna Júlia Galvão de Medeiros**
- **Andrei Moisés Medeiros Delfino**
- **Jeffersson Dos Anjos Santos**
- **Luiza Souza e Silva**
- **Henrique Soares Oliveira Medeiros**
