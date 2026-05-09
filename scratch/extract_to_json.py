import pandas as pd
import json
import re
import sys

file_path = "C:/Elo-rank/Giải Pick KDL 2026.xlsx"
matches = []

try:
    xls = pd.ExcelFile(file_path)
    df = pd.read_excel(xls, sheet_name="Chuẩn thi đấu")
    for _, row in df.iterrows():
        row_values = [str(v) for v in row.values if pd.notnull(v)]
        row_str = " ".join(row_values)
        # Look for score pattern like "11 - 5" or "11 / 5"
        score_match = re.search(r'(\d+)\s*[-/]\s*(\d+)', row_str)
        if score_match:
            # Try to find teams (strings with " - " or " & ")
            teams = [v for v in row_values if " - " in v or " & " in v]
            if len(teams) >= 2:
                matches.append({
                    "team1": teams[0],
                    "team2": teams[1],
                    "score1": int(score_match.group(1)),
                    "score2": int(score_match.group(2)),
                    "is_knockout": any(kw in row_str for kw in ["Bán kết", "Tứ kết", "Chung kết", "Tứ Kết", "Bán Kết", "Chung Kết"])
                })
    
    with open("c:/Elo-rank/scratch/extracted_matches.json", "w", encoding="utf-8") as f:
        json.dump(matches, f, ensure_ascii=False, indent=2)
    print("Matches extracted successfully.")
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
