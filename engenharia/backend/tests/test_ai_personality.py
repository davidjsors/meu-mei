
import pytest
from app.prompts.system import build_system_prompt

def test_system_prompt_personalization():
    prompt = build_system_prompt(
        user_name="David",
        score=20,
        dream="abrir minha padaria",
        business_type="Confeitaria",
        revenue_goal=5000.0
    )
    
    # Verificar se os dados foram injetados
    assert "David" in prompt
    assert "abrir minha padaria" in prompt
    assert "Confeitaria" in prompt
    assert "R$ 5,000.00" in prompt # Formataçao com vírgula e ponto
    
    # Verificar se o nível de maturidade está correto (20 = visionario ou organizacao?)
    # 20 > 18 -> visionario
    assert "Visionário" in prompt
    assert "Performance sólida" in prompt # Trecho do prompt visionário

def test_system_prompt_vulnerable():
    prompt = build_system_prompt(
        user_name="Ana",
        score=5,
        dream="pagar as dividas",
        business_type="Manicure"
    )
    assert "Ana" in prompt
    assert "Vulnerável" in prompt
    assert "Educadora financeira de base" in prompt
