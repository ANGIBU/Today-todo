# app/social/__init__.py
from flask import Blueprint

social = Blueprint('social', __name__)

from app.social import routes