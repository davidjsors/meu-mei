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
    dream: str
    answers: list[int] = Field(..., min_length=5, max_length=5, description="5 respostas Likert (1-5)")


class ProfileResponse(BaseModel):
    phone_number: str
    name: str
    dream: str
    maturity_score: int
    maturity_level: str
    created_at: Optional[datetime] = None


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
