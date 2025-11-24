# Sistema di Raccomandazione con Reti Neurali (PyTorch)

**Status**: 🎯 Feature Proposta - Neural Network Implementation  
**Priority**: Alta  
**Complessità**: Alta  
**Versione Target**: 2.0.0  
**Framework**: PyTorch 2.0+

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Modelli PyTorch](#modelli-pytorch)
4. [Training](#training)
5. [Deployment](#deployment)
6. [Roadmap](#roadmap)

---

## 🎯 Panoramica

### Approccio Neural Network

Sistema di raccomandazione con **Deep Learning** usando PyTorch:
- Apprende rappresentazioni latenti di utenti e video
- Cattura pattern complessi non lineari
- Si adatta automaticamente ai nuovi dati
- Scala efficacemente con grandi dataset

### Vantaggi

| Aspetto | Tradizionale | Neural Network |
|---------|-------------|----------------|
| **Pattern** | Lineare | Non-lineare |
| **Features** | Manuale | Automatica |
| **Scalabilità** | Limitata | Eccellente |
| **Accuratezza** | Buona | Superiore |

---

## 🏗️ Architettura

### Stack Tecnologico

```
PyTorch 2.0+
├── torch.nn - Neural network layers
├── torch.optim - Optimizers (Adam, SGD)
├── torch.utils.data - DataLoader
└── torchmetrics - Evaluation metrics

Supporto:
├── numpy - Numerical operations
├── pandas - Data processing
├── scikit-learn - Metrics & preprocessing
└── mlflow - Experiment tracking (optional)
```

### Architettura Generale

```
INPUT LAYER
├── User Features (ID, preferences, history)
├── Video Features (ID, metadata, quality)
└── Context Features (word, category, difficulty)
         ↓
EMBEDDING LAYERS
├── User Embedding (128-dim)
├── Video Embedding (128-dim)
└── Word Embedding (64-dim)
         ↓
DEEP NEURAL NETWORK
├── Dense Layer 1 (512 neurons) + ReLU + Dropout
├── Dense Layer 2 (256 neurons) + ReLU + Dropout
└── Dense Layer 3 (128 neurons) + ReLU
         ↓
OUTPUT LAYER
└── Prediction Score (0-1) - Sigmoid
```

---

## 🧠 Modelli PyTorch

### 1. Neural Collaborative Filtering (NCF)

**File**: `backend/app/ml/models/ncf_model.py`

```python
import torch
import torch.nn as nn

class NeuralCollaborativeFiltering(nn.Module):
    def __init__(
        self,
        num_users: int,
        num_videos: int,
        embedding_dim: int = 128,
        hidden_layers: list = [512, 256, 128],
        dropout_rate: float = 0.3
    ):
        super().__init__()
        
        # Embeddings
        self.user_embedding = nn.Embedding(num_users, embedding_dim)
        self.video_embedding = nn.Embedding(num_videos, embedding_dim)
        
        # MLP
        layers = []
        input_size = embedding_dim * 2
        for hidden_size in hidden_layers:
            layers.extend([
                nn.Linear(input_size, hidden_size),
                nn.ReLU(),
                nn.Dropout(dropout_rate)
            ])
            input_size = hidden_size
        
        self.mlp = nn.Sequential(*layers)
        self.output = nn.Linear(hidden_layers[-1], 1)
    
    def forward(self, user_ids, video_ids):
        user_embed = self.user_embedding(user_ids)
        video_embed = self.video_embedding(video_ids)
        x = torch.cat([user_embed, video_embed], dim=1)
        x = self.mlp(x)
        return torch.sigmoid(self.output(x))
```

### 2. Two-Tower Model

**File**: `backend/app/ml/models/two_tower_model.py`

```python
class TwoTowerModel(nn.Module):
    def __init__(
        self,
        user_feature_dim: int,
        video_feature_dim: int,
        embedding_dim: int = 128
    ):
        super().__init__()
        
        # User Tower
        self.user_tower = nn.Sequential(
            nn.Linear(user_feature_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, embedding_dim)
        )
        
        # Video Tower
        self.video_tower = nn.Sequential(
            nn.Linear(video_feature_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, embedding_dim)
        )
    
    def forward(self, user_features, video_features):
        user_emb = self.user_tower(user_features)
        video_emb = self.video_tower(video_features)
        
        # Normalize
        user_emb = F.normalize(user_emb, p=2, dim=1)
        video_emb = F.normalize(video_emb, p=2, dim=1)
        
        # Dot product (cosine similarity)
        return torch.sum(user_emb * video_emb, dim=1)
```

### 3. Deep & Wide Model

```python
class DeepAndWideModel(nn.Module):
    def __init__(
        self,
        wide_feature_dim: int,
        deep_feature_dim: int,
        deep_layers: list = [512, 256, 128]
    ):
        super().__init__()
        
        # Wide (linear)
        self.wide = nn.Linear(wide_feature_dim, 1)
        
        # Deep (MLP)
        layers = []
        input_dim = deep_feature_dim
        for hidden_dim in deep_layers:
            layers.extend([
                nn.Linear(input_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.3)
            ])
            input_dim = hidden_dim
        layers.append(nn.Linear(input_dim, 1))
        self.deep = nn.Sequential(*layers)
    
    def forward(self, wide_features, deep_features):
        wide_out = self.wide(wide_features)
        deep_out = self.deep(deep_features)
        return torch.sigmoid(wide_out + deep_out)
```

---

## 🔧 Training Pipeline

### Dataset

**File**: `backend/app/ml/data/dataset.py`

```python
from torch.utils.data import Dataset, DataLoader

class VideoRecommendationDataset(Dataset):
    def __init__(self, interactions_df, negative_sampling_ratio=4.0):
        self.interactions = interactions_df
        self.negative_sampling_ratio = negative_sampling_ratio
        self.samples = self._prepare_samples()
    
    def _prepare_samples(self):
        # Positive samples
        positive = [
            {'user_id': row['user_id'], 'video_id': row['video_id'], 'label': 1.0}
            for _, row in self.interactions.iterrows()
            if row['rating'] >= 3
        ]
        
        # Negative samples (random)
        num_negatives = int(len(positive) * self.negative_sampling_ratio)
        negative = [
            {'user_id': random_user(), 'video_id': random_video(), 'label': 0.0}
            for _ in range(num_negatives)
        ]
        
        return positive + negative
    
    def __len__(self):
        return len(self.samples)
    
    def __getitem__(self, idx):
        sample = self.samples[idx]
        return {
            'user_id': torch.tensor(sample['user_id'], dtype=torch.long),
            'video_id': torch.tensor(sample['video_id'], dtype=torch.long),
            'label': torch.tensor(sample['label'], dtype=torch.float32)
        }
```

### Trainer

**File**: `backend/app/ml/training/trainer.py`

```python
class RecommendationTrainer:
    def __init__(self, model, device='cuda', lr=0.001):
        self.model = model.to(device)
        self.device = device
        self.criterion = nn.BCELoss()
        self.optimizer = optim.Adam(model.parameters(), lr=lr)
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', factor=0.5, patience=3
        )
    
    def train_epoch(self, train_loader):
        self.model.train()
        total_loss = 0.0
        
        for batch in train_loader:
            user_ids = batch['user_id'].to(self.device)
            video_ids = batch['video_id'].to(self.device)
            labels = batch['label'].to(self.device).unsqueeze(1)
            
            predictions = self.model(user_ids, video_ids)
            loss = self.criterion(predictions, labels)
            
            self.optimizer.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.optimizer.step()
            
            total_loss += loss.item()
        
        return total_loss / len(train_loader)
    
    def train(self, train_loader, val_loader, num_epochs=50):
        for epoch in range(num_epochs):
            train_loss = self.train_epoch(train_loader)
            val_metrics = self.validate(val_loader)
            
            print(f"Epoch {epoch+1}: Train Loss={train_loss:.4f}, "
                  f"Val AUC={val_metrics['auc']:.4f}")
            
            self.scheduler.step(val_metrics['loss'])
            
            if val_metrics['loss'] < self.best_val_loss:
                self.save_checkpoint('best_model.pt')
```

---

## 🚀 Deployment & Serving

### Inference Service

**File**: `backend/app/ml/inference/predictor.py`

```python
class NeuralRecommendationPredictor:
    def __init__(self, model_path, device='cuda'):
        self.device = device
        self.model = self._load_model(model_path)
        self.model.eval()
    
    def predict_batch(self, user_ids, video_ids):
        with torch.no_grad():
            user_tensor = torch.tensor(user_ids, dtype=torch.long).to(self.device)
            video_tensor = torch.tensor(video_ids, dtype=torch.long).to(self.device)
            scores = self.model(user_tensor, video_tensor)
            return scores.cpu().numpy()
    
    def recommend_top_k(self, user_id, candidate_video_ids, k=10):
        user_ids = [user_id] * len(candidate_video_ids)
        scores = self.predict_batch(user_ids, candidate_video_ids)
        
        # Sort by score
        top_indices = np.argsort(scores)[-k:][::-1]
        return [(candidate_video_ids[i], scores[i]) for i in top_indices]
```

### Integration con Backend

**File**: `backend/app/services/neural_recommendation_service.py`

```python
from app.ml.inference.predictor import NeuralRecommendationPredictor

class NeuralRecommendationService:
    def __init__(self):
        self.predictor = NeuralRecommendationPredictor(
            model_path='models/best_model.pt',
            device='cuda' if torch.cuda.is_available() else 'cpu'
        )
    
    async def get_recommended_video(
        self,
        session,
        word: str,
        user_id: int,
        candidate_videos: List[Dict]
    ):
        # Extract video IDs
        video_ids = [v['video_id_mapped'] for v in candidate_videos]
        
        # Get predictions
        recommendations = self.predictor.recommend_top_k(
            user_id=user_id,
            candidate_video_ids=video_ids,
            k=1
        )
        
        # Return best video
        best_video_id = recommendations[0][0]
        return next(v for v in candidate_videos if v['video_id_mapped'] == best_video_id)
```

---

## 📦 Dipendenze

### requirements.txt

```txt
# Existing dependencies
fastapi==0.115.0
uvicorn[standard]==0.30.0
sqlmodel==0.0.24
psycopg2-binary==2.9.10

# PyTorch & ML
torch==2.1.0
torchvision==0.16.0
numpy==1.24.3
pandas==2.0.3
scikit-learn==1.3.0

# Optional: Experiment tracking
mlflow==2.8.0
tensorboard==2.15.0
```

---

## 📅 Roadmap Implementazione

### Sprint 1: Setup & Data (2 settimane)
- [ ] Setup PyTorch environment
- [ ] Creare dataset preparation pipeline
- [ ] Implementare DataLoader
- [ ] Data augmentation & negative sampling

### Sprint 2: Model Development (3 settimane)
- [ ] Implementare NCF model
- [ ] Implementare Two-Tower model
- [ ] Implementare Deep & Wide model
- [ ] Unit tests per modelli

### Sprint 3: Training Pipeline (2 settimane)
- [ ] Training loop
- [ ] Validation & metrics
- [ ] Hyperparameter tuning
- [ ] Experiment tracking (MLflow)

### Sprint 4: Inference & Integration (2 settimane)
- [ ] Inference service
- [ ] Model serving (FastAPI)
- [ ] Integration con recommendation service
- [ ] Performance optimization

### Sprint 5: Testing & Deployment (2 settimane)
- [ ] A/B testing framework
- [ ] Load testing
- [ ] Production deployment
- [ ] Monitoring & logging

### Sprint 6: Retraining Pipeline (1 settimana)
- [ ] Automated retraining
- [ ] Model versioning
- [ ] Performance tracking
- [ ] Documentation

**Totale**: ~12 settimane (3 mesi)

---

## 🔧 Configurazione

### Environment Variables

```bash
# .env
PYTORCH_DEVICE=cuda  # or cpu
MODEL_PATH=models/best_model.pt
BATCH_SIZE=256
EMBEDDING_DIM=128
LEARNING_RATE=0.001
```

### Model Configuration

```python
# backend/app/ml/config.py
class ModelConfig:
    # NCF
    embedding_dim = 128
    hidden_layers = [512, 256, 128]
    dropout_rate = 0.3
    
    # Training
    batch_size = 256
    learning_rate = 0.001
    num_epochs = 50
    early_stopping_patience = 5
    
    # Device
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
```

---

## 📊 Metriche & Monitoring

### Training Metrics
- **Loss**: BCE Loss
- **AUC-ROC**: Area under ROC curve
- **Precision/Recall**: @ threshold 0.5
- **NDCG**: Normalized Discounted Cumulative Gain

### Production Metrics
- **Inference Latency**: < 50ms per prediction
- **Throughput**: > 1000 predictions/sec
- **Model Size**: < 500MB
- **Memory Usage**: < 2GB GPU

---

## 🚀 Benefici Attesi

### Performance
- **Accuratezza**: +15-20% vs metodi tradizionali
- **Personalizzazione**: Embedding personalizzati per ogni utente
- **Scalabilità**: Gestisce milioni di utenti/video

### Business
- **Engagement**: +25% completion rate
- **Learning**: +30% effectiveness
- **Retention**: +20% user retention

---

## 📚 Riferimenti

### Papers
- "Neural Collaborative Filtering" (He et al., 2017)
- "Wide & Deep Learning" (Cheng et al., 2016)
- "Deep Neural Networks for YouTube Recommendations" (Covington et al., 2016)

### Resources
- PyTorch Docs: https://pytorch.org/docs/
- PyTorch Tutorials: https://pytorch.org/tutorials/
- Recommender Systems Course: https://www.coursera.org/learn/recommender-systems

---

**Documento creato**: 2025-11-24  
**Versione**: 1.0  
**Status**: Proposta per Review
