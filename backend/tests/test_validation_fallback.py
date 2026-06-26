import os
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestValidationFallback(unittest.TestCase):
    def test_evidence_extractor_imports_without_qwen_runtime(self):
        real_import = __import__

        def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name in {"torch", "transformers", "qwen_vl_utils"}:
                raise ModuleNotFoundError("simulated missing optional runtime")
            return real_import(name, globals, locals, fromlist, level)

        sys.modules.pop("app.core.evidence_extractor", None)
        sys.modules.pop("app.core.qwen_service", None)

        with patch("builtins.__import__", side_effect=guarded_import):
            import app.core.evidence_extractor as evidence_extractor

        self.assertTrue(callable(evidence_extractor.extract_evidence_details))

    def test_evidence_extractor_handles_text_fallback(self):
        with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as handle:
            handle.write("The bank must keep audit logs and secure access controls.")
            temp_path = handle.name

        try:
            import app.core.evidence_extractor as evidence_extractor

            result = evidence_extractor.extract_evidence_details(temp_path, "Verify secure access controls")
            self.assertIn("text", result)
            self.assertTrue(result["text"])
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_evidence_upload_allows_transition_to_awaiting_validation(self):
        from app.api.endpoints import maps

        self.assertTrue(
            maps._can_transition_status("Pending", "Awaiting Validation", allow_evidence_submission=True)
        )
        self.assertTrue(
            maps._can_transition_status("In Progress", "Awaiting Validation", allow_evidence_submission=True)
        )


if __name__ == "__main__":
    unittest.main()
