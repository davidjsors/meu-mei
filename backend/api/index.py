import os
import sys

# Garante que o diretório pai (backend) esteja no path para importar o app
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.append(parent_dir)

from app.main import app
