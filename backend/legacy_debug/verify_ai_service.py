
import asyncio
import os
import sys

# Add the project root to sys.path to allow importing from 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ai import generate_response
from dotenv import load_dotenv

load_dotenv()

async def test_generation():
    print("Testing generate_response...")
    try:
        response = await generate_response(
            message="Hello, test please.",
            chat_history=[],
            maturity_score=50,
            dream="Test Dream",
            business_type="Test Business"
        )
        print("\n--- Response ---")
        print(response)
        print("\n--- End Response ---")
        print("Test PASSED")
    except Exception as e:
        print(f"\nTest FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_generation())
