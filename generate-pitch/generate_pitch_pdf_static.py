#!/usr/bin/env python3
"""
Generate Investor Pitch Deck PDF for Tinder for Languages
Uses screenshots and content from pitch.html
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from pathlib import Path
import os

# Paths
PROJECT_ROOT = Path(__file__).parent
SCREENSHOTS_DIR = PROJECT_ROOT / "screenshot_project"
OUTPUT_PDF = PROJECT_ROOT / "Passive_Learning_with_Dopamine_Pitch_Deck.pdf"

def create_title_page(canvas_obj, doc):
    """Custom title page"""
    canvas_obj.saveState()
    
    # Gradient background effect (simulated with rectangles)
    canvas_obj.setFillColorRGB(0.4, 0.49, 0.92)  # Purple-blue
    canvas_obj.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    
    # Title - centered and clear
    canvas_obj.setFillColorRGB(1, 1, 1)
    canvas_obj.setFont("Helvetica-Bold", 44)
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 2.2*inch, "Passive Learning")
    canvas_obj.setFont("Helvetica-Bold", 44)
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 2.8*inch, "with Dopamine")
    
    # Emoji - larger and more prominent
    canvas_obj.setFont("Helvetica", 70)
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 4*inch, "🧠💡")
    
    # Tagline - better spacing
    canvas_obj.setFont("Helvetica-Bold", 20)
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 5*inch, "Neurological Learning Revolution")
    
    canvas_obj.setFont("Helvetica", 14)
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 5.5*inch, "Continuous Passive Learning Through")
    canvas_obj.drawCentredString(A4[0]/2, A4[1] - 5.9*inch, "Dopamine-Driven Video Scrolling & AI Generation")
    
    # Investment ask - clear separation
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
    """Generate the PDF pitch deck"""
    
    print("🚀 Starting PDF generation...")
    
    # Create PDF document
    doc = SimpleDocTemplate(
        str(OUTPUT_PDF),
        pagesize=A4,
        rightMargin=0.5*inch,
        leftMargin=0.5*inch,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch
    )
    
    # Container for PDF elements
    story = []
    
    # Styles
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
    
    # Page 1: Title (custom canvas)
    # Will be added via onFirstPage callback
    
    # Page 2: The Core Concept - Passive Learning with Dopamine
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
    
    # Page 3: Statistics Tracking System - The Data Engine
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
    
    # Page 4: Passive Learning Through AI & Scrolling
    story.append(PageBreak())
    story.append(Paragraph("🎬 Passive Learning Engine: AI Video Generation + Infinite Scrolling", heading_style))
    
    story.append(Paragraph("<b>The Continuous Learning Loop</b>", subheading_style))
    story.append(Paragraph(
        "Unlike traditional apps where users must actively choose to study, our platform creates a <b>continuous, "
        "passive learning experience</b> that mimics social media consumption:",
        body_style
    ))
    story.append(Spacer(1, 0.2*inch))
    
    passive_flow = [
        ("1. User swipes left on unknown word", "Triggers instant video generation"),
        ("2. AI generates 8 personalized videos", "Google Gemini creates contextual visual content"),
        ("3. Vertical video feed opens (TikTok-style)", "Full-screen, auto-play, zero friction"),
        ("4. User scrolls through videos", "Each scroll = passive exposure to word + visual context"),
        ("5. Word + translation overlay on every video", "Repetition without conscious effort"),
        ("6. No exit points - infinite scroll", "Brain stays engaged, learning continues unconsciously"),
        ("7. Statistics tracked in real-time", "System learns user behavior, optimizes next content")
    ]
    
    for step, desc in passive_flow:
        story.append(Paragraph(f"<b>{step}</b>", subheading_style))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 0.1*inch))
    
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Why This Creates Passive Learning</b>", subheading_style))
    passive_reasons = [
        "<b>No Active Recall Required</b>: Users don't 'try' to memorize - they just watch",
        "<b>Dopamine Drives Behavior</b>: Each swipe/scroll triggers reward, creating compulsive engagement",
        "<b>Visual Association</b>: Brain automatically links moving images with word overlays",
        "<b>Repetition Without Boredom</b>: 8 different videos = 8 exposures that feel fresh",
        "<b>Zero Cognitive Load</b>: Learning happens in background while brain thinks it's entertainment"
    ]
    for reason in passive_reasons:
        story.append(Paragraph(f"• {reason}", bullet_style))
    
    # Page 5: Screenshots - Category Selection
    screenshots = get_screenshots()
    if len(screenshots) > 0:
        story.append(PageBreak())
        story.append(Paragraph("📱 Product Screenshots", heading_style))
        story.append(Paragraph("<b>Category Selection Screen</b>", subheading_style))
        story.append(Spacer(1, 0.15*inch))
        
        # Add first screenshot
        img = Image(str(screenshots[0]), width=5.5*inch, height=5.5*inch, kind='proportional')
        story.append(img)
        story.append(Spacer(1, 0.15*inch))
        
        # Caption under screenshot
        caption_style = ParagraphStyle(
            'Caption',
            parent=styles['BodyText'],
            fontSize=10,
            textColor=colors.HexColor('#4b5563'),
            alignment=TA_CENTER,
            italic=True
        )
        story.append(Paragraph(
            "<b>Gamified category selection interface</b> - Users choose learning topics visually. "
            "Each category shows emoji icons and word counts, creating immediate engagement through choice and personalization.",
            caption_style
        ))
    
    # Page 6: More Screenshots
    if len(screenshots) > 1:
        story.append(PageBreak())
        story.append(Paragraph("📱 Dopamine-Driven Swipe Interface", heading_style))
        story.append(Spacer(1, 0.15*inch))
        
        img = Image(str(screenshots[1]), width=5.5*inch, height=5.5*inch, kind='proportional')
        story.append(img)
        story.append(Spacer(1, 0.15*inch))
        
        # Caption
        caption_style = ParagraphStyle(
            'Caption',
            parent=styles['BodyText'],
            fontSize=10,
            textColor=colors.HexColor('#4b5563'),
            alignment=TA_CENTER,
            italic=True
        )
        story.append(Paragraph(
            "<b>Tinder-style card swiping mechanism</b> - Swipe right (know) triggers instant dopamine validation. "
            "Swipe left (don't know) triggers video reward. Every gesture produces pleasure, creating compulsive engagement loop.",
            caption_style
        ))
    
    # Page 7: Video Reel Screenshots
    if len(screenshots) > 2:
        story.append(PageBreak())
        story.append(Paragraph("🎬 Passive Learning Through Infinite Scroll", heading_style))
        story.append(Spacer(1, 0.15*inch))
        
        img = Image(str(screenshots[2]), width=5.5*inch, height=5.5*inch, kind='proportional')
        story.append(img)
        story.append(Spacer(1, 0.15*inch))
        
        # Caption
        caption_style = ParagraphStyle(
            'Caption',
            parent=styles['BodyText'],
            fontSize=10,
            textColor=colors.HexColor('#4b5563'),
            alignment=TA_CENTER,
            italic=True
        )
        story.append(Paragraph(
            "<b>TikTok-style vertical video feed</b> - Full-screen videos with word overlays. Users scroll through 8 AI-generated "
            "videos per word. Auto-play, zero friction, infinite scroll. Learning happens unconsciously through passive visual repetition.",
            caption_style
        ))
    
    # Page 8: More Features
    if len(screenshots) > 3:
        story.append(PageBreak())
        story.append(Paragraph("📚 Statistics Dashboard: Behavioral Data Visualization", heading_style))
        story.append(Spacer(1, 0.15*inch))
        
        img = Image(str(screenshots[3]), width=5.5*inch, height=5.5*inch, kind='proportional')
        story.append(img)
        story.append(Spacer(1, 0.15*inch))
        
        # Caption
        caption_style = ParagraphStyle(
            'Caption',
            parent=styles['BodyText'],
            fontSize=10,
            textColor=colors.HexColor('#4b5563'),
            alignment=TA_CENTER,
            italic=True
        )
        story.append(Paragraph(
            "<b>Complete vocabulary library with granular statistics</b> - Shows swipe right/left counts, total reviews, "
            "last reviewed timestamps. Advanced filtering by status (known/unknown) and category. Every metric feeds AI personalization.",
            caption_style
        ))
    
    # Page 9: Grammar Lab
    if len(screenshots) > 4:
        story.append(PageBreak())
        story.append(Paragraph("🧪 Grammar Lab: Advanced Learning Module", heading_style))
        story.append(Spacer(1, 0.15*inch))
        
        img = Image(str(screenshots[4]), width=5.5*inch, height=5.5*inch, kind='proportional')
        story.append(img)
        story.append(Spacer(1, 0.15*inch))
        
        # Caption
        caption_style = ParagraphStyle(
            'Caption',
            parent=styles['BodyText'],
            fontSize=10,
            textColor=colors.HexColor('#4b5563'),
            alignment=TA_CENTER,
            italic=True
        )
        story.append(Paragraph(
            "<b>Interactive D3.js force-directed grammar graph</b> - Visualizes sentence structure with draggable nodes. "
            "Shows grammatical relationships (subject, verb, object) with color-coded connections. Passive learning through visual exploration.",
            caption_style
        ))
    
    # Page 10: Market Opportunity
    story.append(PageBreak())
    story.append(Paragraph("📈 Market Opportunity: The Attention Economy", heading_style))
    story.append(Paragraph(
        "We're not just competing in language learning - we're competing for <b>screen time</b> against TikTok, "
        "Instagram, and YouTube. By using the same dopamine-driven mechanics, we can capture hours of daily engagement "
        "that currently goes to entertainment platforms.",
        body_style
    ))
    story.append(Spacer(1, 0.2*inch))
    
    # Market stats table
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
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph(
        "Our statistics tracking system creates a <b>feedback loop</b>: every swipe, scroll, and video view trains "
        "the AI to serve more addictive content. The more users engage, the better the system gets at keeping them engaged.",
        body_style
    ))
    
    # Page 10: Technology
    story.append(PageBreak())
    story.append(Paragraph("🔬 Technology Stack", heading_style))
    
    tech_data = [
        ['Component', 'Technology', 'Purpose'],
        ['Frontend', 'React 18 + TypeScript + Vite', 'Mobile-first, 60fps animations'],
        ['Backend', 'Python + FastAPI', 'High-performance API'],
        ['Database', 'PostgreSQL', 'Enterprise-grade reliability'],
        ['AI Video', 'Google Gemini 2.0 + Veo', 'Personalized video generation'],
        ['Video API', 'YouTube Data API v3', 'Educational content curation']
    ]
    
    tech_table = Table(tech_data, colWidths=[1.5*inch, 2.5*inch, 2.5*inch])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    
    story.append(tech_table)
    
    # Page 11: Business Model
    story.append(PageBreak())
    story.append(Paragraph("💰 Business Model: Monetizing Attention", heading_style))
    story.append(Paragraph(
        "Our business model is built on the same principle as social media: <b>capture attention, then monetize it</b>. "
        "The longer users stay engaged, the more valuable they become.",
        body_style
    ))
    story.append(Spacer(1, 0.2*inch))
    
    story.append(Paragraph("<b>Freemium Subscription Model</b>", subheading_style))
    
    pricing_data = [
        ['Tier', 'Price', 'Features'],
        ['Free', '€0/month', 'Limited daily swipes, YouTube videos only'],
        ['Premium', '€9.99/month', 'Unlimited swipes, AI videos, offline mode'],
        ['Pro', '€19.99/month', 'All Premium + Grammar Lab, Analytics']
    ]
    
    pricing_table = Table(pricing_data, colWidths=[1.5*inch, 1.5*inch, 3.5*inch])
    pricing_table.setStyle(TableStyle([
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
    
    story.append(pricing_table)
    story.append(Spacer(1, 0.3*inch))
    
    story.append(Paragraph("<b>Revenue Projections (Year 1-3)</b>", subheading_style))
    revenue_bullets = [
        "Year 1: 10K users → €50K MRR → €600K ARR (Focus: Prove dopamine mechanics work)",
        "Year 2: 100K users → €500K MRR → €6M ARR (Focus: Scale AI personalization)",
        "Year 3: 500K users → €2.5M MRR → €30M ARR (Focus: Multi-language expansion)"
    ]
    for bullet in revenue_bullets:
        story.append(Paragraph(f"• {bullet}", bullet_style))
    
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Data Monetization Potential</b>", subheading_style))
    story.append(Paragraph(
        "Beyond subscriptions, our comprehensive statistics tracking creates valuable <b>behavioral learning data</b> "
        "that can be anonymized and licensed to educational institutions, AI training companies, and cognitive research labs.",
        body_style
    ))
    
    # Page 12: Roadmap
    story.append(PageBreak())
    story.append(Paragraph("🗺️ Roadmap", heading_style))
    
    roadmap = [
        ("Q1 2026 - MVP Launch", "German language, 1000 flashcards, YouTube integration, basic statistics tracking"),
        ("Q2 2026 - AI Video Integration", "Google Gemini video generation, advanced dopamine metrics"),
        ("Q3 2026 - Personalization Engine", "AI-powered content optimization based on user behavior patterns"),
        ("Q4 2026 - Mobile Apps", "iOS and Android native apps with enhanced scroll mechanics"),
        ("2027 - Scale & Data", "10+ languages, B2B partnerships, data licensing program")
    ]
    
    for phase, desc in roadmap:
        story.append(Paragraph(f"<b>{phase}</b>", subheading_style))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 0.1*inch))
    
    # Page 13: The Ask
    story.append(PageBreak())
    story.append(Paragraph("🚀 Investment Ask", heading_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Investment box
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
    
    # Page 14: Contact
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
    
    # Build PDF with custom first page
    doc.build(story, onFirstPage=create_title_page, onLaterPages=lambda c, d: None)
    
    print(f"✅ PDF generated successfully: {OUTPUT_PDF}")
    print(f"📄 File size: {OUTPUT_PDF.stat().st_size / 1024:.1f} KB")

if __name__ == "__main__":
    create_pitch_deck()
