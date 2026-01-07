from fastapi.testclient import TestClient
from src.app import app

client = TestClient(app)


def test_get_activities():
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    # Basic sanity checks
    assert isinstance(data, dict)
    assert "Basketball Team" in data


def test_signup_and_delete_flow():
    email = "testuser@example.com"
    activity = "Basketball Team"

    # Ensure clean state: remove if already present
    r = client.get("/activities")
    participants = r.json()[activity]["participants"]
    if email in participants:
        r = client.delete(f"/activities/{activity}/participants", params={"email": email})
        assert r.status_code == 200

    # Sign up
    r = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    # Confirm participant present
    r = client.get("/activities")
    assert email in r.json()[activity]["participants"]

    # Duplicate signup should return 400
    r = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert r.status_code == 400

    # Remove participant
    r = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert r.status_code == 200
    assert "Removed" in r.json().get("message", "")

    # Confirm removed
    r = client.get("/activities")
    assert email not in r.json()[activity]["participants"]


def test_remove_nonexistent_participant():
    email = "noone@example.com"
    activity = "Tennis Club"

    r = client.get("/activities")
    if email in r.json()[activity]["participants"]:
        r = client.delete(f"/activities/{activity}/participants", params={"email": email})
        assert r.status_code == 200

    # Attempt to remove non-existent participant
    r = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert r.status_code == 400
    assert "not signed up" in r.json().get("detail", "").lower()