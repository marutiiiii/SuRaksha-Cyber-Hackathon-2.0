import os
import torch
import json
import re
import time
import threading
from typing import List, Dict, Any, Optional
from transformers import Qwen2_5_VLForConditionalGeneration, AutoProcessor
from qwen_vl_utils import process_vision_info
import config

# Global variables for model state
_model = None
_processor = None
model_loaded = False
device_used = "none"
model_ready = False
load_error_message = ""
load_time_sec = 0.0

# Concurrency lock to prevent concurrent model invocations
_model_lock = threading.Lock()

def verify_model_integrity() -> bool:
    """
    Check if the local Qwen2.5-VL-3B-Instruct directory exists and
    all key metadata and weight files are present and non-empty.
    """
    model_path = config.MODEL_PATH
    if not os.path.exists(model_path):
        print(f"Model path does not exist: {model_path}")
        return False
        
    required_files = [
        "config.json",
        "preprocessor_config.json",
        "tokenizer_config.json",
        "tokenizer.json",
        "model-00001-of-00002.safetensors",
        "model-00002-of-00002.safetensors",
        "model.safetensors.index.json"
    ]
    
    for f in required_files:
        path = os.path.join(model_path, f)
        if not os.path.exists(path):
            print(f"Missing model file: {f}")
            return False
        if os.path.getsize(path) == 0:
            print(f"Model file {f} is empty/corrupt.")
            return False
            
    return True

def load_qwen_model_on_startup() -> bool:
    """
    Load the model once at startup from the local path.
    Detects CUDA, VRAM details, measures load time, and falls back to CPU if needed.
    """
    global _model, _processor, model_loaded, device_used, model_ready, load_error_message, load_time_sec
    
    with _model_lock:
        if model_ready:
            print("Local Qwen model already loaded and ready.")
            return True
            
        print("--------------------------------------------------")
        print(f"Model Path: {config.MODEL_PATH}")
        
        # 1. Verify files exist
        if not verify_model_integrity():
            load_error_message = f"Model integrity check failed at {config.MODEL_PATH}. Ensure all config and safetensors files are fully present."
            print(f"Error: {load_error_message}")
            print("--------------------------------------------------")
            model_ready = False
            return False
            
        # 2. Setup Device & VRAM Log
        cuda_available = torch.cuda.is_available()
        gpu_name = "None"
        gpu_vram_gb = 0.0
        
        if cuda_available:
            try:
                gpu_name = torch.cuda.get_device_name(0)
                gpu_props = torch.cuda.get_device_properties(0)
                gpu_vram_gb = round(gpu_props.total_memory / (1024 ** 3), 2)
                device_used = "cuda"
            except Exception as e:
                print(f"Error querying GPU properties: {e}")
                cuda_available = False
                device_used = "cpu"
        else:
            device_used = "cpu"
            
        print(f"Device being used: {device_used.upper()}")
        if cuda_available:
            print(f"GPU Name: {gpu_name}")
            print(f"Total VRAM: {gpu_vram_gb} GB")
            
        # 3. Load Model
        start_time = time.time()
        try:
            print("Loading processor...")
            _processor = AutoProcessor.from_pretrained(
                config.MODEL_PATH,
                local_files_only=True
            )
            
            # Load model weights
            if cuda_available:
                try:
                    print("Loading model on GPU...")
                    # We load in bfloat16 for fast GPU inference
                    _model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                        config.MODEL_PATH,
                        torch_dtype=torch.bfloat16,
                        device_map="auto",
                        local_files_only=True
                    )
                    model_loaded = True
                except (torch.cuda.OutOfMemoryError, RuntimeError) as oom_err:
                    print(f"GPU Load failed due to Insufficient VRAM/Runtime Error: {oom_err}")
                    print("Falling back to CPU memory...")
                    torch.cuda.empty_cache()
                    cuda_available = False
                    device_used = "cpu"
                    
            if not cuda_available:
                print("Loading model on CPU (bfloat16)...")
                try:
                    _model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                        config.MODEL_PATH,
                        torch_dtype=torch.bfloat16,
                        device_map="cpu",
                        local_files_only=True
                    )
                except Exception as cpu_bf16_err:
                    print(f"CPU bfloat16 load failed: {cpu_bf16_err}. Retrying in float32...")
                    _model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
                        config.MODEL_PATH,
                        torch_dtype=torch.float32,
                        device_map="cpu",
                        local_files_only=True
                    )
                model_loaded = True
                
            load_time_sec = round(time.time() - start_time, 2)
            model_ready = True
            print(f"Qwen model loaded successfully.")
            print(f"Model Load Time: {load_time_sec} seconds")
            print("--------------------------------------------------")
            return True
            
        except Exception as e:
            load_time_sec = round(time.time() - start_time, 2)
            load_error_message = f"Failed to load model from path: {str(e)}"
            print(f"Failure message: {load_error_message}")
            print(f"Model Load Time: {load_time_sec} seconds")
            print("--------------------------------------------------")
            model_ready = False
            return False

