#!/usr/bin/env python3
"""
Dynamic Investor Pitch Deck PDF Generator for Passive Learning with Dopamine
Automatically reads content from README.md and docs/ folder
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from pathlib import Path
import re

# Paths
PROJECT_ROOT = Path(__file__).parent.parent  # Parent of generate-pitch folder
OUTPUT_DIR = Path(__file__).parent / "output"  # Output folder within generate-pitch
SCREENSHOTS_DIR = PROJECT_ROOT / "screenshot_project"
OUTPUT_PDF = OUTPUT_DIR / "Passive_Learning_with_Dopamine_Pitch_Deck.pdf"
README_PATH = PROJECT_ROOT / "README.md"
DOCS_DIR = PROJECT_ROOT / "docs"

def parse_readme():
    """Parse README.md to extract key information"""
    if not README_PATH.exists():
        print(f"⚠️  README.md not found at {README_PATH}")
        return {}
    
    with open(README_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
    
    data = {}
    
    # Extract title
    title_match = re.search(r'^#\s+(.+?)(?:\s+🌍)?$', content, re.MULTILINE)
    data['title'] = title_match.group(1).strip() if title_match else "Passive Learning with Dopamine"
    
    # Extract tagline
    tagline_match = re.search(r'^>\s+(.+)$', content, re.MULTILINE)
    data['tagline'] = tagline_match.group(1).strip() if tagline_match else "Language Learning Revolution"
    
    # Extract features
    features_section = re.search(r'##\s+🎯\s+Features\s*\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if features_section:
        features = re.findall(r'-\s+\*\*(.+?)\*\*\s*-\s*(.+?)(?=\n-|\n\n|\Z)', features_section.group(1), re.DOTALL)
        data['features'] = [(f.strip(), d.strip()) for f, d in features]
    else:
        data['features'] = []
    
    # Extract tech stack
    tech_match = re.search(r'\*\*Frontend\*\*:\s*(.+?)\n\*\*Backend\*\*:\s*(.+?)\n\*\*Database\*\*:\s*(.+?)(?:\n|$)', content, re.DOTALL)
    if tech_match:
        data['tech_stack'] = {
            'frontend': tech_match.group(1).strip(),
            'backend': tech_match.group(2).strip(),
            'database': tech_match.group(3).strip()
        }
    else:
        data['tech_stack'] = {}
    
    # Extract API endpoints
    api_section = re.search(r'##\s+🔌\s+API Endpoints.*?\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if api_section:
        endpoints = re.findall(r'\|\s*`([^`]+)`\s*\|\s*(\w+)\s*\|\s*([^|]+)\|', api_section.group(1))
        data['api_endpoints'] = [(e.strip(), m.strip(), d.strip()) for e, m, d in endpoints]
    else:
        data['api_endpoints'] = []
    
    return data

def parse_roadmap():
    """Parse ROADMAP.md for future plans"""
    roadmap_path = DOCS_DIR / "ROADMAP.md"
    if not roadmap_path.exists():
        return []
    
    with open(roadmap_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract future enhancements
    future_section = re.search(r'##\s+🎯\s+Future Enhancements.*?\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if future_section:
        items = re.findall(r'-\s+\*\*(.+?)\*\*\s*\n\s+-\s+(.+?)(?=\n\s+-\s+\*\*|\n\n|\Z)', future_section.group(1), re.DOTALL)
        return [(title.strip(), desc.strip()) for title, desc in items]
    return []

def parse_ai_video_feature():
    """Parse AI_VIDEO_FEATURE.md for AI capabilities"""
    ai_doc_path = DOCS_DIR / "AI_VIDEO_FEATURE.md"
    if not ai_doc_path.exists():
        return {}
    
    with open(ai_doc_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    data = {}
    
    # Extract overview
    overview_match = re.search(r'##\s+Overview\s*\n(.*?)(?=\n##|\Z)', content, re.DOTALL)
    if overview_match:
        data['overview'] = overview_match.group(1).strip()
    
    return data

def create_title_page(canvas_obj, doc):
    """Custom title page"""
    canvas_obj.saveState()
    
    # Gradient background effect
    canvas_obj.setFillColorRGB(0.4, 0.49, 0.92)
    canvas_obj.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    
    # Title
    canvas_obj.setFillColorRGB(1, 1, 1)
    canvas_obj.setFont("Helvetica-Bold", 44)
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 2.2*inch, "Passive Learning")
    canvas_obj.setFont("Helvetica-Bold", 44)
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 2.8*inch, "with Dopamine")
    
    # Emoji
    canvas_obj.setFont("Helvetica", 70)
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 4*inch, "🧠💡")
    
    # Tagline
    canvas_obj.setFont("Helvetica-Bold", 20)
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 5*inch, "Neurological Learning Revolution")
    
    canvas_obj.setFont("Helvetica", 14)
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 5.5*inch, "Continuous Passive Learning Through")
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 5.9*inch, "Dopamine-Driven Video Scrolling & AI Generation")
    
    # Investment ask
    canvas_obj.setFont("Helvetica-Bold", 38)
    canvas_obj.drawCentredString(A4[0]/2, 3*inch, "Seed Round")
    
    # Footer
    canvas_obj.setFont("Helvetica", 11)
    canvas_obj.drawCentredString(A4[0]/2, 0.8*inch, "Confidential - December 2025")
    
    canvas_obj.restoreState()

def get_screenshots():
    """Get all screenshots sorted by name"""
    if not SCREENSHOTS_DIR.exists():
        print(f"⚠️  Screenshots directory not found: {SCREENSHOTS_DIR}")
        return []
    
    screenshots = sorted(SCREENSHOTS_DIR.glob("*.png"))
    print(f"📸 Found {len(screenshots)} screenshots")
    return screenshots

def create_pitch_deck():
    """Generate the PDF pitch deck dynamically from project files"""
    
    print("🚀 Starting dynamic PDF generation...")
    print("📖 Reading project documentation...")
    
    # Parse project files
    readme_data = parse_readme()
    roadmap_data = parse_roadmap()
    ai_data = parse_ai_video_feature()
    
    print(f"✓ Parsed README: {len(readme_data.get('features', []))} features found")
    print(f"✓ Parsed ROADMAP: {len(roadmap_data)} future items found")
    
    # Create PDF document
    doc = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=32,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=24,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=15,
        spaceBefore=20,
        fontName='Helvetica-Bold'
    )
    
    subheading_style = ParagraphStyle(
        'CustomSubheading',
        parent=styles['Heading3'],
        fontSize=18,
        textColor=colors.HexColor('#764ba2'),
        spaceAfter=10,
        spaceBefore=15,
        fontName='Helvetica-Bold'
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['BodyText'],
        fontSize=12,
        spaceAfter=10,
        alignment=TA_JUSTIFY,
        leading=16
    )
    
    bullet_style = ParagraphStyle(
        'CustomBullet',
        parent=styles['BodyText'],
        fontSize=11,
        spaceAfter=8,
        leftIndent=20,
        bulletIndent=10,
        leading=14
    )
    
    caption_style = ParagraphStyle(
        'Caption',
        parent=styles['BodyText'],
        fontSize=10,
        textColor=colors.HexColor('#4b5563'),
        alignment=TA_CENTER,
        italic=True
    )
    
    # Page 2: Core Concept
    story.append(PageBreak())
    story.append(Paragraph("🧠 The Core Concept", heading_style))
    story.append(Paragraph("<b>Passive Learning with Dopamine</b>", subheading_style))
    story.append(Paragraph(
        "Traditional learning requires <b>active effort</b> - users must consciously decide to study, focus, and memorize. "
        "This creates friction and leads to 95% abandonment rates. Our platform eliminates this friction entirely through "
        "<b>passive, continuous learning</b> driven by the brain's natural dopamine reward system.",
        body_style
    ))
    story.append(Spacer(1, 0.2*inch))
    
    story.append(Paragraph("<b>How It Works: The Dopamine Learning Loop</b>", subheading_style))
    
    dopamine_mechanics = [
        "<b>Swipe Right (Know)</b> → Instant dopamine hit from success → Brain craves more validation",
        "<b>Swipe Left (Don't Know)</b> → Instant video reward → Brain associates 'not knowing' with entertainment",
        "<b>Video Scrolling</b> → Infinite vertical feed (TikTok-style) → No stopping points, continuous engagement",
        "<b>AI-Generated Content</b> → Personalized videos for each word → Maximizes relevance and retention",
        "<b>Statistics Tracking</b> → Every action recorded → Creates FOMO and streak anxiety"
    ]
    
    for mechanic in dopamine_mechanics:
        story.append(Paragraph(f"• {mechanic}", bullet_style))
    
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(
        "The result: Users don't 'study' - they <b>passively absorb</b> vocabulary while their brain thinks they're "
        "just scrolling social media. Learning happens <b>unconsciously</b> through repetition and dopamine reinforcement.",
        body_style
    ))
    
    # Page 3: Statistics Tracking System
    story.append(PageBreak())
    story.append(Paragraph("📊 Advanced Statistics Tracking System", heading_style))
    story.append(Paragraph(
        "Every user interaction is meticulously tracked to create a <b>comprehensive behavioral profile</b> that "
        "optimizes learning and maximizes engagement. Our database captures:",
        body_style
    ))
    story.append(Spacer(1, 0.2*inch))
    
    tracking_metrics = [
        ("<b>Swipe Right Count</b>", "How many times user marked a word as 'known' - measures confidence growth"),
        ("<b>Swipe Left Count</b>", "How many times user marked as 'don't know' - identifies weak areas"),
        ("<b>Review Count</b>", "Total times each word was reviewed - tracks exposure frequency"),
        ("<b>Last Reviewed Timestamp</b>", "Precise timing data - enables spaced repetition algorithms"),
        ("<b>Video Watch Time</b>", "How long users watch each video - measures engagement per word"),
        ("<b>Scroll Velocity</b>", "Speed of video scrolling - indicates interest level"),
        ("<b>Session Duration</b>", "Time spent per session - tracks addictiveness"),
        ("<b>Category Preferences</b>", "Which topics generate most engagement - personalizes content")
    ]
    
    for metric, desc in tracking_metrics:
        story.append(Paragraph(f"• {metric}: {desc}", bullet_style))
    
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("<b>Why This Data Matters</b>", subheading_style))
    story.append(Paragraph(
        "This granular tracking enables <b>AI-powered personalization</b>: the system learns which words need more exposure, "
        "which video styles work best for each user, and when to surface content for maximum retention. It's not just "
        "tracking - it's <b>behavioral prediction</b> that keeps users engaged longer.",
        body_style
    ))
    
    # Page 4: Features from README
    if readme_data.get('features'):
        story.append(PageBreak())
        story.append(Paragraph("✨ Platform Features", heading_style))
        story.append(Paragraph(
            "Our platform combines proven social media mechanics with educational content:",
            body_style
        ))
        story.append(Spacer(1, 0.2*inch))
        
        for feature_name, feature_desc in readme_data['features'][:6]:  # Top 6 features
            story.append(Paragraph(f"<b>{feature_name}</b>", subheading_style))
            story.append(Paragraph(feature_desc, body_style))
            story.append(Spacer(1, 0.1*inch))
    
    # Page 5+: Screenshots with captions
    screenshots = get_screenshots()
    screenshot_captions = [
        ("<b>Gamified category selection interface</b> - Users choose learning topics visually. "
         "Each category shows emoji icons and word counts, creating immediate engagement through choice and personalization."),
        ("<b>Tinder-style card swiping mechanism</b> - Swipe right (know) triggers instant dopamine validation. "
         "Swipe left (don't know) triggers video reward. Every gesture produces pleasure, creating compulsive engagement loop."),
        ("<b>TikTok-style vertical video feed</b> - Full-screen videos with word overlays. Users scroll through 8 AI-generated "
         "videos per word. Auto-play, zero friction, infinite scroll. Learning happens unconsciously through passive visual repetition."),
        ("<b>Complete vocabulary library with granular statistics</b> - Shows swipe right/left counts, total reviews, "
         "last reviewed timestamps. Advanced filtering by status (known/unknown) and category. Every metric feeds AI personalization."),
        ("<b>Interactive D3.js force-directed grammar graph</b> - Visualizes sentence structure with draggable nodes. "
         "Shows grammatical relationships (subject, verb, object) with color-coded connections. Passive learning through visual exploration.")
    ]
    
    for idx, screenshot in enumerate(screenshots):
        story.append(PageBreak())
        story.append(Paragraph(f"📱 Product Screenshot {idx + 1}", heading_style))
        story.append(Spacer(1, 0.15*inch))
        
        img = Image(str(screenshot), width=5.5*inch, height=5.5*inch, kind='proportional')
        story.append(img)
        story.append(Spacer(1, 0.15*inch))
        
        if idx < len(screenshot_captions):
            story.append(Paragraph(screenshot_captions[idx], caption_style))
    
    # Page: Technology Stack from README
    if readme_data.get('tech_stack'):
        story.append(PageBreak())
        story.append(Paragraph("🔬 Technology Stack", heading_style))
        
        tech_data = [
            ['Component', 'Technology'],
            ['Frontend', readme_data['tech_stack'].get('frontend', 'React + TypeScript')],
            ['Backend', readme_data['tech_stack'].get('backend', 'Python + FastAPI')],
            ['Database', readme_data['tech_stack'].get('database', 'PostgreSQL')],
        ]
        
        tech_table = Table(tech_data, colWidths=[2*inch, 4.5*inch])
        tech_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))
        
        story.append(tech_table)
    
    # Page: Market Opportunity
    story.append(PageBreak())
    story.append(Paragraph("📈 Market Opportunity: The Attention Economy", heading_style))
    story.append(Paragraph(
        "We're not just competing in language learning - we're competing for <b>screen time</b> against TikTok, "
        "Instagram, and YouTube. By using the same dopamine-driven mechanics, we can capture hours of daily engagement "
        "that currently goes to entertainment platforms.",
        body_style
    ))
    story.append(Spacer(1, 0.2*inch))
    
    market_data = [
        ['Metric', 'Value'],
        ['Global Language Learning Market', '$82 Billion'],
        ['Annual Growth Rate', '18.7%'],
        ['Digital Language Learners', '1.5 Billion'],
        ['Target Market', 'Millennials & Gen Z (18-35)']
    ]
    
    market_table = Table(market_data, colWidths=[3*inch, 3*inch])
    market_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('TOPPADDING', (0, 1), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
    ]))
    
    story.append(market_table)
    story.append(Spacer(1, 0.3*inch))
    
    story.append(Paragraph("<b>🏆 Competitive Advantage: Passive Learning vs Active Study</b>", subheading_style))
    story.append(Paragraph(
        "<b>Duolingo, Babbel, Rosetta Stone</b> all require <b>active effort</b> - users must consciously decide to study. "
        "We eliminate this friction through <b>passive, continuous learning</b>. Users think they're scrolling videos "
        "(entertainment), but they're actually learning (education). The dopamine system does the work, not willpower.",
        body_style
    ))
    
    # Page: Roadmap from ROADMAP.md
    if roadmap_data:
        story.append(PageBreak())
        story.append(Paragraph("🗺️ Future Roadmap", heading_style))
        story.append(Paragraph(
            "Our development roadmap focuses on enhancing the passive learning experience and expanding capabilities:",
            body_style
        ))
        story.append(Spacer(1, 0.2*inch))
        
        for title, desc in roadmap_data[:5]:  # Top 5 items
            story.append(Paragraph(f"<b>{title}</b>", subheading_style))
            story.append(Paragraph(desc, body_style))
            story.append(Spacer(1, 0.1*inch))
    
    # Page: Investment Ask
    story.append(PageBreak())
    story.append(Paragraph("🚀 Investment Ask", heading_style))
    story.append(Spacer(1, 0.3*inch))
    
    ask_data = [
        ['Use of Funds', 'Product Development (40%)\nMarketing & User Acquisition (35%)\nTeam Expansion (15%)\nOperational Costs (10%)']
    ]
    
    ask_table = Table(ask_data, colWidths=[2.5*inch, 4*inch])
    ask_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
        ('BACKGROUND', (1, 0), (1, -1), colors.beige),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (1, 0), (1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 14),
        ('GRID', (0, 0), (-1, -1), 2, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 15),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
    ]))
    
    story.append(ask_table)
    story.append(Spacer(1, 0.5*inch))
    
    story.append(Paragraph("<b>Why Now?</b>", subheading_style))
    why_now = [
        "<b>AI video generation just became accessible</b>: Gemini 2.0 enables real-time personalized content",
        "<b>Dopamine-driven design is proven</b>: TikTok/Instagram have validated the infinite scroll model",
        "<b>Gen Z expects passive consumption</b>: Active study feels outdated to digital natives",
        "<b>Statistics tracking is now standard</b>: Users expect personalized experiences based on their data",
        "<b>Market timing is perfect</b>: Language learning growing 18.7% annually, ripe for disruption"
    ]
    for reason in why_now:
        story.append(Paragraph(f"• {reason}", bullet_style))
    
    # Page: Contact
    story.append(PageBreak())
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph("📧 Contact Us", title_style))
    story.append(Spacer(1, 0.5*inch))
    
    contact_style = ParagraphStyle(
        'Contact',
        parent=styles['BodyText'],
        fontSize=14,
        alignment=TA_CENTER,
        spaceAfter=10
    )
    
    story.append(Paragraph("<b>Ready to revolutionize learning through dopamine?</b>", contact_style))
    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph(
        "Let's discuss how passive learning can replace active study, "
        "and how statistics-driven personalization can maximize engagement.",
        contact_style
    ))
    story.append(Spacer(1, 0.5*inch))
    story.append(Paragraph("<b>Email:</b> hello@passivelearning.ai", contact_style))
    story.append(Paragraph("<b>Website:</b> www.passivelearning.ai", contact_style))
    
    # Build PDF
    doc.build(story, onFirstPage=create_title_page, onLaterPages=lambda c, d: None)
    
    print(f"✅ PDF generated successfully: {OUTPUT_PDF}")
    print(f"📄 File size: {OUTPUT_PDF.stat().st_size / 1024:.1f} KB")
    print(f"📝 Content sourced from: README.md, docs/ROADMAP.md, docs/AI_VIDEO_FEATURE.md")

if __name__ == "__main__":
    create_pitch_deck()
