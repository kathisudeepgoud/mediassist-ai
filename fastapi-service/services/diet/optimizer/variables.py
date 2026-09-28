"""
MILP Decision Variables Formulation
Defines variables for food selection, continuous quantity, meal assignments, and objective slack variables.
"""

from typing import List, Dict, Tuple, Any
import pulp

class OptimizationVariables:
    """
    Manages decision variables for the MILP problem.
    
    Variables:
    - x[f_idx, m_idx]: Continuous quantity factor (serving multiplier) of candidate food f in meal slot m.
    - y[f_idx, m_idx]: Binary indicator (1 if food f is selected in meal slot m, 0 otherwise).
    - z[f_idx]: Binary indicator (1 if food f is consumed anytime in the day, 0 otherwise).
    - Slack variables for multi-objective target deviations (calories, nutrients).
    """

    def __init__(self, prob: pulp.LpProblem, foods: List[Dict[str, Any]], meal_slots: List[str]):
        self.prob = prob
        self.foods = foods
        self.meal_slots = meal_slots
        self.num_foods = len(foods)
        self.num_meals = len(meal_slots)

        self.x: Dict[Tuple[int, int], pulp.LpVariable] = {}
        self.y: Dict[Tuple[int, int], pulp.LpVariable] = {}
        self.z: Dict[int, pulp.LpVariable] = {}

        # Slacks for soft goals
        self.slack_cal_pos: pulp.LpVariable = None
        self.slack_cal_neg: pulp.LpVariable = None
        self.slack_prot_neg: pulp.LpVariable = None
        self.slack_fib_neg: pulp.LpVariable = None
        self.slack_fe_neg: pulp.LpVariable = None
        self.slack_vitc_neg: pulp.LpVariable = None

        self._create_variables()

    def _create_variables(self):
        # Create x[f, m] and y[f, m]
        for f_idx in range(self.num_foods):
            # Daily global indicator for food f
            self.z[f_idx] = pulp.LpVariable(
                f"z_food_{f_idx}",
                cat=pulp.LpBinary
            )

            for m_idx in range(self.num_meals):
                # Binary selection variable
                self.y[f_idx, m_idx] = pulp.LpVariable(
                    f"y_sel_f{f_idx}_m{m_idx}",
                    cat=pulp.LpBinary
                )
                # Continuous serving quantity multiplier (0.5 to 2.0 servings if y=1)
                self.x[f_idx, m_idx] = pulp.LpVariable(
                    f"x_qty_f{f_idx}_m{m_idx}",
                    lowBound=0.0,
                    upBound=3.0,
                    cat=pulp.LpContinuous
                )

        # Objective deviation slacks
        self.slack_cal_pos = pulp.LpVariable("slack_cal_over", lowBound=0.0, cat=pulp.LpContinuous)
        self.slack_cal_neg = pulp.LpVariable("slack_cal_under", lowBound=0.0, cat=pulp.LpContinuous)
        self.slack_prot_neg = pulp.LpVariable("slack_prot_deficit", lowBound=0.0, cat=pulp.LpContinuous)
        self.slack_fib_neg = pulp.LpVariable("slack_fib_deficit", lowBound=0.0, cat=pulp.LpContinuous)
        self.slack_fe_neg = pulp.LpVariable("slack_fe_deficit", lowBound=0.0, cat=pulp.LpContinuous)
        self.slack_vitc_neg = pulp.LpVariable("slack_vitc_deficit", lowBound=0.0, cat=pulp.LpContinuous)
