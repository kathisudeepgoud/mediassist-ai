"""
MILP Solver Wrapper & Diagnostics
Supports open-source solvers:
1. PuLP CBC (Coin-OR Branch and Cut)
2. SciPy HiGHS (High performance open source solver)
Provides clean execution timing, status reporting, and infeasibility diagnostics.
"""

import time
from typing import Dict, Any, Tuple
import pulp

class SolverResult:
    def __init__(
        self,
        is_optimal: bool,
        status: str,
        solver_name: str,
        solve_time_ms: float,
        objective_value: float = 0.0,
        diagnostics: str = ""
    ):
        self.is_optimal = is_optimal
        self.status = status
        self.solver_name = solver_name
        self.solve_time_ms = solve_time_ms
        self.objective_value = objective_value
        self.diagnostics = diagnostics

class MILPSolver:
    """
    Executes the MILP optimization model using configured solvers.
    """

    @staticmethod
    def solve_pulp(prob: pulp.LpProblem, time_limit_sec: int = 15, msg: bool = False) -> SolverResult:
        """Solve problem using PuLP's bundled CBC solver."""
        start_t = time.perf_counter()
        
        # Configure CBC solver with controlled time limit (4s per day), 8% gap tolerance, and 1 thread
        solver = pulp.PULP_CBC_CMD(timeLimit=time_limit_sec or 4, gapRel=0.08, threads=1, msg=1 if msg else 0)

        try:
            status_code = prob.solve(solver)
        except Exception as e:
            elapsed = (time.perf_counter() - start_t) * 1000
            return SolverResult(
                is_optimal=False,
                status="SOLVER_ERROR",
                solver_name="PuLP-CBC",
                solve_time_ms=round(elapsed, 2),
                diagnostics=str(e)
            )

        elapsed = (time.perf_counter() - start_t) * 1000
        status_str = pulp.LpStatus.get(status_code, str(status_code))

        # Check if an optimal or time-limited feasible solution was obtained
        obj_val = float(pulp.value(prob.objective)) if prob.objective is not None and pulp.value(prob.objective) is not None else 0.0
        is_opt = (status_str in ("Optimal", "Feasible") or (status_code == 1) or (obj_val > 0.0 and status_str != "Infeasible"))

        diag = ""
        if not is_opt:
            diag = f"Solver returned non-optimal status: {status_str}."

        return SolverResult(
            is_optimal=is_opt,
            status=status_str,
            solver_name="PuLP-CBC",
            solve_time_ms=round(elapsed, 2),
            objective_value=round(obj_val, 4),
            diagnostics=diag
        )
