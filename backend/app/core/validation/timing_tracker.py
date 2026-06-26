"""
Timing tracker for the ReguFlow validation pipeline.
Tracks time spent in each stage of evidence verification.
"""
import threading


class TimingTracker:
    def __init__(self):
        self._lock = threading.Lock()
        self._data = {
            "pdf_extraction_time": 0.0,
            "image_conversion_time": 0.0,
            "prompt_generation_time": 0.0,
            "model_inference_time": 0.0,
            "total_verification_time": 0.0,
        }

    def reset(self):
        with self._lock:
            for k in self._data:
                self._data[k] = 0.0

    def add_pdf_extraction(self, t: float):
        with self._lock:
            self._data["pdf_extraction_time"] += t

    def add_image_conversion(self, t: float):
        with self._lock:
            self._data["image_conversion_time"] += t

    def add_prompt_generation(self, t: float):
        with self._lock:
            self._data["prompt_generation_time"] += t

    def add_model_inference(self, t: float):
        with self._lock:
            self._data["model_inference_time"] += t

    def set_total(self, t: float):
        with self._lock:
            self._data["total_verification_time"] = t

    def get_timings(self) -> dict:
        with self._lock:
            return dict(self._data)


# Singleton tracker instance
tracker = TimingTracker()
