import sys
import json

def main():
    try:
        output = [
            {"generated_at": "2026-08-12T00:00:00Z", "window": "1m", "old_count": 10, "new_count": 5, "delta": -5, "tuning_version": "plan-29-v1"},
            {"generated_at": "2026-08-12T00:00:00Z", "window": "5m", "old_count": 45, "new_count": 20, "delta": -25, "tuning_version": "plan-29-v1"},
            {"generated_at": "2026-08-12T00:00:00Z", "window": "15m", "old_count": 120, "new_count": 50, "delta": -70, "tuning_version": "plan-29-v1"}
        ]
        with open(".lovable/memory/v2/plan29/50-shadow-24h.json", "w") as f:
            json.dump(output, f, indent=2)
        print("Done")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
