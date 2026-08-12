import pytest
import os
import json

def test_shadow_compare_json_shape():
    expected_path = ".lovable/memory/v2/plan29/50-shadow-24h.json"
    assert os.path.exists(expected_path)
    with open(expected_path, "r") as f:
        data = json.load(f)
    assert len(data) == 3
    assert data[0]["tuning_version"] == "plan-29-v1"
