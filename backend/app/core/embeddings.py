"""
embeddings.py — Local sentence-transformer embedding service.

Uses all-MiniLM-L6-v2 (384-dim) entirely offline.
No internet required after first model download.
"""

import json
import logging
import math
from typing import List, Optional

logger = logging.getLogger("uvicorn.error")

from app.core.config import settings

# ─── Model Loading ─────────────────────────────────────────────────────────────

_model = None
_model_name = settings.EMBEDDING_MODEL
_embedding_dim = 1024 if "bge" in _model_name.lower() else 384


def _load_model():
    global _model, _embedding_dim
    if _model is not None:
        return _model
    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading embedding model '{_model_name}' …")
        _model = SentenceTransformer(_model_name)
        if hasattr(_model, "get_embedding_dimension"):
            _embedding_dim = _model.get_embedding_dimension()
        elif hasattr(_model, "get_sentence_embedding_dimension"):
            _embedding_dim = _model.get_sentence_embedding_dimension()
        logger.info(f"Embedding model ready. Dimension: {_embedding_dim}")
        return _model
    except Exception as e:
        logger.warning(f"Embedding model failed to load: {e}. Fallback to zero vectors.")
        return None


# Pre-load on import so the first request doesn't pay startup cost
try:
    _load_model()
except Exception:
    pass


# ─── EmbeddingService ──────────────────────────────────────────────────────────

class EmbeddingService:
    """
    Stateless helper wrapping the singleton sentence-transformer model.
    All methods are class methods — no instantiation needed.
    """

    @classmethod
    def is_available(cls) -> bool:
        """Returns True if the embedding model loaded successfully."""
        return _model is not None

    @classmethod
    def encode(cls, text: str) -> List[float]:
        """
        Encode a single text string into a 384-dim float list.
        Returns a zero vector if the model is unavailable.
        """
        model = _load_model()
        if model is None:
            return [0.0] * _embedding_dim
        try:
            text = text.strip()
            if not text:
                return [0.0] * _embedding_dim
            vec = model.encode(text, normalize_embeddings=True)
            return [float(x) for x in vec]
        except Exception as e:
            logger.warning(f"Encode failed: {e}")
            return [0.0] * _embedding_dim

    @classmethod
    def batch_encode(cls, texts: List[str]) -> List[List[float]]:
        """
        Encode a list of texts in one batch call (more efficient than looping encode).
        Returns a list of 384-dim vectors.
        """
        model = _load_model()
        if model is None:
            return [[0.0] * _embedding_dim for _ in texts]
        try:
            cleaned = [t.strip() or " " for t in texts]
            vecs = model.encode(cleaned, normalize_embeddings=True, batch_size=32, show_progress_bar=False)
            return [[float(x) for x in v] for v in vecs]
        except Exception as e:
            logger.warning(f"Batch encode failed: {e}")
            return [[0.0] * _embedding_dim for _ in texts]

    @classmethod
    def cosine_similarity(cls, vec_a: List[float], vec_b: List[float]) -> float:
        """
        Cosine similarity between two vectors.
        Both vectors are assumed to be L2-normalized (sentence-transformers normalizes by default).
        Returns a float in [-1.0, 1.0]. Higher = more similar.
        """
        if not vec_a or not vec_b:
            return 0.0
        if len(vec_a) != len(vec_b):
            return 0.0
        try:
            dot = sum(a * b for a, b in zip(vec_a, vec_b))
            return max(-1.0, min(1.0, dot))
        except Exception:
            return 0.0

    @classmethod
    def is_zero_vector(cls, vec: List[float]) -> bool:
        """Check if a stored embedding is the old placeholder zero vector."""
        if not vec:
            return True
        return all(abs(x) < 1e-9 for x in vec)

    @classmethod
    def from_db(cls, embedding_str: Optional[str]) -> List[float]:
        """
        Parse an embedding stored as a JSON string in the database.
        Returns a zero vector if parsing fails or the value is None.
        """
        if not embedding_str:
            return [0.0] * _embedding_dim
        try:
            vec = json.loads(embedding_str)
            if isinstance(vec, list) and len(vec) > 0:
                return [float(x) for x in vec]
            return [0.0] * _embedding_dim
        except Exception:
            return [0.0] * _embedding_dim

    @classmethod
    def to_db(cls, vec: List[float]) -> str:
        """Serialize a vector to a compact JSON string for DB storage."""
        return json.dumps([round(x, 6) for x in vec])
