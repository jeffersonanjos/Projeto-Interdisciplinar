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
1. **Cadastro e Login de Usuários** ✅ **CONCLUÍDO** (Sistema completo implementado)
2. **Busca e Exibição de Livros e Filmes** ❌ **PENDENTE** (Modelos criados, endpoints não implementados)
3. **Sistema de Avaliação (notas e comentários)** ✅ **CONCLUÍDO** (Endpoint de criação de avaliações implementado)
4. **Recomendações personalizadas** ❌ **PENDENTE** (Modelo criado, algoritmo não implementado)
5. **Integração com APIs externas (Google Books)** [-] **EM ANDAMENTO** (Implementado busca de livros)
6. **Exibição de cards com capas, notas e sinopses** ❌ **PENDENTE** (Frontend não implementado)
7. **Histórico de Avaliações no perfil do usuário** ❌ **PENDENTE** (Endpoints não implementados)

## Status do Projeto (Nov/2025)

- **Fase atual:** backbone do backend modularizado, com routers especializados e reutilizáveis para cada domínio (usuários, avaliações, biblioteca, etc.).
- **Objetivo recente:** concluir a refatoração descrita nos commits `modularização do código` e `Remove múltiplos routers...`, garantindo manutenção simples e expansão guiada por módulos.
- **Próximo foco:** ampliar as funcionalidades pendentes (recomendações, histórico completo e CRUDs avançados) aproveitando a nova base organizada.

### Google Books API Integration:
- The backend has been integrated with the Google Books API to search for books by query.
- The frontend has been updated to allow users to search for books and display the results.

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
- **Integração com APIs Externas**: Google Books (search implemented) and IMDb
- **Sistema de Recomendações**: Algoritmo de recomendação personalizada
- **Frontend**: Interface web responsiva
- **Endpoints de Histórico**: Buscar avaliações do usuário
- **Endpoints de Recomendações**: Buscar recomendações do usuário

### 🔧 **Code Examples:**

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

### 📁 Arquitetura Atual dos Routers

Todo o backend foi reorganizado seguindo o guia `app/routers/mapa/ESTRUTURA_FINAL.md`. A árvore abaixo resume a estrutura definitiva dos módulos:

```
routers/
├── __init__.py              # Router principal (agrega todos)
├── utils.py                 # Utilitários compartilhados
│
├── users/
│   ├── __init__.py
│   ├── auth.py              # Autenticação (login/token)
│   ├── crud.py              # CRUD básico
│   ├── search.py            # Busca de usuários
│   ├── follow.py            # Sistema de follow
│   ├── activities.py        # Atividades do usuário
│   ├── user_reviews.py      # Avaliações de usuários
│   └── timeline.py          # Timeline da comunidade
│
├── ratings/
│   ├── __init__.py
│   ├── crud.py              # CRUD de ratings
│   ├── user_ratings.py      # Ratings por usuário
│   └── reviews.py           # Wrapper para reviews
│
├── profile/
│   ├── __init__.py
│   ├── crud.py              # CRUD de perfis
│   ├── avatar.py            # Upload/remoção de avatares
│   └── delete.py            # Deleção de perfis
│
├── books/
│   ├── __init__.py
│   ├── search.py            # Busca de livros
│   ├── detail.py            # Detalhes de livros
│   └── genres.py            # Atualização de gêneros
│
├── movies/
│   ├── __init__.py
│   ├── search.py            # Busca de filmes
│   ├── detail.py            # Detalhes de filmes
│   └── genres.py            # Atualização de gêneros
│
├── library/
│   ├── __init__.py
│   ├── books.py             # Biblioteca de livros
│   └── movies.py            # Biblioteca de filmes
│
└── recommendations/
    ├── __init__.py
    ├── books.py             # Recomendações de livros
    └── movies.py            # Recomendações de filmes
```

**Estatísticas da modularização**
- 7 módulos principais consolidados.
- Maior arquivo ~165 linhas (`ratings/crud.py`).
- 26+ arquivos `.py` organizados, com redução média de 70% no tamanho de cada arquivo.
- Na raiz permanecem apenas `__init__.py` e `utils.py`, facilitando imports e reaproveitamento.

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
- **Integrações:** Google Books API, IMDb API.  
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
