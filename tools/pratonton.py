"""Pratonton cetakan secara lokal: isi templat xlsx asal dengan peta sel, kemudian render PDF (LibreOffice).
Guna: node tools/peta-json.js > /tmp/peta.json && python3 tools/pratonton.py templat/TNT-WP1.4-KOSONG.xlsx /tmp/peta.json out.xlsx
Ini hanya meniru langkah Apps Script (salin templat, sisip baris Muka 2, tulis sel) untuk semakan visual."""
import json, sys, copy
import openpyxl
from openpyxl.worksheet.cell_range import CellRange

tpl, peta_f, out = sys.argv[1:4]
peta = json.load(open(peta_f))
wb = openpyxl.load_workbook(tpl)
n = peta['tambahBaris']
if n:
    ws = wb['Muka 2']
    merges = [CellRange(str(r)) for r in ws.merged_cells.ranges]
    for r in merges:
        ws.unmerge_cells(str(r))
    heights = {i: ws.row_dimensions[i].height for i in range(1, ws.max_row + 1)}
    ws.insert_rows(8, n)
    for i in range(8, 8 + n):
        for c in range(1, 9):
            ws.cell(i, c)._style = copy.copy(ws.cell(7, c)._style)
        ws.row_dimensions[i].height = heights.get(7)

    for i, h in heights.items():
        if i >= 8:
            ws.row_dimensions[i + n].height = h
    for r in merges:
        if r.min_row >= 8:
            r.shift(row_shift=n)
        ws.merge_cells(str(r))
if peta.get('tinggiBaris'):
    for i, t in enumerate(peta['tinggiBaris']):
        wb['Muka 2'].row_dimensions[6 + i].height = t
# Tiru export Google (scale=4): setiap helaian muat satu halaman
for ws in wb:
    ws.print_area = None
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 1
for s, a, v in peta['sel']:
    wb[s][a].value = v
wb.save(out)
print('ditulis', out)
