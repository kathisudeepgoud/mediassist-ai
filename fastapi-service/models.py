from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Tuple, Literal
from datetime import date, datetime

# 1. User Schema
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[Literal['Male', 'Female', 'Other']] = None
    bloodGroup: Optional[str] = None
    heightCm: Optional[float] = None
    weightKg: Optional[float] = None
    photoUrl: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        from_attributes = True

# 2. Vital Reading Schema
class VitalReadingBase(BaseModel):
    label: str
    value: float
    unit: str
    status: Literal['normal', 'borderline', 'high', 'low']
    referenceRange: str

class VitalReadingCreate(VitalReadingBase):
    reportId: Optional[str] = None

class VitalReadingResponse(VitalReadingBase):
    id: str

# 3. Medical Report Schema
class MedicalReportBase(BaseModel):
    patientName: str
    age: int
    gender: str
    reportDate: date
    hospital: str
    doctor: str
    type: str
    summary: str
    keyFindings: List[str]
    vitals: List[VitalReadingBase]
    fileType: Literal['PDF', 'PNG', 'JPG']

class MedicalReportCreate(MedicalReportBase):
    userId: Optional[str] = None

class MedicalReportResponse(MedicalReportBase):
    id: str

# 4. Disease Risk Schema
class DiseaseRiskBase(BaseModel):
    name: str
    percentage: float
    status: Literal['Low', 'Moderate', 'High']
    explanation: str
    suggestions: List[str]

class DiseaseRiskResponse(DiseaseRiskBase):
    id: str

# 5. Trend Metrics Schema
class TrendPoint(BaseModel):
    date: str
    value: float

class TrendMetricBase(BaseModel):
    name: str
    unit: str
    color: str
    data: List[TrendPoint]
    normalRange: Tuple[float, float]

class TrendMetricResponse(TrendMetricBase):
    id: str

# 6. Diet & Food Schemas
class FoodItem(BaseModel):
    id: str
    name: str
    benefits: str
    calories: int
    protein: str
    category: str

class MealPlanDay(BaseModel):
    day: str
    breakfast: str
    lunch: str
    dinner: str
    snacks: str

class DietTargets(BaseModel):
    dailyCalories: int
    proteinIntake: str
    vitaminRecommendations: List[str]
    mineralRecommendations: List[str]
    waterIntake: str

# 7. Exercise Schema
class ExerciseItem(BaseModel):
    id: str
    name: str
    icon: str
    duration: str
    difficulty: Literal['Easy', 'Moderate', 'Hard']
    caloriesBurned: int
    frequency: str
    benefits: List[str]

# 8. Chat Message Schema
class ChatMessageBase(BaseModel):
    role: Literal['user', 'assistant']
    content: str

class ChatMessageCreate(ChatMessageBase):
    userId: Optional[str] = None

class ChatMessageResponse(ChatMessageBase):
    id: str
    timestamp: str

# 9. User Settings Schema
class UserSettings(BaseModel):
    theme: Optional[str] = 'light'
    notificationsEnabled: Optional[bool] = True
    emailAlerts: Optional[bool] = True
    language: Optional[str] = 'en'
