import json
import logging
from typing import Optional
from enum import Enum

from openai import OpenAI
from pydantic import BaseModel

log = logging.getLogger(__name__)


class ValidationStatus(str, Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class NodeInfo(BaseModel):
    id: str
    label: str
    type: str


class ConnectionInfo(BaseModel):
    from_id: str
    to_id: str


class ValidationResult(BaseModel):
    status: ValidationStatus
    sentence: str
    grammar_correct: bool
    semantic_correct: bool
    explanation: str
    suggestion: Optional[str] = None


class SentenceValidatorService:
    """
    Service for validating user-constructed sentences using OpenAI LLM.
    Checks both grammatical correctness and semantic plausibility.
    """
    
    VALIDATION_PROMPT = """Sei un esperto di grammatica tedesca. Analizza la seguente frase costruita dall'utente collegando dei nodi.

Frase costruita: "{sentence}"
Nodi utilizzati: {nodes_info}

Valuta la frase secondo questi criteri:

1. GRAMMATICA: La struttura della frase è corretta?
   - Ordine delle parole (SOV/SVO)
   - Casi grammaticali (Nominativo, Accusativo, Dativo, Genitivo)
   - Concordanza soggetto-verbo
   - Declinazioni corrette

2. SEMANTICA: La frase ha senso nel mondo reale?
   - È una situazione plausibile?
   - Le azioni sono logiche per il soggetto?

Rispondi SOLO con un JSON valido (senza markdown, senza ```):
{{
  "grammar_correct": true/false,
  "semantic_correct": true/false,
  "explanation": "spiegazione in italiano del perché la frase è corretta/sbagliata",
  "suggestion": "suggerimento per migliorare (solo se grammar_correct o semantic_correct è false, altrimenti null)"
}}

Esempi di valutazione:
- "Der Hund frisst das Futter" → grammar: true, semantic: true (il cane mangia il cibo - normale)
- "Der Hund frisst die Kartoffeln" → grammar: true, semantic: false (grammatica ok, ma i cani non mangiano patate normalmente)
- "Der Hund Kartoffeln frisst" → grammar: false, semantic: false (ordine parole sbagliato in tedesco)
- "Die Katze liest das Buch" → grammar: true, semantic: false (i gatti non leggono)"""

    def __init__(self):
        self.client = OpenAI()
        self.model = "gpt-4o-mini"
    
    def _build_sentence_from_nodes(self, nodes: list[NodeInfo], connections: list[ConnectionInfo]) -> str:
        """
        Build a sentence string from connected nodes.
        Follows the connection order to determine word order.
        """
        if not nodes:
            return ""
        
        if not connections:
            return " ".join([node.label for node in nodes])
        
        node_map = {node.id: node for node in nodes}
        
        from_ids = {conn.from_id for conn in connections}
        to_ids = {conn.to_id for conn in connections}
        start_ids = from_ids - to_ids
        
        if not start_ids:
            start_ids = {connections[0].from_id}
        
        ordered_labels = []
        visited = set()
        
        def traverse(node_id: str):
            if node_id in visited or node_id not in node_map:
                return
            visited.add(node_id)
            ordered_labels.append(node_map[node_id].label)
            
            for conn in connections:
                if conn.from_id == node_id:
                    traverse(conn.to_id)
        
        for start_id in start_ids:
            traverse(start_id)
        
        for node in nodes:
            if node.id not in visited:
                ordered_labels.append(node.label)
        
        return " ".join(ordered_labels)
    
    def _get_nodes_info_string(self, nodes: list[NodeInfo]) -> str:
        """Format nodes info for the prompt"""
        return ", ".join([f"{node.label} ({node.type})" for node in nodes])
    
    def validate_sentence(
        self,
        nodes: list[NodeInfo],
        connections: list[ConnectionInfo],
        language: str = "de"
    ) -> ValidationResult:
        """
        Validate a sentence constructed from connected nodes.
        Returns validation result with status (green/yellow/red).
        """
        sentence = self._build_sentence_from_nodes(nodes, connections)
        nodes_info = self._get_nodes_info_string(nodes)
        
        log.info(f"Validating sentence: '{sentence}'")
        
        prompt = self.VALIDATION_PROMPT.format(
            sentence=sentence,
            nodes_info=nodes_info
        )
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Sei un assistente che risponde SOLO in formato JSON valido."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            response_text = response.choices[0].message.content.strip()
            
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()
            
            result_data = json.loads(response_text)
            
            grammar_correct = result_data.get("grammar_correct", False)
            semantic_correct = result_data.get("semantic_correct", False)
            
            if grammar_correct and semantic_correct:
                status = ValidationStatus.GREEN
            elif grammar_correct and not semantic_correct:
                status = ValidationStatus.YELLOW
            else:
                status = ValidationStatus.RED
            
            return ValidationResult(
                status=status,
                sentence=sentence,
                grammar_correct=grammar_correct,
                semantic_correct=semantic_correct,
                explanation=result_data.get("explanation", ""),
                suggestion=result_data.get("suggestion")
            )
            
        except json.JSONDecodeError as json_error:
            log.error(f"Failed to parse LLM response as JSON: {json_error}")
            return ValidationResult(
                status=ValidationStatus.RED,
                sentence=sentence,
                grammar_correct=False,
                semantic_correct=False,
                explanation="Errore nella validazione. Riprova.",
                suggestion=None
            )
        except Exception as error:
            log.error(f"Error validating sentence: {error}")
            return ValidationResult(
                status=ValidationStatus.RED,
                sentence=sentence,
                grammar_correct=False,
                semantic_correct=False,
                explanation=f"Errore durante la validazione: {str(error)}",
                suggestion=None
            )


sentence_validator_service = SentenceValidatorService()
