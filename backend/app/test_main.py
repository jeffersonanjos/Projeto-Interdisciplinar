from fastapi.testclient import TestClient
from main import app
import pytest
import httpx
from schemas import UserRead

UserRead.model_rebuild()

@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client

def test_read_main(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Bem-vindo ao Sistema de Recomendação de Livros e Filmes"}

def test_create_user(client: TestClient):
    response = client.post(
        "/users/",
        json={"username": "testuser", "email": "test@example.com", "password": "testpassword"},
    )
    assert response.status_code == 200
    assert response.json()["username"] == "testuser"
    assert response.json()["email"] == "test@example.com"
