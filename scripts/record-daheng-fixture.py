import argparse
import sys
import time
import numpy as np
from pathlib import Path
from BE.sdk_facade.vendors.daheng.facade import DahengCameraFacade

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--serial", required=True)
    parser.add_argument("--count", type=int, default=5)
    parser.add_argument("--outdir", default="BE/tests/fixtures/daheng")
    ns = parser.parse_args()
    
    outdir = Path(ns.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    
    facade = DahengCameraFacade()
    facade.open(ns.serial)
    facade.start_stream()
    
    try:
        for i in range(ns.count):
            frame = facade.grab(2000)
            arr = np.frombuffer(frame.data, dtype=np.uint8).reshape((frame.height, frame.width, 3))
            filename = outdir / f"frame_{i}_{frame.timestamp_ns}.npy"
            np.save(filename, arr)
            print(f"Saved {filename}")
            time.sleep(0.5)
    finally:
        facade.stop_stream()
        facade.close()
    return 0

if __name__ == "__main__":
    sys.exit(main())