def get_model_and_processor():
    """Retrieve the loaded singleton model and processor."""
    global _model, _processor, model_ready, load_error_message
    if not model_ready:
        err_msg = load_error_message or "Qwen model is not initialized or failed to load."
        raise RuntimeError(err_msg)
    return _model, _processor

def run_qwen_inference(messages: List[Dict[str, Any]], max_tokens: int = 2048) -> str:
    """
    Thread-safe inference using the Qwen2.5-VL model.
    """
    model, processor = get_model_and_processor()
    
    with _model_lock:
        print("Qwen inference started")
        try:
            # 1. Apply chat template
            text = processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            
            # 2. Extract vision inputs
            image_inputs, video_inputs = process_vision_info(messages)
            
            # 3. Process inputs
            inputs = processor(
                text=[text],
                images=image_inputs,
                videos=video_inputs,
                padding=True,
                return_tensors="pt"
            )
            
            # Move inputs to same device as model
            device = next(model.parameters()).device
            inputs = inputs.to(device)
            
            # Print prompt and image statistics before inference
            prompt_len = len(text)
            num_pages = len(image_inputs) if image_inputs else 0
            
            # Calculate evidence text length
            evidence_text_len = 0
            for msg in messages:
                content = msg.get("content", "")
                if isinstance(content, str):
                    evidence_text_len += len(content)
                elif isinstance(content, list):
                    for item in content:
                        if isinstance(item, dict) and item.get("type") == "text":
                            text_val = item.get("text", "")
                            # Exclude prompt instructions from evidence length calculation if possible
                            if "compliance requirements" not in text_val.lower() and "compliance audit" not in text_val.lower():
                                evidence_text_len += len(text_val)
            
            print(f"Evidence text length: {evidence_text_len}")
            print(f"Prompt length: {prompt_len}")
            print(f"Number of pages: {num_pages}")
            
            # Print before inference details
            prompt_tokens = inputs.input_ids.shape[1] if hasattr(inputs, "input_ids") else 0
            print(f"Model Device: {device}")
            print(f"Model Dtype: {model.dtype}")
            print(f"Prompt Tokens: {prompt_tokens}")
            print(f"Evidence Characters: {evidence_text_len}")
            
            # 4. Generate response in inference mode
            import time
            from utils.timing_tracker import tracker
            t_inf_start = time.time()
            with torch.inference_mode():
                generated_ids = model.generate(**inputs, max_new_tokens=max_tokens)
            tracker.add_model_inference(time.time() - t_inf_start)

                
            # Trim input tokens
            generated_ids_trimmed = [
                out_ids[len(in_ids):] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
            ]
            
            # Decode response
            output_text = processor.batch_decode(
                generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
            )
            
            print("Qwen inference completed")
            return output_text[0]
            
        except Exception as e:
            print(f"Error during Qwen inference execution: {e}")
            raise e

def run_qwen_json_inference(messages: List[Dict[str, Any]], max_tokens: int = 2048) -> Dict[str, Any]:
    """
    Run inference and enforce/parse JSON output from the model.
    """
    json_instruction = "\nIMPORTANT: Return ONLY a valid JSON object. Do not include any introductory or concluding text. Your entire response must parse as a JSON object."
    
    # Clone messages
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
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}. Raw response: {response_text}")
        
        match = re.search(r"\{.*\}", response_text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
                
        raise ValueError(f"Failed to parse Qwen response as JSON: {response_text}")
