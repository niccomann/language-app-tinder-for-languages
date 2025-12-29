"""
Script to seed enriched linguistic data for testing the new Word Library features.
Run with: python seed_enriched_data.py
"""
import sqlite3
import json

DB_PATH = "app.db"

ENRICHED_WORDS = [
    {
        "word": "Hund",
        "cefr_level": "A1",
        "frequency_band": "very_common",
        "register": "neutral",
        "thematic_domain": "animals",
        "part_of_speech": "noun",
        "gender": "masculine",
        "plural_form": "Hunde",
        "is_compound": False,
        "word_formation": "simple",
    },
    {
        "word": "Katze",
        "cefr_level": "A1",
        "frequency_band": "very_common",
        "register": "neutral",
        "thematic_domain": "animals",
        "part_of_speech": "noun",
        "gender": "feminine",
        "plural_form": "Katzen",
        "is_compound": False,
        "word_formation": "simple",
    },
    {
        "word": "Apfel",
        "cefr_level": "A1",
        "frequency_band": "very_common",
        "register": "neutral",
        "thematic_domain": "food",
        "part_of_speech": "noun",
        "gender": "masculine",
        "plural_form": "Äpfel",
        "is_compound": False,
        "word_formation": "simple",
    },
    {
        "word": "Wasser",
        "cefr_level": "A1",
        "frequency_band": "very_common",
        "register": "neutral",
        "thematic_domain": "nature",
        "part_of_speech": "noun",
        "gender": "neuter",
        "plural_form": "Wasser",
        "is_compound": False,
        "word_formation": "simple",
    },
    {
        "word": "Weltanschauung",
        "cefr_level": "C1",
        "frequency_band": "moderate",
        "register": "formal",
        "thematic_domain": "abstract",
        "part_of_speech": "noun",
        "gender": "feminine",
        "plural_form": "Weltanschauungen",
        "is_compound": True,
        "word_formation": "compound",
    },
    {
        "word": "Schmetterling",
        "cefr_level": "A2",
        "frequency_band": "common",
        "register": "neutral",
        "thematic_domain": "animals",
        "part_of_speech": "noun",
        "gender": "masculine",
        "plural_form": "Schmetterlinge",
        "is_compound": False,
        "word_formation": "simple",
    },
    {
        "word": "Kindergarten",
        "cefr_level": "A2",
        "frequency_band": "common",
        "register": "neutral",
        "thematic_domain": "places",
        "part_of_speech": "noun",
        "gender": "masculine",
        "plural_form": "Kindergärten",
        "is_compound": True,
        "word_formation": "compound",
    },
    {
        "word": "Fahrrad",
        "cefr_level": "A1",
        "frequency_band": "very_common",
        "register": "neutral",
        "thematic_domain": "transportation",
        "part_of_speech": "noun",
        "gender": "neuter",
        "plural_form": "Fahrräder",
        "is_compound": True,
        "word_formation": "compound",
    },
]

ETYMOLOGIES = [
    {"word": "Hund", "origin_language": "Proto-Germanic", "origin_word": "*hundaz", "etymology_text": "From Proto-Germanic *hundaz, from Proto-Indo-European *ḱwn̥tós. Cognate with English 'hound'.", "language_family": "germanic", "time_period": "Ancient"},
    {"word": "Katze", "origin_language": "Latin", "origin_word": "cattus", "etymology_text": "Borrowed from Late Latin cattus in the early medieval period, replacing the native Germanic word.", "language_family": "romance", "time_period": "Medieval"},
    {"word": "Kindergarten", "origin_language": "German", "origin_word": "Kinder + Garten", "etymology_text": "Compound word coined by Friedrich Fröbel in 1840. Literally 'children's garden'. The word was later borrowed into English and many other languages.", "language_family": "germanic", "time_period": "19th Century"},
]

