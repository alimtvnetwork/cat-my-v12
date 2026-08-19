import json
from pathlib import Path

import numpy as np

from BE.cli.processing.commands.evaluate import handle


class MockLogger:
    def log(self, *args, **kwargs): pass

class MockSessionCtx:
    def __init__(self):
        self.logger = MockLogger()
        self.session_id = "test"

class MockArgs:
    def __init__(self, frame, bundle):
        self.frame = frame
        self.bundle = bundle
        self.run_id = "test-run"
        self.results_dir = None
        self.mode = "auto"
        self.task_db_root = None

def test_evaluate_npy_fixture(tmp_path: Path) -> None:
    # Create valid npy
    frame_path = tmp_path / "frame.npy"
    arr = np.zeros((100, 100, 3), dtype=np.uint8)
    np.save(frame_path, arr)

    # Create valid bundle
    bundle_path = tmp_path / "bundle.json"
    bundle_path.write_text(json.dumps({"rules": []}))

    args = MockArgs(str(frame_path), str(bundle_path))
    ctx = MockSessionCtx()

    results = handle(args, ctx) # type: ignore
    assert len(results) == 1
    assert results[0]["Verdict"] == "Pass"
