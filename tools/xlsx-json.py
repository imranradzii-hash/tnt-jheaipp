"""Tukar .xlsx kepada peta sel JSON { helaian: { A1: nilai } } seperti yang dihasilkan SheetJS di pelayar
(nilai tersimpan, tarikh sebagai nombor siri Excel). Untuk ujian parser import sahaja.
Guna: python3 -I tools/xlsx-json.py fail.xlsx > fail.json"""
import json, sys, datetime
import openpyxl
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
asas = datetime.datetime(1899, 12, 30)
out = {}
for ws in wb:
    h = {}
    for row in ws.iter_rows():
        for c in row:
            v = c.value
            if v is None:
                continue
            if isinstance(v, datetime.datetime):
                v = (v - asas).days + (v - asas).seconds / 86400
            elif isinstance(v, datetime.time):
                v = (v.hour * 3600 + v.minute * 60) / 86400
            h[c.coordinate] = v
    out[ws.title] = h
json.dump(out, sys.stdout, ensure_ascii=False)
