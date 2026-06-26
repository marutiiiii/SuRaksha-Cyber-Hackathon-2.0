"""
Qwen2.5-VL model service for the ReguFlow validation engine.
Handles model loading, inference, and JSON response parsing.

Reads model path from the main backend settings (QWEN_MODEL_PATH).
Falls back gracefully if the model is not present.
"""
import os
import json
import re
import time
import threading
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("uvicorn.error")

# ─── Global model state ────────────────────────────────────────────────────────

_model = None
_processor = None
model_loaded = False
device_used = "none"
model_ready = False
load_error_message = ""
load_time_sec = 0.0

# Concurrency lock to prevent concurrent model invocations
_model_lock = threading.Lock()


def _get_model_path() -> str:
    """Resolve model path from backend settings or environment variable."""
    try:
        from app.core.config import settings
        return settings.QWEN_MODEL_PATH
    except Exception:
        return os.getenv("QWEN_MODEL_PATH", "D:/AI-Models/Qwen2.5-VL-3B-Instruct")


def verify_model_integrity() -> bool:
    """
    Check if the local Qwen2.5-VL-3B-Instruct directory exists and
    all key metadata and weight files are present and non-empty.
    """
    model_path = _get_model_path()
    if not os.path.exists(model_path):
        logger.warning(f"[Validation] Qwen model path does not exist: {model_path}")
        return False

    required_files = [
        "config.json",
        "preprocessor_config.json",
        "tokenizer_config.json",
        "tokenizer.json",
        "model.safetensors.index.json",
    ]

    for f in required_files:
        path = os.path.join(model_path, f)
        if not os.path.exists(path):
            logger.warning(f"[Validation] Missing Qwen model file: {f}")
            return False
        if os.path.getsize(path) == 0:
            logger.warning(f"[Validation] Qwen model file is empty/corrupt: {f}")
            return False

    return True


def load_qwen_model_on_startup() -> bool:
    """
    Load the Qwen2.5-VL model once at startup from the configured local path.
    Detects CUDA/CPU, measures load time, and falls back gracefully.
    """
    global _model, _processor, model_loaded, device_used, model_ready, load_error_message, load_time_sec

    with _model_lock:
        if model_ready:
            logger.info("[Validation] Qwen model already loaded.")
            return True

        model_path = _get_model_path()
        logger.info(f"[Validation] Loading Qwen model from: {model_path}")

        # 1. Verify files exist
        if not verify_model_integrity():
            load_error_message = (
                f"Qwen model integrity check failed at '{model_path}'. "
                "Ensure all config and safetensors files are fully present. "
                "Evidence will require manual review until the model is available."
            )
            logger.warning(f"[Validation] {load_error_message}")
            model_ready = False
            return False

        # 2. Import heavy ML libs only when model is actually present
        try:
            import torch
            from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor
        except ImportError as e:
            load_error_message = f"ML libraries not installed: {e}. Run: pip install torch transformers."
            logger.error(f"[Validation] {load_error_message}")
            model_ready = False
            return False

        # 3. Setup device
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            try:
                device_used = "cuda"
            except Exception:
                cuda_available = False
                device_used = "cpu"
        else:
            device_used = "cpu"

        logger.info(f"[Validation] Using device: {device_used.upper()}")

        start_time = time.time()
        try:
            logger.info("[Validation] Loading Qwen processor...")
            _processor = AutoProcessor.from_pretrained(model_path, local_files_only=True)

            if cuda_available:
                try:
                    logger.info("[Validation] Loading Qwen model on GPU...")
                    _model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                        model_path,
                        torch_dtype=torch.bfloat16,
                        device_map="auto",
                        local_files_only=True,
                    )
                    model_loaded = True
                except (Exception,) as oom_err:
                    logger.warning(f"[Validation] GPU load failed: {oom_err}. Falling back to CPU.")
                    try:
                        torch.cuda.empty_cache()
                    except Exception:
                        pass
                    cuda_available = False
                    device_used = "cpu"

            if not cuda_available:
                logger.info("[Validation] Loading Qwen model on CPU...")
                try:
                    _model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                        model_path,
                        torch_dtype=torch.bfloat16,
                        device_map="cpu",
                        local_files_only=True,
                    )
                except Exception as cpu_err:
                    logger.warning(f"[Validation] CPU bfloat16 load failed: {cpu_err}. Retrying float32...")
                    _model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                        model_path,
                        torch_dtype=torch.float32,
                        device_map="cpu",
                        local_files_only=True,
                    )
                model_loaded = True

            load_time_sec = round(time.time() - start_time, 2)
            model_ready = True
            logger.info(f"[Validation] Qwen model loaded successfully in {load_time_sec}s.")
            return True

        except Exception as e:
            load_time_sec = round(time.time() - start_time, 2)
            load_error_message = f"Failed to load Qwen model: {str(e)}"
            logger.error(f"[Validation] {load_error_message}")
            model_ready = False
            return False


