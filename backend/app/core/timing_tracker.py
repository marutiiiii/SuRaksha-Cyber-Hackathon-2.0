import threading
import time

class TimingTracker:
    def __init__(self):
        self._local = threading.local()

    def reset(self):
        self._local.pdf_extraction_time = 0.0
        self._local.image_conversion_time = 0.0
        self._local.prompt_generation_time = 0.0
        self._local.model_inference_time = 0.0
        self._local.start_time = time.time()

    def add_pdf_extraction(self, t: float):
        self._ensure_init()
        self._local.pdf_extraction_time += t

    def add_image_conversion(self, t: float):
        self._ensure_init()
        self._local.image_conversion_time += t

    def add_prompt_generation(self, t: float):
        self._ensure_init()
        self._local.prompt_generation_time += t

    def add_model_inference(self, t: float):
        self._ensure_init()
        self._local.model_inference_time += t

    def _ensure_init(self):
        if not hasattr(self._local, "pdf_extraction_time"):
            self._local.pdf_extraction_time = 0.0
        if not hasattr(self._local, "image_conversion_time"):
            self._local.image_conversion_time = 0.0
        if not hasattr(self._local, "prompt_generation_time"):
            self._local.prompt_generation_time = 0.0
        if not hasattr(self._local, "model_inference_time"):
            self._local.model_inference_time = 0.0
        if not hasattr(self._local, "start_time"):
            self._local.start_time = time.time()

    def get_timings(self):
        self._ensure_init()
        total_time = time.time() - self._local.start_time
        return {
            "pdf_extraction_time": self._local.pdf_extraction_time,
            "image_conversion_time": self._local.image_conversion_time,
            "prompt_generation_time": self._local.prompt_generation_time,
            "model_inference_time": self._local.model_inference_time,
            "total_verification_time": total_time
        }

tracker = TimingTracker()
