from urllib.parse import quote
from uuid import uuid4

from fastapi.testclient import TestClient

from src.app import app, activities


client = TestClient(app)


def random_email():
    return f"test_{uuid4().hex[:8]}@example.com"


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_duplicate_signup_returns_400():
    activity = "Chess Club"
    email = "michael@mergington.edu"
    # ensure initial fixture contains this participant
    assert email in activities[activity]["participants"]

    resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert resp.status_code == 400
    assert resp.json().get("detail") == "Student is already signed up"


def test_signup_and_unregister_delete_and_post_alias():
    activity = "Chess Club"
    email = random_email()

    # Ensure fresh email not present
    assert email not in activities[activity]["participants"]

    # Sign up
    resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    # Remove using DELETE endpoint
    resp = client.delete(f"/activities/{quote(activity)}/participants?email={quote(email)}")
    assert resp.status_code == 200
    assert email not in activities[activity]["participants"]

    # Sign up again and remove using POST alias
    resp = client.post(f"/activities/{quote(activity)}/signup?email={quote(email)}")
    assert resp.status_code == 200
    assert email in activities[activity]["participants"]

    resp = client.post(f"/activities/{quote(activity)}/unregister?email={quote(email)}")
    assert resp.status_code == 200
    assert email not in activities[activity]["participants"]
