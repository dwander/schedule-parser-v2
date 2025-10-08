#!/bin/bash
# ===============================================
# convert_crlf_to_lf.sh
# Recursively convert CRLF -> LF for code files,
# excluding common dependency / virtual env dirs
# ===============================================

# 시작 경로 (기본값: 현재 디렉토리)
BASE_DIR=${1:-.}

# 변환할 파일 확장자 목록
EXTENSIONS=("*.c" "*.cpp" "*.h" "*.hpp" "*.py" "*.js" "*.ts" "*.java" "*.go" "*.rb" "*.php" "*.html" "*.css" "*.json" "*.yml" "*.yaml" "*.sh" "*.md" "*.txt")

# 제외할 디렉토리 목록
EXCLUDE_DIRS=("node_modules" "venv" ".venv" ".git" ".idea" "__pycache__" "dist" "build")

echo "🔍 Searching in: $BASE_DIR"
echo "🚫 Skipping: ${EXCLUDE_DIRS[*]}"
echo "📄 Converting CRLF → LF for matching files..."

# find 명령어용 -prune 조건 구성
PRUNE_EXPR=()
for dir in "${EXCLUDE_DIRS[@]}"; do
  PRUNE_EXPR+=( -name "$dir" -prune -o )
done

# 확장자별 변환 수행
for ext in "${EXTENSIONS[@]}"; do
  find "$BASE_DIR" \
    \( "${PRUNE_EXPR[@]}" -type f -name "$ext" -print0 \) \
    2>/dev/null | while IFS= read -r -d '' file; do
      echo "→ Converting: $file"
      dos2unix "$file" >/dev/null 2>&1
    done
done

echo "✅ All done!"