def get_model_and_processor():
    """Retrieve the loaded singleton model and processor."""
    if not model_ready:
        err_msg = load_error_message or "Qwen model is not initialized or failed to load."
        raise RuntimeError(err_msg)
    return _model, _processor


def run_qwen_inference(messages: List[Dict[str, Any]], max_tokens: int = 2048) -> str:
    """Thread-safe inference using the Qwen2.5-VL model."""
    import torch
    from qwen_vl_utils import process_vision_info
    from app.core.validation.timing_tracker import tracker

    model, processor = get_model_and_processor()

    with _model_lock:
        try:
            text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            image_inputs, video_inputs = process_vision_info(messages)

            inputs = processor(
                text=[text],
                images=image_inputs,
                videos=video_inputs,
                padding=True,
                return_tensors="pt",
            )

            device = next(model.parameters()).device
            inputs = inputs.to(device)

            t_inf_start = time.time()
            with torch.inference_mode():
                generated_ids = model.generate(**inputs, max_new_tokens=max_tokens)
            tracker.add_model_inference(time.time() - t_inf_start)

            generated_ids_trimmed = [
                out_ids[len(in_ids):]
                for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
            ]

            output_text = processor.batch_decode(
                generated_ids_trimmed,
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False,
            )
            return output_text[0]

        except Exception as e:
            logger.error(f"[Validation] Qwen inference error: {e}")
            raise e


def run_qwen_json_inference(messages: List[Dict[str, Any]], max_tokens: int = 2048) -> Dict[str, Any]:
    """
    Run Qwen inference and enforce JSON output parsing.
    Returns an empty dict on parse failure.
    """
    json_instruction = (
        "\nIMPORTANT: Return ONLY a valid JSON object. "
        "Do not include any introductory or concluding text. "
        "Your entire response must parse as a JSON object."
    )

    modified_messages = []
    for msg in messages:
        modified_messages.append(msg.copy())

    if modified_messages and modified_messages[-1]["role"] == "user":
        content = modified_messages[-1]["content"]
        if isinstance(content, str):
            modified_messages[-1]["content"] = content + json_instruction
        elif isinstance(content, list):
            text_found = False
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    item["text"] = item["text"] + json_instruction
                    text_found = True
                    break
            if not text_found:
                content.append({"type": "text", "text": json_instruction})

    response_text = run_qwen_inference(modified_messages, max_tokens=max_tokens)

    try:
        clean_text = response_text.strip()
        if clean_text.startswith("```"):
            clean_text = re.sub(r"^```(?:json)?\n", "", clean_text)
            clean_text = re.sub(r"\n```$", "", clean_text)
            clean_text = clean_text.strip()
        return json.loads(clean_text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        logger.warning(f"[Validation] Could not parse Qwen response as JSON: {response_text[:200]}")
        return {}
