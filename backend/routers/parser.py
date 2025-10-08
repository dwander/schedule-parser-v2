from fastapi import APIRouter, UploadFile, File

from parser import parse_schedules, parse_schedules_classic_only, parse_schedules_ai_only
from schemas.parser import ParseTextRequest

router = APIRouter()

# Data File Path
DATA_FILE_PATH = '../.screenshot/KakaoTalk_20250814_1307_38_031_KPAG_매니저.txt'


# --- API Endpoints ---

@router.get("/api/parse-file")
def parse_from_file():
    """Reads the predefined data file, parses it, and returns the schedules."""
    try:
        with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
            raw_content = f.read()
        return {"data": parse_schedules(raw_content), "success": True}
    except FileNotFoundError:
        return {"error": f"Data file not found at {DATA_FILE_PATH}", "success": False}
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}", "success": False}


@router.post("/api/parse-text")
def parse_from_text(request: ParseTextRequest):
    """Receives raw text and engine selection, parses it, and returns the schedules."""
    try:
        text = request.text
        engine = request.engine

        # Select parser based on engine parameter
        print(f"🔧 Using engine: {engine}")
        if engine == "classic":
            print("📜 Running classic-only parser...")
            data = parse_schedules_classic_only(text)
            print(f"📜 Classic parser result: {len(data)} schedules")
        elif engine == "ai_only":
            print("🤖 Running AI-only parser...")
            data = parse_schedules_ai_only(text)
            print(f"🤖 AI parser result: {len(data)} schedules")
        elif engine == "hybrid":
            print("🔀 Running hybrid parser...")
            data = parse_schedules(text)
            print(f"🔀 Hybrid parser result: {len(data)} schedules")
        else:
            return {"error": f"Unknown parser engine: {engine}", "success": False}

        return {"data": data, "success": True, "engine_used": engine}
    except Exception as e:
        return {"error": f"An error occurred during parsing: {str(e)}", "success": False}


@router.post("/api/parse-uploaded-file")
async def parse_uploaded_file(file: UploadFile = File(...), engine: str = "classic"):
    """Receives an uploaded file, parses it, and returns the schedules."""
    try:
        # Check file type
        if not file.filename.endswith('.txt'):
            return {"error": "Only .txt files are supported", "success": False}

        # Read file content
        content = await file.read()
        raw_content = content.decode('utf-8')

        # Select parser based on engine parameter
        print(f"🔧 File upload using engine: {engine}")
        if engine == "classic":
            print("📜 Running classic-only parser on uploaded file...")
            data = parse_schedules_classic_only(raw_content)
            print(f"📜 Classic parser result: {len(data)} schedules")
        elif engine == "ai_only":
            print("🤖 Running AI-only parser on uploaded file...")
            data = parse_schedules_ai_only(raw_content)
            print(f"🤖 AI parser result: {len(data)} schedules")
        elif engine == "hybrid":
            print("🔀 Running hybrid parser on uploaded file...")
            data = parse_schedules(raw_content)
            print(f"🔀 Hybrid parser result: {len(data)} schedules")
        else:
            return {"error": f"Unknown parser engine: {engine}", "success": False}

        return {"data": data, "success": True, "engine_used": engine}
    except Exception as e:
        return {"error": f"An error occurred during file parsing: {str(e)}", "success": False}


@router.get("/api/get-raw-data")
def get_raw_data():
    """Returns the raw content of the data file for frontend processing."""
    try:
        with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
            raw_content = f.read()
        return {"data": raw_content, "success": True}
    except FileNotFoundError:
        return {"error": f"Data file not found at {DATA_FILE_PATH}", "success": False}
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}", "success": False}
