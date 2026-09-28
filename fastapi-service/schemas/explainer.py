from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union

class ParameterExplanation(BaseModel):
    parameter: str = Field(..., description="Name of the test/parameter")
    explanation: str = Field(..., description="Simple language explanation including status, importance, and general health implication")

class ExplainReportResponse(BaseModel):
    overall_summary: str = Field(..., description="Simple overview summary of the extracted report")
    parameter_explanations: List[ParameterExplanation] = Field(default_factory=list, description="Explanations for each test parameter")
    lifestyle_suggestions: List[str] = Field(default_factory=list, description="General non-medical wellness suggestions (diet, hydration, sleep, exercise)")
    questions_for_doctor: List[str] = Field(default_factory=list, description="Suggested questions for the patient's healthcare provider")
    disclaimer: str = Field(
        default="This explanation is for educational purposes only and is not a medical diagnosis.",
        description="Standard safety disclaimer"
    )

class PatientInfo(BaseModel):
    name: Optional[str] = None
    age: Optional[Union[int, str]] = None
    gender: Optional[str] = None

class ExplainReportRequest(BaseModel):
    patient: Optional[PatientInfo] = None
    metadata: Optional[Dict[str, Any]] = None
    parameters: Optional[List[Dict[str, Any]]] = None
    vitals: Optional[List[Dict[str, Any]]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "patient": {
                    "name": "John Doe",
                    "age": 45,
                    "gender": "Male"
                },
                "parameters": [
                    {
                        "name": "Glucose",
                        "value": 118,
                        "unit": "mg/dL",
                        "reference_range": "70-99",
                        "status": "High"
                    },
                    {
                        "name": "Hemoglobin",
                        "value": 13.8,
                        "unit": "g/dL",
                        "reference_range": "13-17",
                        "status": "Normal"
                    }
                ]
            }
        }
