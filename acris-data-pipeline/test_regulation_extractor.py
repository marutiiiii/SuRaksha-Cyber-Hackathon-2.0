from transform.regulation_extractor import (
    extract_regulations
)

sample_text = """
Reserve Bank of India

Banks shall maintain CRR of 4%.

The office is located in Mumbai.

All regulated entities must submit reports quarterly.

Thank you.
"""

result = extract_regulations(
    sample_text
)

print(result)