import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

# Adjust postgres scheme if necessary (e.g. postgres:// to postgresql://)
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Create the database engine
try:
    if db_url.startswith("sqlite:"):
        engine = create_engine(
            db_url,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    else:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
        )
    # Ping the database to verify connectivity
    with engine.connect() as conn:
        pass
    logger.info("Database engine created successfully.")
except Exception as e:
    logger.error(f"Database connection failed: {e}")
    raise e


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
