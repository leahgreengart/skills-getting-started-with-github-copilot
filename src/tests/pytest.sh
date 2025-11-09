pytest
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from src.app import app, activities, signup_for_activity  # noqa: F401

client = TestClient(app)


def test_duplicate_signup_returns_400_and_no_duplicate():
    activity_name = "Chess Club"
    email = "michael@mergington.edu"  # already in initial participants

    original_count = len(activities[activity_name]["participants"])

    url = f"/activities/{quote(activity_name)}/signup?email={quote(email)}"
    response = client.post(url)

    assert response.status_code == 400
    body = response.json()
    assert body.get("detail") == "Student is already signed up"

    # Ensure participant list was not changed
    assert len(activities[activity_name]["participants"]) == original_count