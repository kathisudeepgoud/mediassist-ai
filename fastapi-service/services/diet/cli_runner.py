"""
MILP Diet Optimization CLI Bridge
Allows Node.js / CLI callers to invoke the MILP Diet Optimizer via argument/file or stdin/stdout JSON streaming.
"""

import sys
import json
from pathlib import Path

# Add project root and fastapi-service root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
FASTAPI_ROOT = PROJECT_ROOT / "fastapi-service"

for p in [str(FASTAPI_ROOT), str(PROJECT_ROOT)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from services.diet.schemas import OptimizeDietRequest
from services.diet.services.diet_service import DietService
from routers.diet_router import load_local_ifct_foods

def main():
    try:
        raw_input = ""
        # Check if input file path is passed as command line argument
        if len(sys.argv) > 1 and Path(sys.argv[1]).exists():
            with open(sys.argv[1], "r", encoding="utf-8") as f:
                raw_input = f.read()
        elif len(sys.argv) > 1 and sys.argv[1].startswith("{"):
            raw_input = sys.argv[1]
        else:
            raw_input = sys.stdin.read()

        if not raw_input or not raw_input.strip():
            print(json.dumps({"success": False, "error": "Empty input payload"}))
            sys.exit(1)

        payload_dict = json.loads(raw_input)
        request = OptimizeDietRequest(**payload_dict)

        food_db = []
        if request.foods:
            food_db = [f.model_dump() for f in request.foods]
        else:
            food_db = load_local_ifct_foods()

        if not food_db:
            print(json.dumps({"success": False, "error": "Food database is empty"}))
            sys.exit(1)

        response = DietService.generate_personalized_plan(request, food_db)
        print(json.dumps(response.model_dump()))
        sys.exit(0)

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
