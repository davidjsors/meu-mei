import os
import sys

# Garante que o diretório pai (backend) esteja no path para importar o app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.main import app
