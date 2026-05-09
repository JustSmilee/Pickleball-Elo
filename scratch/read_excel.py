import pandas as pd
import json
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

file_path = "C:/Elo-rank/Giải Pick KDL 2026.xlsx"
exclude_keywords = [
    "Sân", "Bảng", "Nhất", "Nhì", "Trận", "Tỉ số", "Điểm", "Tổng", "Kết", "Thứ", 
    "Thể lệ", "Đối đầu", "Hiệu số", "Tứ Kết", "Bán Kết", "Chung Kết", "Giải", 
    "Pickleball", "Đánh", "Séc", "Cách", "Chạm", "Thắng", "Thua", "Ba,Tư"
]

def is_valid_name(name):
    if not name or len(name) < 5:
        return False
    if any(kw in name for kw in exclude_keywords):
        return False
    # Remove things like "(1/-18)"
    name = re.sub(r'\(.*?\)', '', name).strip()
    # Check if it has at least one space (full name)
    if ' ' not in name:
        return False
    return name

try:
    xls = pd.ExcelFile(file_path)
    potential_names = set()
    for sheet_name in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet_name)
        for val in df.values.flatten():
            if isinstance(val, str):
                parts = []
                if " - " in val:
                    parts = val.split(" - ")
                elif " & " in val:
                    parts = val.split(" & ")
                else:
                    parts = [val]
                
                for p in parts:
                    clean = is_valid_name(p.strip())
                    if clean:
                        potential_names.add(clean)
    
    result = sorted(list(potential_names))
    print(json.dumps(result, ensure_ascii=False))
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