EXAMPLES = [
    {"word": "Hund", "sentence": "Der Hund bellt laut.", "translation": "The dog barks loudly.", "difficulty_level": "A1", "context_type": "everyday"},
    {"word": "Hund", "sentence": "Mein Hund ist sehr freundlich.", "translation": "My dog is very friendly.", "difficulty_level": "A1", "context_type": "everyday"},
    {"word": "Hund", "sentence": "Der Hund jagt die Katze durch den Garten.", "translation": "The dog chases the cat through the garden.", "difficulty_level": "A2", "context_type": "everyday"},
    {"word": "Katze", "sentence": "Die Katze schläft auf dem Sofa.", "translation": "The cat sleeps on the sofa.", "difficulty_level": "A1", "context_type": "everyday"},
    {"word": "Katze", "sentence": "Unsere Katze fängt gerne Mäuse.", "translation": "Our cat likes to catch mice.", "difficulty_level": "A2", "context_type": "everyday"},
    {"word": "Weltanschauung", "sentence": "Seine Weltanschauung wurde durch die Philosophie Kants geprägt.", "translation": "His worldview was shaped by Kant's philosophy.", "difficulty_level": "C1", "context_type": "academic"},
    {"word": "Kindergarten", "sentence": "Die Kinder spielen im Kindergarten.", "translation": "The children play in kindergarten.", "difficulty_level": "A1", "context_type": "everyday"},
]

FALSE_FRIENDS = [
    {"word": "Hund", "target_language": "en", "similar_word": "hundred", "similar_word_meaning": "the number 100", "confusion_level": "medium"},
    {"word": "Kindergarten", "target_language": "en", "similar_word": "kindergarten", "similar_word_meaning": "In English refers specifically to a school year, not just any children's daycare", "confusion_level": "low"},
]

PROVERBS = [
    {"word": "Hund", "expression": "Da liegt der Hund begraben.", "literal_meaning": "That's where the dog is buried.", "figurative_meaning": "That's the crux of the matter.", "expression_type": "idiom"},
    {"word": "Hund", "expression": "Bellende Hunde beißen nicht.", "literal_meaning": "Barking dogs don't bite.", "figurative_meaning": "People who make threats rarely act on them.", "expression_type": "proverb"},
    {"word": "Katze", "expression": "Die Katze aus dem Sack lassen.", "literal_meaning": "To let the cat out of the bag.", "figurative_meaning": "To reveal a secret.", "expression_type": "idiom"},
    {"word": "Katze", "expression": "Wenn die Katze aus dem Haus ist, tanzen die Mäuse.", "literal_meaning": "When the cat is out of the house, the mice dance.", "figurative_meaning": "When the authority figure is away, others will do as they please.", "expression_type": "proverb"},
]

COLLOCATIONS = [
    {"word": "Hund", "collocate_word": "Hundefutter", "collocation_type": "noun+noun", "example_phrase": "Ich kaufe Hundefutter im Supermarkt.", "frequency": "common"},
    {"word": "Hund", "collocate_word": "Gassi gehen", "collocation_type": "verb_phrase", "example_phrase": "Ich muss mit dem Hund Gassi gehen.", "frequency": "very_common"},
    {"word": "Katze", "collocate_word": "Katzenfutter", "collocation_type": "noun+noun", "example_phrase": "Die Katze liebt dieses Katzenfutter.", "frequency": "common"},
]

DIALECT_VARIANTS = [
    {"word": "Hund", "region": "Bavaria", "dialect_name": "Bavarian", "variant_word": "Hund", "pronunciation": "Softer 'd' at end", "usage_notes": "Pronounced with a softer final consonant"},
    {"word": "Katze", "region": "Austria", "dialect_name": "Austrian German", "variant_word": "Katz", "pronunciation": "Kots", "usage_notes": "Often shortened in casual speech"},
    {"word": "Apfel", "region": "Bavaria", "dialect_name": "Bavarian", "variant_word": "Apfe", "pronunciation": "Apfe", "usage_notes": "Final 'l' is often dropped"},
]


def update_flashcards(conn):
    """Update existing flashcards with enriched data."""
    cursor = conn.cursor()
    
    for word_data in ENRICHED_WORDS:
        word = word_data["word"]
        cursor.execute("""
            UPDATE flashcards SET
                cefr_level = ?,
                frequency_band = ?,
                register = ?,
                thematic_domain = ?,
                part_of_speech = ?,
                gender = ?,
                plural_form = ?,
                is_compound = ?,
                word_formation = ?
            WHERE word = ?
        """, (
            word_data["cefr_level"],
            word_data["frequency_band"],
            word_data["register"],
            word_data["thematic_domain"],
            word_data["part_of_speech"],
            word_data["gender"],
            word_data["plural_form"],
            word_data["is_compound"],
            word_data["word_formation"],
            word,
        ))
        if cursor.rowcount > 0:
            print(f"✓ Updated: {word}")
        else:
            print(f"✗ Not found: {word}")
    
    conn.commit()


def get_flashcard_id(conn, word):
    """Get flashcard ID by word."""
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM flashcards WHERE word = ?", (word,))
    row = cursor.fetchone()
    return row[0] if row else None


