"""
Embedded Backend for Mobile (Chaquopy)

This is a lightweight version of the backend that can run embedded
in Android/iOS apps via Chaquopy or similar Python embedding solutions.

Features included (no external APIs):
- Flashcards CRUD
- User progress tracking
- Words library
- Grammar sentences (static data)

Features excluded (require external APIs):
- YouTube video search
- AI video generation (Sora)
- Text-to-speech (OpenAI)
- Grammar validation (LLM)
"""

import json
import sqlite3
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict

DATABASE_PATH = "tinder_languages.db"


@dataclass
class Flashcard:
    id: int
    word: str
    translation: str
    image_url: str
    language: str
    difficulty: Optional[str] = None
    category: Optional[str] = None


@dataclass
class UserProgress:
    card_id: str
    known: bool
    review_count: int
    swipe_right_count: int
    swipe_left_count: int
    last_reviewed: str


@dataclass
class GrammarNode:
    id: str
    label: str
    node_type: str
    image_url: Optional[str] = None
    case: Optional[str] = None
    gender: Optional[str] = None
    tense: Optional[str] = None


@dataclass
class GrammarSentence:
    id: str
    german: str
    english: str
    difficulty: str
    nodes: List[Dict]
    edges: List[Dict]


class EmbeddedBackend:
    """Lightweight backend for embedded mobile use"""
    
    def __init__(self, db_path: str = DATABASE_PATH):
        self.db_path = db_path
        self._init_database()
        self._seed_data_if_empty()
    
    def _init_database(self):
        """Initialize SQLite database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS flashcards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL,
                translation TEXT NOT NULL,
                image_url TEXT,
                language TEXT DEFAULT 'de',
                difficulty TEXT,
                category TEXT,
                created_at TEXT,
                updated_at TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                card_id TEXT UNIQUE NOT NULL,
                known INTEGER DEFAULT 0,
                review_count INTEGER DEFAULT 0,
                swipe_right_count INTEGER DEFAULT 0,
                swipe_left_count INTEGER DEFAULT 0,
                last_reviewed TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def _seed_data_if_empty(self):
        """Seed initial flashcard data if database is empty"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM flashcards")
        count = cursor.fetchone()[0]
        
        if count == 0:
            seed_data = self._get_seed_flashcards()
            for card in seed_data:
                cursor.execute('''
                    INSERT INTO flashcards (word, translation, image_url, language, difficulty, category, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (card['word'], card['translation'], card['image_url'], card['language'], 
                      card['difficulty'], card['category'], datetime.now().isoformat(), datetime.now().isoformat()))
            conn.commit()
        
        conn.close()
    
    def _get_seed_flashcards(self) -> List[Dict]:
        """Return seed flashcard data"""
        return [
            {"word": "Hund", "translation": "dog", "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=800", "language": "de", "difficulty": "easy", "category": "animals"},
            {"word": "Katze", "translation": "cat", "image_url": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800", "language": "de", "difficulty": "easy", "category": "animals"},
            {"word": "Vogel", "translation": "bird", "image_url": "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=800", "language": "de", "difficulty": "easy", "category": "animals"},
            {"word": "Fisch", "translation": "fish", "image_url": "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?w=800", "language": "de", "difficulty": "easy", "category": "animals"},
            {"word": "Pferd", "translation": "horse", "image_url": "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=800", "language": "de", "difficulty": "easy", "category": "animals"},
            {"word": "Apfel", "translation": "apple", "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=800", "language": "de", "difficulty": "easy", "category": "food"},
            {"word": "Brot", "translation": "bread", "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800", "language": "de", "difficulty": "easy", "category": "food"},
            {"word": "Wasser", "translation": "water", "image_url": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800", "language": "de", "difficulty": "easy", "category": "food"},
            {"word": "Milch", "translation": "milk", "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800", "language": "de", "difficulty": "easy", "category": "food"},
            {"word": "Käse", "translation": "cheese", "image_url": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=800", "language": "de", "difficulty": "easy", "category": "food"},
            {"word": "Rot", "translation": "red", "image_url": "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800", "language": "de", "difficulty": "easy", "category": "colors"},
            {"word": "Blau", "translation": "blue", "image_url": "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800", "language": "de", "difficulty": "easy", "category": "colors"},
            {"word": "Grün", "translation": "green", "image_url": "https://images.unsplash.com/photo-1564419320461-6870880221ad?w=800", "language": "de", "difficulty": "easy", "category": "colors"},
            {"word": "Laufen", "translation": "run", "image_url": "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800", "language": "de", "difficulty": "easy", "category": "actions"},
            {"word": "Essen", "translation": "eat", "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800", "language": "de", "difficulty": "easy", "category": "actions"},
            {"word": "Trinken", "translation": "drink", "image_url": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800", "language": "de", "difficulty": "easy", "category": "actions"},
        ]
    
    def get_flashcards(self, language: Optional[str] = None, category: Optional[str] = None, limit: Optional[int] = None) -> List[Dict]:
        """Get flashcards with optional filters"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = "SELECT * FROM flashcards WHERE 1=1"
        params = []
        
        if language:
            query += " AND language = ?"
            params.append(language)
        
        if category:
            query += " AND category = ?"
            params.append(category)
        
        if limit:
            query += " LIMIT ?"
            params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def record_progress(self, card_id: str, known: bool) -> Dict:
        """Record user's swipe action"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM user_progress WHERE card_id = ?", (card_id,))
        existing = cursor.fetchone()
        
        now = datetime.now().isoformat()
        
        if existing:
            cursor.execute('''
                UPDATE user_progress 
                SET known = ?, review_count = review_count + 1,
                    swipe_right_count = swipe_right_count + ?,
                    swipe_left_count = swipe_left_count + ?,
                    last_reviewed = ?
                WHERE card_id = ?
            ''', (1 if known else 0, 1 if known else 0, 0 if known else 1, now, card_id))
        else:
            cursor.execute('''
                INSERT INTO user_progress (card_id, known, review_count, swipe_right_count, swipe_left_count, last_reviewed)
                VALUES (?, ?, 1, ?, ?, ?)
            ''', (card_id, 1 if known else 0, 1 if known else 0, 0 if known else 1, now))
        
        conn.commit()
        
        cursor.execute("SELECT COUNT(*) FROM user_progress")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM user_progress WHERE known = 1")
        known_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM user_progress WHERE known = 0")
        unknown_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "cards_reviewed": total,
            "known_count": known_count,
            "unknown_count": unknown_count
        }
    
    def get_progress(self) -> Dict:
        """Get current progress statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM user_progress")
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM user_progress WHERE known = 1")
        known_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM user_progress WHERE known = 0")
        unknown_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "cards_reviewed": total,
            "known_count": known_count,
            "unknown_count": unknown_count
        }
    
    def reset_progress(self) -> Dict:
        """Reset all progress"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_progress")
        conn.commit()
        conn.close()
        return {"message": "Progress reset successfully"}
    
    def get_words_library(self, language: str = "de", status: Optional[str] = None, 
                          category: Optional[str] = None, search: Optional[str] = None) -> List[Dict]:
        """Get all words with their learning progress"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = '''
            SELECT f.*, p.known, p.review_count, p.swipe_right_count, p.swipe_left_count, p.last_reviewed
            FROM flashcards f
            LEFT JOIN user_progress p ON CAST(f.id AS TEXT) = p.card_id
            WHERE f.language = ?
        '''
        params = [language]
        
        if category:
            query += " AND f.category = ?"
            params.append(category)
        
        if search:
            query += " AND (LOWER(f.word) LIKE ? OR LOWER(f.translation) LIKE ?)"
            search_pattern = f"%{search.lower()}%"
            params.extend([search_pattern, search_pattern])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        result = []
        for row in rows:
            row_dict = dict(row)
            if status == "known" and not row_dict.get('known'):
                continue
            elif status == "unknown" and row_dict.get('known') != 0:
                continue
            result.append(row_dict)
        
        return result
    
    def get_grammar_sentences(self) -> List[Dict]:
        """Get static grammar sentences"""
        return [
            {
                "id": "1",
                "german": "Der Hund beißt den Mann",
                "english": "The dog bites the man",
                "difficulty": "beginner",
                "nodes": [
                    {"id": "n1", "label": "Der Hund", "type": "subject", "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200"},
                    {"id": "n2", "label": "beißt", "type": "predicate", "image_url": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200"},
                    {"id": "n3", "label": "den Mann", "type": "object", "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200"}
                ],
                "edges": [
                    {"source": "n1", "target": "n2", "label": "wer?"},
                    {"source": "n2", "target": "n3", "label": "wen?"}
                ]
            },
            {
                "id": "2",
                "german": "Die Frau liest das Buch",
                "english": "The woman reads the book",
                "difficulty": "beginner",
                "nodes": [
                    {"id": "n1", "label": "Die Frau", "type": "subject", "image_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200"},
                    {"id": "n2", "label": "liest", "type": "predicate", "image_url": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200"},
                    {"id": "n3", "label": "das Buch", "type": "object", "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200"}
                ],
                "edges": [
                    {"source": "n1", "target": "n2", "label": "wer?"},
                    {"source": "n2", "target": "n3", "label": "was?"}
                ]
            }
        ]
    
    def get_available_nodes(self) -> List[Dict]:
        """Get available grammar nodes for sentence building"""
        return [
            {"id": "subj_1", "label": "Der Hund", "type": "subject", "image_url": "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200"},
            {"id": "subj_2", "label": "Die Katze", "type": "subject", "image_url": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200"},
            {"id": "subj_3", "label": "Das Kind", "type": "subject", "image_url": "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=200"},
            {"id": "verb_1", "label": "frisst", "type": "predicate", "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200"},
            {"id": "verb_2", "label": "liest", "type": "predicate", "image_url": "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200"},
            {"id": "verb_3", "label": "trinkt", "type": "predicate", "image_url": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200"},
            {"id": "obj_1", "label": "das Buch", "type": "object", "image_url": "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200"},
            {"id": "obj_2", "label": "den Ball", "type": "object", "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200"},
            {"id": "obj_3", "label": "die Milch", "type": "object", "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200"},
        ]


def handle_request(method: str, path: str, body: Optional[str] = None) -> str:
    """
    Main entry point for handling HTTP-like requests from the app.
    This function is called from Java/Kotlin via Chaquopy.
    
    Args:
        method: HTTP method (GET, POST)
        path: API path (e.g., /api/cards)
        body: JSON body for POST requests
    
    Returns:
        JSON string response
    """
    backend = EmbeddedBackend()
    
    try:
        if path == "/api/cards" and method == "GET":
            cards = backend.get_flashcards(language="de")
            return json.dumps(cards)
        
        elif path == "/api/progress" and method == "GET":
            progress = backend.get_progress()
            return json.dumps(progress)
        
        elif path == "/api/progress" and method == "POST":
            data = json.loads(body) if body else {}
            result = backend.record_progress(str(data.get("card_id")), data.get("known", False))
            return json.dumps(result)
        
        elif path == "/api/progress/reset" and method == "POST":
            result = backend.reset_progress()
            return json.dumps(result)
        
        elif path == "/api/words/library" and method == "GET":
            library = backend.get_words_library()
            return json.dumps(library)
        
        elif path == "/api/grammar/sentences" and method == "GET":
            sentences = backend.get_grammar_sentences()
            return json.dumps(sentences)
        
        elif path == "/api/grammar/available-nodes" and method == "GET":
            nodes = backend.get_available_nodes()
            return json.dumps(nodes)
        
        else:
            return json.dumps({"error": f"Unknown endpoint: {method} {path}", "offline_mode": True})
    
    except Exception as exception:
        return json.dumps({"error": str(exception)})


if __name__ == "__main__":
    backend = EmbeddedBackend()
    print("Testing embedded backend...")
    print(f"Flashcards: {len(backend.get_flashcards())}")
    print(f"Progress: {backend.get_progress()}")
    print(f"Grammar sentences: {len(backend.get_grammar_sentences())}")
    print("✅ Embedded backend working!")
