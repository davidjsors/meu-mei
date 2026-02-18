"""
Pydantic schemas para validação de dados.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ─── User / Profile ───

class MaturityRequest(BaseModel):
    """Payload do questionário IAMF-MEI."""
    phone_number: str = Field(..., pattern=r"^\d{2}-\d{5}-\d{4}$", examples=["11-98765-4321"])
    name: str
    business_type: str
    dream: str
    revenue_goal: float
    initial_balance: Optional[float] = 0.0
    answers: list[int] = Field(..., min_length=5, max_length=5, description="5 respostas Likert (1-5)")


class ProfileResponse(BaseModel):
    phone_number: str
    name: Optional[str] = None
    business_type: Optional[str] = None
    dream: Optional[str] = None
    maturity_score: Optional[int] = None
    maturity_level: Optional[str] = None
    revenue_goal: Optional[float] = None
    initial_balance: Optional[float] = None
    created_at: Optional[datetime] = None
    social_provider: Optional[str] = None
    has_pin: bool = False


class PinRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\d{2}-\d{5}-\d{4}$")
    pin: str = Field(..., min_length=4, max_length=6, description="PIN numérico de 4 a 6 dígitos")


class VerifyPinRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\d{2}-\d{5}-\d{4}$")
    pin: str = Field(..., min_length=4, max_length=6)


class SocialLoginRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\d{2}-\d{5}-\d{4}$")
    provider: str = Field(..., pattern=r"^(google|govbr)$")
    token: str
    social_id: str
    email: Optional[str] = None
    name: Optional[str] = None


class GoalUpdateRequest(BaseModel):
    phone_number: str = Field(..., pattern=r"^\d{2}-\d{5}-\d{4}$")
    revenue_goal: float = Field(..., gt=0, description="Meta de faturamento mensal")


# ─── Chat ───

class ChatRequest(BaseModel):
    """Mensagem de texto simples."""
    phone_number: str = Field(..., pattern=r"^\d{2}-\d{5}-\d{4}$")
    message: str


class MessageResponse(BaseModel):
    id: str
    phone_number: str
    role: str
    content: Optional[str] = None
    content_type: str = "text"
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    created_at: Optional[datetime] = None


# ─── Financial ───

class FinancialRecord(BaseModel):
    phone_number: str
    type: str = Field(..., pattern=r"^(entrada|saida)$")
    category: Optional[str] = None
    amount: float
    description: Optional[str] = None
    record_date: Optional[str] = None
