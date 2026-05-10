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
from urllib.parse import parse_qs, urlparse

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
    user_id: str
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
        self._check_database_status()
    
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
                user_id TEXT NOT NULL DEFAULT 'default_user',
                card_id TEXT NOT NULL,
                known INTEGER DEFAULT 0,
                review_count INTEGER DEFAULT 0,
                swipe_right_count INTEGER DEFAULT 0,
                swipe_left_count INTEGER DEFAULT 0,
                last_reviewed TEXT,
                UNIQUE(user_id, card_id)
            )
        ''')
        self._ensure_user_progress_user_id(cursor)
        
        conn.commit()
        conn.close()

    def _ensure_user_progress_user_id(self, cursor):
        """Add user_id to older embedded databases created before per-user progress."""
        cursor.execute("PRAGMA table_info(user_progress)")
        columns = {row[1] for row in cursor.fetchall()}
        if "user_id" not in columns:
            cursor.execute("ALTER TABLE user_progress ADD COLUMN user_id TEXT NOT NULL DEFAULT 'default_user'")
    
    def _check_database_status(self):
        """Check if database has data. Data must be pre-populated externally."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM flashcards")
        count = cursor.fetchone()[0]
        conn.close()
        
        if count == 0:
            print("WARNING: Database is empty. Flashcards must be pre-populated from language_info_extraction project.")
        else:
            print(f"Database contains {count} flashcards.")
    
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

    def get_adaptive_flashcards(self, language: Optional[str] = "de", category: Optional[str] = None, limit: Optional[int] = None) -> List[Dict]:
        """Return flashcards with the adaptive metadata required by the active UI."""
        cards = self.get_flashcards(language=language, category=category, limit=limit)
        return [self._with_adaptive_metadata(card) for card in cards]

    def _with_adaptive_metadata(self, card: Dict) -> Dict:
        enriched = dict(card)
        enriched.update({
            "confidence_score": 0,
            "knowledge_level": 1,
            "times_seen": 0,
            "times_correct": 0,
            "times_incorrect": 0,
            "last_practiced": None,
            "selection_reason": "new",
        })
        return enriched
    
    def record_progress(self, card_id: str, known: bool, user_id: str = "default_user") -> Dict:
        """Record user's swipe action"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT * FROM user_progress WHERE user_id = ? AND card_id = ?",
            (user_id, card_id),
        )
        existing = cursor.fetchone()
        
        now = datetime.now().isoformat()
        
        if existing:
            cursor.execute('''
                UPDATE user_progress 
                SET known = ?, review_count = review_count + 1,
                    swipe_right_count = swipe_right_count + ?,
                    swipe_left_count = swipe_left_count + ?,
                    last_reviewed = ?
                WHERE user_id = ? AND card_id = ?
            ''', (1 if known else 0, 1 if known else 0, 0 if known else 1, now, user_id, card_id))
        else:
            cursor.execute('''
                INSERT INTO user_progress (user_id, card_id, known, review_count, swipe_right_count, swipe_left_count, last_reviewed)
                VALUES (?, ?, ?, 1, ?, ?, ?)
            ''', (user_id, card_id, 1 if known else 0, 1 if known else 0, 0 if known else 1, now))
        
        conn.commit()
        
        conn.close()
        
        return self.get_progress(user_id)
    
    def get_progress(self, user_id: str = "default_user") -> Dict:
        """Get current progress statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM user_progress WHERE user_id = ?", (user_id,))
        total = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM user_progress WHERE user_id = ? AND known = 1", (user_id,))
        known_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM user_progress WHERE user_id = ? AND known = 0", (user_id,))
        unknown_count = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "cards_reviewed": total,
            "known_count": known_count,
            "unknown_count": unknown_count
        }
    
    def reset_progress(self, user_id: str = "default_user") -> Dict:
        """Reset all progress"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM user_progress WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
        return {"message": "Progress reset successfully"}
    
    def get_words_library(self, language: str = "de", status: Optional[str] = None,
                          category: Optional[str] = None, search: Optional[str] = None,
                          user_id: str = "default_user", limit: Optional[int] = None) -> List[Dict]:
        """Get all words with their learning progress"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = '''
            SELECT f.*, p.known, p.review_count, p.swipe_right_count, p.swipe_left_count, p.last_reviewed
            FROM flashcards f
            LEFT JOIN user_progress p ON CAST(f.id AS TEXT) = p.card_id AND p.user_id = ?
            WHERE f.language = ?
        '''
        params = [user_id, language]
        
        if category:
            query += " AND f.category = ?"
            params.append(category)
        
        if search:
            query += " AND (LOWER(f.word) LIKE ? OR LOWER(f.translation) LIKE ?)"
            search_pattern = f"%{search.lower()}%"
            params.extend([search_pattern, search_pattern])

        if limit:
            query += " LIMIT ?"
            params.append(limit)
        
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

    def get_library_filters(self, language: str = "de") -> Dict:
        cards = self.get_flashcards(language=language)
        return {
            "cefr_levels": [],
            "frequency_bands": [],
            "registers": [],
            "genders": [],
            "parts_of_speech": [],
            "word_formations": [],
            "categories": sorted({card.get("category") for card in cards if card.get("category")}),
            "thematic_domains": [],
        }

    def get_library_stats(self, language: str = "de") -> Dict:
        cards = self.get_flashcards(language=language)
        by_part_of_speech = {}
        for card in cards:
            part_of_speech = card.get("part_of_speech")
            if part_of_speech:
                by_part_of_speech[part_of_speech] = by_part_of_speech.get(part_of_speech, 0) + 1
        return {
            "total_words": len(cards),
            "words_with_etymology": 0,
            "words_with_examples": 0,
            "words_with_false_friends": 0,
            "words_with_proverbs": 0,
            "by_cefr_level": {},
            "by_gender": {},
            "by_part_of_speech": by_part_of_speech,
        }

    def get_word_detail(self, word_id: int) -> Dict:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM flashcards WHERE id = ?", (word_id,))
        row = cursor.fetchone()
        conn.close()
        if not row:
            return {"error": "Word not found"}
        card = dict(row)
        card.update({
            "etymologies": [],
            "examples": [],
            "false_friends": [],
            "proverbs": [],
            "collocations": [],
            "dialect_variants": [],
        })
        return card

    def get_adaptive_summary(self) -> Dict:
        return {
            "average_confidence": 0.0,
            "average_knowledge_level": 1.0,
            "total_words_practiced": 0,
            "total_practice_sessions": 0,
            "words_struggling": 0,
            "words_learning": 0,
            "words_mastered": 0,
            "path_xp": 0,
            "path_level": 1,
            "max_path_level": 400,
            "xp_to_next_level": 100,
            "path_level_progress": 0.0,
            "trend": "new",
            "level_delta": 0.0,
            "last_practiced": None,
            "days_since_last_practice": None,
            "should_reengage": False,
        }

    def get_all_statistics(self) -> List[Dict]:
        return []

    def update_word_statistics(self, word: str, correct: bool) -> Dict:
        confidence = 12 if correct else 0
        return {
            "word": word,
            "new_confidence_score": confidence,
            "knowledge_level": 2 if confidence >= 10 else 1,
            "times_seen": 1,
            "times_correct": 1 if correct else 0,
            "times_incorrect": 0 if correct else 1,
        }
    
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

    def get_sentence_challenges(self) -> List[Dict]:
        return [
            {
                "id": 1,
                "language": "de",
                "prompt_language": "en",
                "target_language": "de",
                "prompt": "The woman reads the book",
                "correct_sentence": "Die Frau liest das Buch",
                "correct_tokens": ["Die", "Frau", "liest", "das", "Buch"],
                "distractor_tokens": ["den", "Hund"],
                "option_tokens": ["Die", "Frau", "liest", "das", "Buch", "den", "Hund"],
                "difficulty": "beginner",
                "grammar_focus": "word_order",
                "cefr_level": "A1",
                "validation_mode": "ground_truth",
            }
        ]


def _first_query_value(params: Dict[str, List[str]], key: str, default: Optional[str] = None) -> Optional[str]:
    values = params.get(key)
    return values[0] if values else default


def _int_query_value(params: Dict[str, List[str]], key: str, default: Optional[int] = None) -> Optional[int]:
    value = _first_query_value(params, key)
    return int(value) if value else default


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
    parsed_path = urlparse(path)
    route_path = parsed_path.path
    query_params = parse_qs(parsed_path.query)
    user_id = _first_query_value(query_params, "user_id", "default_user") or "default_user"
    
    try:
        if route_path == "/api/cards" and method == "GET":
            cards = backend.get_flashcards(
                language=_first_query_value(query_params, "language", "de"),
                category=_first_query_value(query_params, "category"),
                limit=_int_query_value(query_params, "limit"),
            )
            return json.dumps(cards)

        elif route_path == "/api/cards/adaptive" and method == "GET":
            cards = backend.get_adaptive_flashcards(
                language=_first_query_value(query_params, "language", "de"),
                category=_first_query_value(query_params, "category"),
                limit=_int_query_value(query_params, "limit"),
            )
            return json.dumps(cards)

        elif route_path == "/api/cards/adaptive/query" and method == "POST":
            data = json.loads(body) if body else {}
            selected_categories = data.get("selected_categories") or []
            cards = backend.get_adaptive_flashcards(
                language=data.get("language", "de"),
                category=selected_categories[0] if selected_categories else None,
                limit=data.get("limit", 50),
            )
            return json.dumps(cards)
        
        elif route_path == "/api/progress" and method == "GET":
            progress = backend.get_progress(user_id=user_id)
            return json.dumps(progress)
        
        elif route_path == "/api/progress" and method == "POST":
            data = json.loads(body) if body else {}
            result = backend.record_progress(
                str(data.get("card_id")),
                data.get("known", False),
                user_id=data.get("user_id", user_id),
            )
            return json.dumps(result)
        
        elif route_path == "/api/progress/reset" and method == "POST":
            result = backend.reset_progress(user_id=user_id)
            return json.dumps(result)
        
        elif route_path in {"/api/words/library", "/api/library/words"} and method == "GET":
            library = backend.get_words_library(
                language=_first_query_value(query_params, "language", "de") or "de",
                status=_first_query_value(query_params, "status"),
                category=_first_query_value(query_params, "category"),
                search=_first_query_value(query_params, "search"),
                user_id=user_id,
                limit=_int_query_value(query_params, "limit"),
            )
            return json.dumps(library)

        elif route_path.startswith("/api/library/words/") and method == "GET":
            word_id = int(route_path[len("/api/library/words/"):].split("/", 1)[0])
            return json.dumps(backend.get_word_detail(word_id))

        elif route_path == "/api/library/filters" and method == "GET":
            return json.dumps(backend.get_library_filters(_first_query_value(query_params, "language", "de") or "de"))

        elif route_path == "/api/library/stats" and method == "GET":
            return json.dumps(backend.get_library_stats(_first_query_value(query_params, "language", "de") or "de"))

        elif route_path == "/api/library/dialects" and method == "GET":
            return json.dumps([])

        elif route_path == "/api/statistics/adaptive-summary" and method == "GET":
            return json.dumps(backend.get_adaptive_summary())

        elif route_path == "/api/statistics/all" and method == "GET":
            return json.dumps(backend.get_all_statistics())

        elif route_path == "/api/statistics/update" and method == "POST":
            data = json.loads(body) if body else {}
            return json.dumps(backend.update_word_statistics(data.get("word", ""), data.get("correct", False)))
        
        elif route_path == "/api/grammar/sentences" and method == "GET":
            sentences = backend.get_grammar_sentences()
            return json.dumps(sentences)
        
        elif route_path == "/api/grammar/available-nodes" and method == "GET":
            nodes = backend.get_available_nodes()
            return json.dumps(nodes)

        elif route_path == "/api/grammar/sentence-challenges" and method == "GET":
            return json.dumps(backend.get_sentence_challenges())
        
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
