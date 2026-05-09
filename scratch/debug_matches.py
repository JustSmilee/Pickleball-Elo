import pandas as pd
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

file_path = "C:/Elo-rank/Giải Pick KDL 2026.xlsx"

try:
    xls = pd.ExcelFile(file_path)
    df = pd.read_excel(xls, sheet_name="Chuẩn thi đấu")
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', 1000)
    print(df.head(60).to_string())
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
