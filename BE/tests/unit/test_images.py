from fastapi.testclient import TestClient
from BE.main import create_app

def test_images_reference_get():
    app = create_app()
    client = TestClient(app)
    response = client.get("/images/reference?projectId=test-proj")
    assert response.status_code == 200
    data = response.json()
    assert data["Status"]["IsFailed"] is False
    assert data["Data"]["id"] is not None

def test_images_reference_put():
    app = create_app()
    client = TestClient(app)
    response = client.put("/images/reference", json={"projectId": "test-proj", "imageId": "new-img"})
    assert response.status_code == 200
    data = response.json()
    assert data["Status"]["IsFailed"] is False
