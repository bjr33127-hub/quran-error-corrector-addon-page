# Qur'an Error Corrector CSV Mobile

Static mobile-first web app for creating two-column Anki CSV exports from Qur'an
revision mistakes.

## Local Run

```powershell
python ..\tools\build_mobile_site_assets.py
python -m http.server 5177
```

Then open `http://localhost:5177`.

## Export Format

The downloaded file is UTF-8 CSV with Anki import headers:

```text
#separator:Comma
#html:true
#columns:Front,Back
```

Each row contains two fields: `Front` and `Back`.