def insert_etymologies(conn):
    """Insert etymology data."""
    cursor = conn.cursor()
    
    for etym in ETYMOLOGIES:
        flashcard_id = get_flashcard_id(conn, etym["word"])
        if flashcard_id:
            cursor.execute("""
                INSERT INTO etymologies (flashcard_id, origin_language, origin_word, etymology_text, language_family, time_period, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (flashcard_id, etym["origin_language"], etym["origin_word"], etym["etymology_text"], etym["language_family"], etym["time_period"]))
            print(f"✓ Etymology added for: {etym['word']}")
    
    conn.commit()


def insert_examples(conn):
    """Insert example sentences."""
    cursor = conn.cursor()
    
    for ex in EXAMPLES:
        flashcard_id = get_flashcard_id(conn, ex["word"])
        if flashcard_id:
            cursor.execute("""
                INSERT INTO example_sentences (flashcard_id, sentence, translation, difficulty_level, context_type, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (flashcard_id, ex["sentence"], ex["translation"], ex["difficulty_level"], ex["context_type"]))
            print(f"✓ Example added for: {ex['word']}")
    
    conn.commit()


def insert_false_friends(conn):
    """Insert false friends."""
    cursor = conn.cursor()
    
    for ff in FALSE_FRIENDS:
        flashcard_id = get_flashcard_id(conn, ff["word"])
        if flashcard_id:
            cursor.execute("""
                INSERT INTO false_friends (flashcard_id, target_language, similar_word, similar_word_meaning, confusion_level, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (flashcard_id, ff["target_language"], ff["similar_word"], ff["similar_word_meaning"], ff["confusion_level"]))
            print(f"✓ False friend added for: {ff['word']}")
    
    conn.commit()


def insert_proverbs(conn):
    """Insert proverbs and idioms."""
    cursor = conn.cursor()
    
    for prov in PROVERBS:
        flashcard_id = get_flashcard_id(conn, prov["word"])
        if flashcard_id:
            cursor.execute("""
                INSERT INTO proverbs (flashcard_id, expression, literal_meaning, figurative_meaning, expression_type, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (flashcard_id, prov["expression"], prov["literal_meaning"], prov["figurative_meaning"], prov["expression_type"]))
            print(f"✓ Proverb added for: {prov['word']}")
    
    conn.commit()


def insert_collocations(conn):
    """Insert collocations."""
    cursor = conn.cursor()
    
    for coll in COLLOCATIONS:
        flashcard_id = get_flashcard_id(conn, coll["word"])
        if flashcard_id:
            cursor.execute("""
                INSERT INTO collocations (flashcard_id, collocate_word, collocation_type, example_phrase, frequency, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (flashcard_id, coll["collocate_word"], coll["collocation_type"], coll["example_phrase"], coll["frequency"]))
            print(f"✓ Collocation added for: {coll['word']}")
    
    conn.commit()


def insert_dialect_variants(conn):
    """Insert dialect variants."""
    cursor = conn.cursor()
    
    for dial in DIALECT_VARIANTS:
        flashcard_id = get_flashcard_id(conn, dial["word"])
        if flashcard_id:
            cursor.execute("""
                INSERT INTO dialect_variants (flashcard_id, region, dialect_name, variant_word, pronunciation, usage_notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            """, (flashcard_id, dial["region"], dial["dialect_name"], dial["variant_word"], dial["pronunciation"], dial["usage_notes"]))
            print(f"✓ Dialect variant added for: {dial['word']}")
    
    conn.commit()


def main():
    print("=" * 60)
    print("SEEDING ENRICHED LINGUISTIC DATA")
    print("=" * 60)
    
    conn = sqlite3.connect(DB_PATH)
    
    print("\n📝 Updating flashcards with enriched data...")
    update_flashcards(conn)
    
    print("\n📚 Inserting etymologies...")
    insert_etymologies(conn)
    
    print("\n💬 Inserting example sentences...")
    insert_examples(conn)
    
    print("\n⚠️ Inserting false friends...")
    insert_false_friends(conn)
    
    print("\n🗣️ Inserting proverbs and idioms...")
    insert_proverbs(conn)
    
    print("\n🔗 Inserting collocations...")
    insert_collocations(conn)
    
    print("\n🗺️ Inserting dialect variants...")
    insert_dialect_variants(conn)
    
    conn.close()
    
    print("\n" + "=" * 60)
    print("✅ SEED COMPLETED SUCCESSFULLY")
    print("=" * 60)


if __name__ == "__main__":
    main()
