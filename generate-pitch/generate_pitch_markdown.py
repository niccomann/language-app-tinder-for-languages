#!/usr/bin/env python3
"""
Dynamic Markdown Pitch Deck Generator for Passive Learning with Dopamine
Automatically reads content from README.md and docs/ folder
Generates a .md file with the same structure as the PDF
"""

from pathlib import Path
import re
from datetime import datetime

# Paths
PROJECT_ROOT = Path(__file__).parent.parent  # Parent of generate-pitch folder
OUTPUT_DIR = Path(__file__).parent / "output"  # Output folder within generate-pitch
SCREENSHOTS_DIR = PROJECT_ROOT / "screenshot_project"
OUTPUT_MD = OUTPUT_DIR / "PITCH_DECK.md"
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

def get_screenshots():
    """Get all screenshots sorted by name"""
    if not SCREENSHOTS_DIR.exists():
        print(f"⚠️  Screenshots directory not found: {SCREENSHOTS_DIR}")
        return []
    
    screenshots = sorted(SCREENSHOTS_DIR.glob("*.png"))
    return screenshots

def generate_markdown():
    """Generate Markdown pitch deck from project files"""
    
    print("🚀 Starting dynamic Markdown generation...")
    print("📖 Reading project documentation...")
    
    # Parse project files
    readme_data = parse_readme()
    roadmap_data = parse_roadmap()
    screenshots = get_screenshots()
    
    print(f"✓ Parsed README: {len(readme_data.get('features', []))} features found")
    print(f"✓ Parsed ROADMAP: {len(roadmap_data)} future items found")
    print(f"📸 Found {len(screenshots)} screenshots")
    
    # Start building markdown content
    md_content = []
    
    # Title Page
    md_content.append("# Passive Learning with Dopamine")
    md_content.append("")
    md_content.append("## 🧠💡 Neurological Learning Revolution")
    md_content.append("")
    md_content.append("**Continuous Passive Learning Through Dopamine-Driven Video Scrolling & AI Generation**")
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    md_content.append("### 🚀 Seed Round")
    md_content.append("")
    md_content.append("*Confidential - December 2025*")
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    
    # Page 2: Core Concept
    md_content.append("## 🧠 The Core Concept")
    md_content.append("")
    md_content.append("### Passive Learning with Dopamine")
    md_content.append("")
    md_content.append("Traditional learning requires **active effort** - users must consciously decide to study, focus, and memorize. This creates friction and leads to 95% abandonment rates. Our platform eliminates this friction entirely through **passive, continuous learning** driven by the brain's natural dopamine reward system.")
    md_content.append("")
    md_content.append("### How It Works: The Dopamine Learning Loop")
    md_content.append("")
    
    dopamine_mechanics = [
        "**Swipe Right (Know)** → Instant dopamine hit from success → Brain craves more validation",
        "**Swipe Left (Don't Know)** → Instant video reward → Brain associates 'not knowing' with entertainment",
        "**Video Scrolling** → Infinite vertical feed (TikTok-style) → No stopping points, continuous engagement",
        "**AI-Generated Content** → Personalized videos for each word → Maximizes relevance and retention",
        "**Statistics Tracking** → Every action recorded → Creates FOMO and streak anxiety"
    ]
    
    for mechanic in dopamine_mechanics:
        md_content.append(f"- {mechanic}")
    
    md_content.append("")
    md_content.append("**The result**: Users don't 'study' - they **passively absorb** vocabulary while their brain thinks they're just scrolling social media. Learning happens **unconsciously** through repetition and dopamine reinforcement.")
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    
    # Page 3: Statistics Tracking
    md_content.append("## 📊 Advanced Statistics Tracking System")
    md_content.append("")
    md_content.append("Every user interaction is meticulously tracked to create a **comprehensive behavioral profile** that optimizes learning and maximizes engagement. Our database captures:")
    md_content.append("")
    
    tracking_metrics = [
        ("**Swipe Right Count**", "How many times user marked a word as 'known' - measures confidence growth"),
        ("**Swipe Left Count**", "How many times user marked as 'don't know' - identifies weak areas"),
        ("**Review Count**", "Total times each word was reviewed - tracks exposure frequency"),
        ("**Last Reviewed Timestamp**", "Precise timing data - enables spaced repetition algorithms"),
        ("**Video Watch Time**", "How long users watch each video - measures engagement per word"),
        ("**Scroll Velocity**", "Speed of video scrolling - indicates interest level"),
        ("**Session Duration**", "Time spent per session - tracks addictiveness"),
        ("**Category Preferences**", "Which topics generate most engagement - personalizes content")
    ]
    
    for metric, desc in tracking_metrics:
        md_content.append(f"- {metric}: {desc}")
    
    md_content.append("")
    md_content.append("### Why This Data Matters")
    md_content.append("")
    md_content.append("This granular tracking enables **AI-powered personalization**: the system learns which words need more exposure, which video styles work best for each user, and when to surface content for maximum retention. It's not just tracking - it's **behavioral prediction** that keeps users engaged longer.")
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    
    # Page 4: Features from README
    if readme_data.get('features'):
        md_content.append("## ✨ Platform Features")
        md_content.append("")
        md_content.append("Our platform combines proven social media mechanics with educational content:")
        md_content.append("")
        
        for feature_name, feature_desc in readme_data['features'][:6]:
            md_content.append(f"### {feature_name}")
            md_content.append("")
            md_content.append(feature_desc)
            md_content.append("")
        
        md_content.append("---")
        md_content.append("")
    
    # Screenshots Section
    if screenshots:
        md_content.append("## 📱 Product Screenshots")
        md_content.append("")
        
        screenshot_captions = [
            ("Category Selection", "**Gamified category selection interface** - Users choose learning topics visually. Each category shows emoji icons and word counts, creating immediate engagement through choice and personalization."),
            ("Swipe Interface", "**Tinder-style card swiping mechanism** - Swipe right (know) triggers instant dopamine validation. Swipe left (don't know) triggers video reward. Every gesture produces pleasure, creating compulsive engagement loop."),
            ("Video Reel", "**TikTok-style vertical video feed** - Full-screen videos with word overlays. Users scroll through 8 AI-generated videos per word. Auto-play, zero friction, infinite scroll. Learning happens unconsciously through passive visual repetition."),
            ("Statistics Dashboard", "**Complete vocabulary library with granular statistics** - Shows swipe right/left counts, total reviews, last reviewed timestamps. Advanced filtering by status (known/unknown) and category. Every metric feeds AI personalization."),
            ("Grammar Lab", "**Interactive D3.js force-directed grammar graph** - Visualizes sentence structure with draggable nodes. Shows grammatical relationships (subject, verb, object) with color-coded connections. Passive learning through visual exploration.")
        ]
        
        for idx, screenshot in enumerate(screenshots):
            if idx < len(screenshot_captions):
                title, caption = screenshot_captions[idx]
                md_content.append(f"### {idx + 1}. {title}")
                md_content.append("")
                md_content.append(f"![{title}]({screenshot.relative_to(PROJECT_ROOT)})")
                md_content.append("")
                md_content.append(f"*{caption}*")
                md_content.append("")
        
        md_content.append("---")
        md_content.append("")
    
    # Technology Stack
    if readme_data.get('tech_stack'):
        md_content.append("## 🔬 Technology Stack")
        md_content.append("")
        md_content.append("| Component | Technology |")
        md_content.append("|-----------|------------|")
        md_content.append(f"| **Frontend** | {readme_data['tech_stack'].get('frontend', 'React + TypeScript')} |")
        md_content.append(f"| **Backend** | {readme_data['tech_stack'].get('backend', 'Python + FastAPI')} |")
        md_content.append(f"| **Database** | {readme_data['tech_stack'].get('database', 'PostgreSQL')} |")
        md_content.append("")
        md_content.append("---")
        md_content.append("")
    
    # Market Opportunity
    md_content.append("## 📈 Market Opportunity: The Attention Economy")
    md_content.append("")
    md_content.append("We're not just competing in language learning - we're competing for **screen time** against TikTok, Instagram, and YouTube. By using the same dopamine-driven mechanics, we can capture hours of daily engagement that currently goes to entertainment platforms.")
    md_content.append("")
    md_content.append("### Market Statistics")
    md_content.append("")
    md_content.append("| Metric | Value |")
    md_content.append("|--------|-------|")
    md_content.append("| **Global Language Learning Market** | $82 Billion |")
    md_content.append("| **Annual Growth Rate** | 18.7% |")
    md_content.append("| **Digital Language Learners** | 1.5 Billion |")
    md_content.append("| **Target Market** | Millennials & Gen Z (18-35) |")
    md_content.append("")
    md_content.append("### 🏆 Competitive Advantage: Passive Learning vs Active Study")
    md_content.append("")
    md_content.append("**Duolingo, Babbel, Rosetta Stone** all require **active effort** - users must consciously decide to study. We eliminate this friction through **passive, continuous learning**. Users think they're scrolling videos (entertainment), but they're actually learning (education). The dopamine system does the work, not willpower.")
    md_content.append("")
    md_content.append("Our statistics tracking system creates a **feedback loop**: every swipe, scroll, and video view trains the AI to serve more addictive content. The more users engage, the better the system gets at keeping them engaged.")
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    
    # Roadmap
    if roadmap_data:
        md_content.append("## 🗺️ Future Roadmap")
        md_content.append("")
        md_content.append("Our development roadmap focuses on enhancing the passive learning experience and expanding capabilities:")
        md_content.append("")
        
        for title, desc in roadmap_data[:5]:
            md_content.append(f"### {title}")
            md_content.append("")
            md_content.append(desc)
            md_content.append("")
        
        md_content.append("---")
        md_content.append("")
    
    # Investment Ask
    md_content.append("## 🚀 Investment Ask")
    md_content.append("")
    md_content.append("### Use of Funds")
    md_content.append("")
    md_content.append("- **Product Development** (40%)")
    md_content.append("- **Marketing & User Acquisition** (35%)")
    md_content.append("- **Team Expansion** (15%)")
    md_content.append("- **Operational Costs** (10%)")
    md_content.append("")
    md_content.append("### Why Now?")
    md_content.append("")
    
    why_now = [
        "**AI video generation just became accessible**: Gemini 2.0 enables real-time personalized content",
        "**Dopamine-driven design is proven**: TikTok/Instagram have validated the infinite scroll model",
        "**Gen Z expects passive consumption**: Active study feels outdated to digital natives",
        "**Statistics tracking is now standard**: Users expect personalized experiences based on their data",
        "**Market timing is perfect**: Language learning growing 18.7% annually, ripe for disruption"
    ]
    
    for reason in why_now:
        md_content.append(f"- {reason}")
    
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    
    # Contact
    md_content.append("## 📧 Contact Us")
    md_content.append("")
    md_content.append("**Ready to revolutionize learning through dopamine?**")
    md_content.append("")
    md_content.append("Let's discuss how passive learning can replace active study, and how statistics-driven personalization can maximize engagement.")
    md_content.append("")
    md_content.append("- **Email**: hello@passivelearning.ai")
    md_content.append("- **Website**: www.passivelearning.ai")
    md_content.append("")
    md_content.append("---")
    md_content.append("")
    md_content.append(f"*Generated automatically from project documentation on {datetime.now().strftime('%B %d, %Y')}*")
    
    # Write to file
    with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md_content))
    
    print(f"✅ Markdown generated successfully: {OUTPUT_MD}")
    print(f"📄 File size: {OUTPUT_MD.stat().st_size / 1024:.1f} KB")
    print(f"📝 Content sourced from: README.md, docs/ROADMAP.md")
    print(f"📸 Includes {len(screenshots)} screenshot references")

if __name__ == "__main__":
    generate_markdown()
