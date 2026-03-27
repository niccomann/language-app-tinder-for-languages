#!/usr/bin/env python3
"""
Seed mock data for testing the gamified frontend
"""
import os
import sys
import base64
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlmodel import Session, select
from app.database.connection import DatabaseConnection
from app.database.models import FlashcardEntity

def create_sample_image():
    """Create a simple colored placeholder image"""
    # Simple 1x1 transparent PNG base64
    return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def seed_mock_data():
    print("🌱 Seeding mock data...")
    
    db = DatabaseConnection()
    
    # Sample German words with categories
    mock_words = [
        # Animals
        {"word": "Hund", "translation": "Dog", "category": "animals", "difficulty": "easy"},
        {"word": "Katze", "translation": "Cat", "category": "animals", "difficulty": "easy"},
        {"word": "Vogel", "translation": "Bird", "category": "animals", "difficulty": "easy"},
        {"word": "Fisch", "translation": "Fish", "category": "animals", "difficulty": "easy"},
        {"word": "Pferd", "translation": "Horse", "category": "animals", "difficulty": "medium"},
        
        # Food
        {"word": "Apfel", "translation": "Apple", "category": "food", "difficulty": "easy"},
        {"word": "Brot", "translation": "Bread", "category": "food", "difficulty": "easy"},
        {"word": "Wasser", "translation": "Water", "category": "food", "difficulty": "easy"},
        {"word": "Milch", "translation": "Milk", "category": "food", "difficulty": "easy"},
        {"word": "Käse", "translation": "Cheese", "category": "food", "difficulty": "medium"},
        
        # Objects
        {"word": "Tisch", "translation": "Table", "category": "objects", "difficulty": "easy"},
        {"word": "Stuhl", "translation": "Chair", "category": "objects", "difficulty": "easy"},
        {"word": "Buch", "translation": "Book", "category": "objects", "difficulty": "easy"},
        {"word": "Auto", "translation": "Car", "category": "objects", "difficulty": "easy"},
        {"word": "Haus", "translation": "House", "category": "objects", "difficulty": "medium"},
        
        # Colors
        {"word": "Rot", "translation": "Red", "category": "colors", "difficulty": "easy"},
        {"word": "Blau", "translation": "Blue", "category": "colors", "difficulty": "easy"},
        {"word": "Grün", "translation": "Green", "category": "colors", "difficulty": "easy"},
        {"word": "Gelb", "translation": "Yellow", "category": "colors", "difficulty": "easy"},
        {"word": "Schwarz", "translation": "Black", "category": "colors", "difficulty": "medium"},
        
        # Nature
        {"word": "Baum", "translation": "Tree", "category": "nature", "difficulty": "easy"},
        {"word": "Blume", "translation": "Flower", "category": "nature", "difficulty": "easy"},
        {"word": "Sonne", "translation": "Sun", "category": "nature", "difficulty": "easy"},
        {"word": "Mond", "translation": "Moon", "category": "nature", "difficulty": "easy"},
        {"word": "Wald", "translation": "Forest", "category": "nature", "difficulty": "medium"},
        
        # Verbs
        {"word": "gehen", "translation": "to go", "category": "verbs", "difficulty": "easy"},
        {"word": "essen", "translation": "to eat", "category": "verbs", "difficulty": "easy"},
        {"word": "trinken", "translation": "to drink", "category": "verbs", "difficulty": "easy"},
        {"word": "schlafen", "translation": "to sleep", "category": "verbs", "difficulty": "medium"},
        {"word": "lernen", "translation": "to learn", "category": "verbs", "difficulty": "easy"},
        
        # Family
        {"word": "Mutter", "translation": "Mother", "category": "family", "difficulty": "easy"},
        {"word": "Vater", "translation": "Father", "category": "family", "difficulty": "easy"},
        {"word": "Schwester", "translation": "Sister", "category": "family", "difficulty": "medium"},
        {"word": "Bruder", "translation": "Brother", "category": "family", "difficulty": "medium"},
        {"word": "Kind", "translation": "Child", "category": "family", "difficulty": "easy"},
    ]
    
    with db.session as session:
        # Check existing data
        existing_count = len(session.exec(select(FlashcardEntity)).all())
        if existing_count > 0:
            print(f"✅ Database already has {existing_count} flashcards")
            return
        
        # Create flashcards
        sample_image = create_sample_image()
        for word_data in mock_words:
            flashcard = FlashcardEntity(
                word=word_data["word"],
                translation=word_data["translation"],
                category=word_data["category"],
                language="de",
                difficulty=word_data["difficulty"],
                image_base64=sample_image,
            )
            session.add(flashcard)
        
        session.commit()
        print(f"✅ Added {len(mock_words)} mock flashcards!")
        print(f"   Categories: {', '.join(categories)}")

if __name__ == "__main__":
    seed_mock_data()
