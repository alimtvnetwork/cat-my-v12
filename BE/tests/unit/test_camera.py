from BE.main import create_app
from fastapi.testclient import TestClient


def test_camera_status():
    app = create_app()
    client = TestClient(app)
    response = client.get("/camera/status?cameraId=test-cam")
    assert response.status_code == 200
    data = response.json()
    assert data["Status"]["IsFailed"] is False
    assert data["Data"]["status"] == "connected"
