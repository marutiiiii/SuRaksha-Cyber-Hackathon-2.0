# Forwarder for backward compatibility, referencing services/qwen_service.py
from services.qwen_service import (
    model_loaded,
    device_used,
    model_ready,
    load_error_message,
    verify_model_integrity,
    load_qwen_model_on_startup,
    get_model_and_processor,
    run_qwen_inference,
    run_qwen_json_inference
)
