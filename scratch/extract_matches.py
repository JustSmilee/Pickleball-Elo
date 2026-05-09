import pandas as pd
import json
import sys
import io
import re

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

file_path = "C:/Elo-rank/Giải Pick KDL 2026.xlsx"

def extract_matches():
    xls = pd.ExcelFile(file_path)
    matches = []
    
    # Try to find sheets that might contain match results
    for sheet_name in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet_name)
        
        # Look for rows that have scores (numbers) and names
        for row_idx, row in df.iterrows():
            row_values = [str(v) for v in row.values if pd.notnull(v)]
            row_str = " ".join(row_values)
            
            # Pattern: Name - Name  Score  Name - Name
            # Or Name & Name  Score  Name & Name
            # We'll look for something like "Name... - Name... (Number) - (Number) Name... - Name..."
            
            # Simple heuristic: if a row contains a dash surrounded by numbers like "11 - 5"
            score_match = re.search(r'(\d+)\s*[-]\s*(\d+)', row_str)
            if score_match:
                s1, s2 = int(score_match.group(1)), int(score_match.group(2))
                # Now try to find the teams. Usually they are in the same row or nearby.
                # This is hard to automate perfectly without seeing the layout.
                # Let's just print the row to debug.
                matches.append({
                    "sheet": sheet_name,
                    "row": row_idx,
                    "content": row_values,
                    "score": [s1, s2]
                })
                
    return matches

try:
    xls = pd.ExcelFile(file_path)
    df = pd.read_excel(xls, sheet_name="Chuẩn thi đấu")
    print(df.to_string())
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
