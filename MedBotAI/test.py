from PyPDF2 import PdfReader

pdf_path = "/home/runner/workspace/MedBotAI/IntroductiontoDataStructures.pdf"

try:
    reader = PdfReader(pdf_path)
    text = ""
    for page_num, page in enumerate(reader.pages):
        page_text = page.extract_text()
        if not page_text:
            print(f"❌ WARNING: No text extracted from page {page_num + 1} (possibly an image-based PDF)")
        text += page_text + "\n" if page_text else ""

    if text.strip():
        print("✅ Extracted text preview:\n", text[:2000])  # Print first 2000 characters
    else:
        print("❌ ERROR: No text could be extracted from this PDF!")

except Exception as e:
    print(f"❌ ERROR: {e}")