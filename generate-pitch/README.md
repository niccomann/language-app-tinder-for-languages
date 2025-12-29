# Pitch Deck Generator 📊

Automated pitch deck generation tools that dynamically read from project documentation.

## 📁 Files

### `generate_pitch_pdf.py`
Generates a professional PDF pitch deck for investors.

**Features:**
- Reads content from `README.md` and `docs/` folder
- Extracts features, tech stack, API endpoints automatically
- Includes screenshots with captions
- Styled with ReportLab for professional appearance

**Usage:**
```bash
cd generate-pitch
python3 generate_pitch_pdf.py
```

**Output:** `output/Passive_Learning_with_Dopamine_Pitch_Deck.pdf`

---

### `generate_pitch_markdown.py`
Generates a Markdown version of the pitch deck.

**Features:**
- Same content as PDF but in Markdown format
- GitHub-friendly formatting
- Includes image references to screenshots
- Easy to version control and diff

**Usage:**
```bash
cd generate-pitch
python3 generate_pitch_markdown.py
```

**Output:** `output/PITCH_DECK.md`

---

### `generate_pitch_pdf_static.py` (Backup)
Static version of the PDF generator with hardcoded content. Kept as backup.

---

## 🔄 How It Works

Both scripts automatically parse:

1. **`../README.md`**
   - Project title and tagline
   - Features list (🎯 Features section)
   - Tech stack (Frontend, Backend, Database)
   - API endpoints table

2. **`../docs/ROADMAP.md`**
   - Future enhancements
   - Development priorities

3. **`../docs/AI_VIDEO_FEATURE.md`**
   - AI capabilities overview

4. **`../screenshot_project/`**
   - All PNG screenshots
   - Automatically included with captions

---

## ✨ Benefits

### Automatic Updates
When you update project documentation:
- ✅ Modify `README.md` → Pitch deck updates automatically
- ✅ Add features → They appear in the pitch
- ✅ Update tech stack → Reflected in both PDF and Markdown
- ✅ Add screenshots → Automatically included

### No Manual Editing
No need to manually update the pitch deck when project changes. Just regenerate!

---

## 📋 Requirements

**Python packages:**
```bash
pip install reportlab
```

**Project structure:**
```
tinder-for-languages/
├── README.md
├── docs/
│   ├── ROADMAP.md
│   └── AI_VIDEO_FEATURE.md
├── screenshot_project/
│   └── *.png
└── generate-pitch/
    ├── generate_pitch_pdf.py
    ├── generate_pitch_markdown.py
    └── README.md
```

---

## 🎯 Content Sections

Both generators create the following sections:

1. **Title Page** - Branding and seed round info
2. **Core Concept** - Dopamine learning loop explanation
3. **Statistics Tracking** - Behavioral metrics
4. **Platform Features** - From README.md
5. **Product Screenshots** - With descriptive captions
6. **Technology Stack** - From README.md
7. **Market Opportunity** - Market size and competitive advantage
8. **Future Roadmap** - From ROADMAP.md
9. **Investment Ask** - Use of funds breakdown
10. **Contact** - Email and website

---

## 🚀 Quick Start

Generate both formats:
```bash
cd generate-pitch

# Generate PDF
python3 generate_pitch_pdf.py

# Generate Markdown
python3 generate_pitch_markdown.py
```

Output files will be created in the `output/` directory:
- `output/Passive_Learning_with_Dopamine_Pitch_Deck.pdf`
- `output/PITCH_DECK.md`
- `output/pitch.html` (original HTML pitch for reference)

---

## 📝 Notes

- PDF size: ~7 MB (includes embedded screenshots)
- Markdown size: ~7 KB (references screenshots)
- Generation time: ~1-2 seconds
- No equity or investment amount displayed (as per requirements)

---

**Last Updated:** December 2025
