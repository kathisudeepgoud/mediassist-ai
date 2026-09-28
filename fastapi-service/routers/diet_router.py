import csv
import sys
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
FASTAPI_ROOT = Path(__file__).resolve().parent.parent

for p in [str(PROJECT_ROOT), str(FASTAPI_ROOT)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from services.diet.schemas import OptimizeDietRequest, OptimizeDietResponse
    from services.diet.services.diet_service import DietService
except ImportError:
    from fastapi_service.services.diet.schemas import OptimizeDietRequest, OptimizeDietResponse
    from fastapi_service.services.diet.services.diet_service import DietService

router = APIRouter(prefix="/api/v1/diet", tags=["MILP Diet Optimization Engine"])

# Cached IFCT 2017 Foods loaded from source
_CACHED_IFCT_FOODS: List[Dict[str, Any]] = []

def load_local_ifct_foods() -> List[Dict[str, Any]]:
    """Loads IFCT 2017 foods directly from data_source/ifct2017 CSV files."""
    global _CACHED_IFCT_FOODS
    if _CACHED_IFCT_FOODS:
        return _CACHED_IFCT_FOODS

    ifct_dir = PROJECT_ROOT / "data_source" / "ifct2017"
    comp_file = ifct_dir / "compositions" / "index.csv"
    desc_file = ifct_dir / "descriptions" / "index.csv"
    group_file = ifct_dir / "groups" / "index.csv"

    if not comp_file.exists():
        return []

    # 1. Load groups
    groups = {}
    if group_file.exists():
        with open(group_file, mode="r", encoding="utf-8") as gf:
            reader = csv.DictReader(gf)
            for row in reader:
                code = row.get("code") or row.get("grup")
                name = row.get("group") or row.get("name")
                if code:
                    groups[code.strip()] = name.strip() if name else code

    # 2. Load representations / scale factors
    rep_file = ifct_dir / "representations" / "index.csv"
    rep_factors = {}
    if rep_file.exists():
        with open(rep_file, mode="r", encoding="utf-8") as rf:
            reader = csv.DictReader(rf)
            for row in reader:
                c = row.get("code")
                factor_str = row.get("factor")
                if c and factor_str:
                    try:
                        rep_factors[c.strip()] = float(factor_str)
                    except ValueError:
                        pass

    # 3. Load descriptions
    descriptions = {}
    if desc_file.exists():
        with open(desc_file, mode="r", encoding="utf-8") as df:
            reader = csv.DictReader(df)
            for row in reader:
                code = row.get("code")
                name = row.get("name")
                sc_name = row.get("sc_name")
                tags = row.get("tags", "").split()
                if code:
                    descriptions[code.strip()] = {
                        "name": name.strip() if name else code,
                        "sc_name": sc_name.strip() if sc_name else None,
                        "tags": tags
                    }

    # 4. Load compositions
    foods = []
    with open(comp_file, mode="r", encoding="utf-8") as cf:
        reader = csv.DictReader(cf)
        for row in reader:
            code = row.get("code", "").strip()
            if not code:
                continue

            g_code = code[0].upper()
            g_name = groups.get(g_code, "Other Foods")
            desc_info = descriptions.get(code, {})
            f_name = desc_info.get("name") or row.get("name") or f"IFCT Food {code}"

            nutrients = {}
            for k, v in row.items():
                if k in ("code", "name"):
                    continue
                try:
                    cleaned = str(v).replace(",", "").replace("<", "").replace(">", "").strip()
                    if cleaned:
                        raw_val = float(cleaned)
                        scale = rep_factors.get(k, 1.0)
                        nutrients[k] = raw_val * scale
                except (ValueError, TypeError):
                    pass

            foods.append({
                "food_code": code,
                "food_name": f_name,
                "scientific_name": desc_info.get("sc_name"),
                "dietary_tags": desc_info.get("tags", []),
                "local_names_raw": "",
                "group_code": g_code,
                "group_name": g_name,
                "nutrients": nutrients
            })

    _CACHED_IFCT_FOODS = foods
    return _CACHED_IFCT_FOODS

@router.get("/health")
async def diet_engine_health():
    """Health check endpoint for the MILP optimization engine."""
    foods = load_local_ifct_foods()
    return {
        "status": "HEALTHY",
        "engine": "Mixed Integer Linear Programming (MILP)",
        "solver": "PuLP-CBC / SciPy-HiGHS",
        "dataset": "IFCT 2017 (NIN/ICMR)",
        "cachedFoodsCount": len(foods)
    }

@router.post("/optimize", response_model=OptimizeDietResponse)
def optimize_diet_plan(payload: OptimizeDietRequest):
    """
    Generate a clinically constrained, multi-objective optimized diet plan using MILP.
    Replaces procedural IF-ELSE rules with mathematical linear optimization.
    """
    try:
        # Use provided foods or load from local IFCT dataset
        food_db = []
        if payload.foods:
            food_db = [f.model_dump() for f in payload.foods]
        else:
            food_db = load_local_ifct_foods()

        if not food_db:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Food database is empty. Unable to run MILP optimization."
            )

        response = DietService.generate_personalized_plan(
            request=payload,
            food_database=food_db
        )
        return response

    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MILP Diet Optimization error: {str(e)}"
        )
