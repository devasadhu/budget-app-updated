"""
SmartBudget ML Training Script
Train a high-accuracy transaction categorization model in Python
and export it for use in the React Native app.

Usage:
    python train_ml_model.py --input transactions.csv --output model.json
"""

import json
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
import argparse
from typing import Dict, List, Tuple
import re

# Categories matching the app
CATEGORIES = [
    'Food & Dining',
    'Groceries',
    'Transportation',
    'Shopping',
    'Bills & Utilities',
    'Entertainment',
    'Health & Fitness',
    'Education',
    'Travel',
    'Personal Care',
    'Investments',
    'Other'
]

class TransactionMLTrainer:
    """Train ML model for transaction categorization"""
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            ngram_range=(1, 2),  # Use unigrams and bigrams
            min_df=2,
            max_df=0.8,
            sublinear_tf=True,  # Use sublinear TF scaling
            strip_accents='unicode',
            analyzer='word',
            token_pattern=r'\w{3,}',  # At least 3 characters
            stop_words='english'
        )
        
        self.classifier = LogisticRegression(
            max_iter=1000,
            C=1.0,  # Regularization strength
            multi_class='multinomial',
            solver='lbfgs',
            random_state=42,
            class_weight='balanced'  # Handle imbalanced classes
        )
        
        self.amount_buckets = ['tiny_amount', 'small_amount', 'medium_amount', 
                               'large_amount', 'huge_amount']
    
    def prepare_text(self, row: pd.Series) -> str:
        """Prepare text from transaction data"""
        parts = []
        
        # Description
        if pd.notna(row.get('description')):
            parts.append(str(row['description']))
        
        # Merchant
        if pd.notna(row.get('merchant')):
            parts.append(str(row['merchant']))
        
        # Amount bucket
        if pd.notna(row.get('amount')):
            amount = float(row['amount'])
            bucket = self.get_amount_bucket(amount)
            parts.append(bucket)
        
        return ' '.join(parts)
    
    def get_amount_bucket(self, amount: float) -> str:
        """Convert amount to categorical bucket"""
        if amount < 100:
            return 'tiny_amount'
        elif amount < 500:
            return 'small_amount'
        elif amount < 1000:
            return 'medium_amount'
        elif amount < 5000:
            return 'large_amount'
        else:
            return 'huge_amount'
    
    def load_data(self, filepath: str) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray]:
        """Load and prepare training data"""
        print(f"📂 Loading data from {filepath}...")
        
        df = pd.read_csv(filepath)
        
        # Validate required columns
        required_cols = ['description', 'category']
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Missing required column: {col}")
        
        # Filter valid categories
        df = df[df['category'].isin(CATEGORIES)]
        
        print(f"✅ Loaded {len(df)} transactions across {df['category'].nunique()} categories")
        print(f"\nCategory distribution:")
        print(df['category'].value_counts())
        
        # Prepare features
        X_text = df.apply(self.prepare_text, axis=1).values
        y = df['category'].values
        
        return df, X_text, y
    
    def train(self, X_text: np.ndarray, y: np.ndarray) -> Dict:
        """Train the model"""
        print("\n🎓 Training TF-IDF + Logistic Regression model...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_text, y, test_size=0.2, random_state=42, stratify=y
        )
        
        print(f"Training set: {len(X_train)} samples")
        print(f"Test set: {len(X_test)} samples")
        
        # Fit vectorizer
        print("\n📚 Fitting TF-IDF vectorizer...")
        X_train_vec = self.vectorizer.fit_transform(X_train)
        X_test_vec = self.vectorizer.transform(X_test)
        
        print(f"Vocabulary size: {len(self.vectorizer.vocabulary_)}")
        
        # Train classifier
        print("\n🧠 Training classifier...")
        self.classifier.fit(X_train_vec, y_train)
        
        # Evaluate
        train_score = self.classifier.score(X_train_vec, y_train)
        test_score = self.classifier.score(X_test_vec, y_test)
        
        print(f"\n✅ Training accuracy: {train_score:.4f}")
        print(f"✅ Test accuracy: {test_score:.4f}")
        
        # Cross-validation
        print("\n🔄 Running 5-fold cross-validation...")
        X_all_vec = self.vectorizer.transform(X_text)
        cv_scores = cross_val_score(self.classifier, X_all_vec, y, cv=5)
        print(f"CV accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
        
        # Detailed evaluation
        y_pred = self.classifier.predict(X_test_vec)
        print("\n📊 Classification Report:")
        print(classification_report(y_test, y_pred))
        
        # Feature importance
        print("\n🔍 Top features per category:")
        self.print_top_features(n=5)
        
        return {
            'train_accuracy': train_score,
            'test_accuracy': test_score,
            'cv_accuracy': cv_scores.mean(),
            'cv_std': cv_scores.std()
        }
    
    def print_top_features(self, n: int = 5):
        """Print top features for each category"""
        feature_names = self.vectorizer.get_feature_names_out()
        
        for i, category in enumerate(self.classifier.classes_):
            # Get weights for this category
            weights = self.classifier.coef_[i]
            top_indices = np.argsort(weights)[-n:][::-1]
            top_features = [feature_names[idx] for idx in top_indices]
            top_weights = [weights[idx] for idx in top_indices]
            
            print(f"\n{category}:")
            for feature, weight in zip(top_features, top_weights):
                print(f"  {feature:20s} {weight:.4f}")
    
    def export_model(self, output_path: str, metadata: Dict):
        """Export model to JSON for React Native"""
        print(f"\n💾 Exporting model to {output_path}...")
        
        # Get vocabulary and IDF scores
        vocabulary = list(self.vectorizer.vocabulary_.keys())
        idf_scores = []
        for word in vocabulary:
            idx = self.vectorizer.vocabulary_[word]
            idf = self.vectorizer.idf_[idx]
            idf_scores.append([word, float(idf)])
        
        # Get classifier weights
        classifier_weights = {}
        feature_names = self.vectorizer.get_feature_names_out()
        
        for i, category in enumerate(self.classifier.classes_):
            weights = {}
            for j, feature in enumerate(feature_names):
                weights[feature] = float(self.classifier.coef_[i][j])
            
            classifier_weights[category] = {
                'weights': weights,
                'bias': float(self.classifier.intercept_[i])
            }
        
        # Create export data
        export_data = {
            'vectorizer': {
                'vocabulary': vocabulary,
                'idf_scores': idf_scores
            },
            'classifier': {
                'weights': classifier_weights,
                'categories': list(self.classifier.classes_)
            },
            'metadata': {
                'accuracy': metadata['test_accuracy'],
                'training_samples': metadata.get('n_samples', 0),
                'version': '1.0',
                'features': len(feature_names),
                'cv_accuracy': metadata.get('cv_accuracy', 0)
            }
        }
        
        # Save to JSON
        with open(output_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        print(f"✅ Model exported successfully!")
        print(f"   Vocabulary size: {len(vocabulary)}")
        print(f"   Categories: {len(self.classifier.classes_)}")
        print(f"   Model size: {len(json.dumps(export_data)) / 1024:.2f} KB")
    
    def create_synthetic_data(self, output_path: str):
        """Create synthetic training data for demonstration"""
        print("🔨 Creating synthetic training data...")
        
        data = [
            # Food & Dining
            {'description': 'Swiggy food delivery bangalore biryani', 'merchant': 'Swiggy', 'amount': 450, 'category': 'Food & Dining'},
            {'description': 'Zomato restaurant dinner pizza', 'merchant': 'Zomato', 'amount': 680, 'category': 'Food & Dining'},
            {'description': 'McDonald burger meal combo', 'merchant': 'McDonalds', 'amount': 350, 'category': 'Food & Dining'},
            {'description': 'Starbucks coffee latte morning', 'merchant': 'Starbucks', 'amount': 320, 'category': 'Food & Dining'},
            {'description': 'KFC chicken bucket family meal', 'merchant': 'KFC', 'amount': 750, 'category': 'Food & Dining'},
            
            # Groceries
            {'description': 'BigBasket grocery vegetables fruits', 'merchant': 'BigBasket', 'amount': 2500, 'category': 'Groceries'},
            {'description': 'DMart weekly shopping household', 'merchant': 'DMart', 'amount': 3200, 'category': 'Groceries'},
            {'description': 'Blinkit instant delivery milk bread', 'merchant': 'Blinkit', 'amount': 650, 'category': 'Groceries'},
            {'description': 'Supermarket monthly groceries atta', 'merchant': 'Supermarket', 'amount': 2800, 'category': 'Groceries'},
            
            # Transportation
            {'description': 'Uber ride airport cab', 'merchant': 'Uber', 'amount': 650, 'category': 'Transportation'},
            {'description': 'Ola cab office commute', 'merchant': 'Ola', 'amount': 280, 'category': 'Transportation'},
            {'description': 'Petrol pump fuel car', 'merchant': 'IOCL', 'amount': 2500, 'category': 'Transportation'},
            {'description': 'Metro card recharge travel', 'merchant': 'Metro', 'amount': 800, 'category': 'Transportation'},
            
            # Shopping
            {'description': 'Amazon online electronics order', 'merchant': 'Amazon', 'amount': 3500, 'category': 'Shopping'},
            {'description': 'Flipkart mobile phone purchase', 'merchant': 'Flipkart', 'amount': 18000, 'category': 'Shopping'},
            {'description': 'Myntra clothing fashion', 'merchant': 'Myntra', 'amount': 2200, 'category': 'Shopping'},
            {'description': 'Nykaa beauty cosmetics', 'merchant': 'Nykaa', 'amount': 1500, 'category': 'Shopping'},
            
            # Entertainment
            {'description': 'Netflix subscription streaming', 'merchant': 'Netflix', 'amount': 649, 'category': 'Entertainment'},
            {'description': 'BookMyShow movie tickets', 'merchant': 'BookMyShow', 'amount': 600, 'category': 'Entertainment'},
            {'description': 'Spotify music premium', 'merchant': 'Spotify', 'amount': 119, 'category': 'Entertainment'},
            
            # Bills & Utilities
            {'description': 'Electricity bill payment monthly', 'merchant': 'BSES', 'amount': 1800, 'category': 'Bills & Utilities'},
            {'description': 'Mobile recharge Airtel prepaid', 'merchant': 'Airtel', 'amount': 499, 'category': 'Bills & Utilities'},
            {'description': 'Internet broadband bill', 'merchant': 'Jio', 'amount': 999, 'category': 'Bills & Utilities'},
            
            # Health & Fitness
            {'description': 'Gym membership monthly fitness', 'merchant': 'Fitness First', 'amount': 3000, 'category': 'Health & Fitness'},
            {'description': 'Doctor consultation medical', 'merchant': 'Clinic', 'amount': 800, 'category': 'Health & Fitness'},
            {'description': 'Apollo pharmacy medicines', 'merchant': 'Apollo', 'amount': 950, 'category': 'Health & Fitness'},
            
            # Education
            {'description': 'Udemy course online learning', 'merchant': 'Udemy', 'amount': 499, 'category': 'Education'},
            {'description': 'Book store textbooks purchase', 'merchant': 'Crossword', 'amount': 1200, 'category': 'Education'},
            {'description': 'Tuition fees coaching', 'merchant': 'Coaching', 'amount': 8000, 'category': 'Education'},
        ]
        
        # Augment with variations
        augmented_data = []
        for item in data * 3:  # Triple the data
            augmented_data.append(item.copy())
        
        df = pd.DataFrame(augmented_data)
        df.to_csv(output_path, index=False)
        print(f"✅ Created {len(df)} synthetic examples in {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Train ML model for transaction categorization')
    parser.add_argument('--input', type=str, help='Input CSV file with transactions')
    parser.add_argument('--output', type=str, default='model.json', help='Output JSON file for model')
    parser.add_argument('--create-synthetic', action='store_true', help='Create synthetic training data')
    
    args = parser.parse_args()
    
    trainer = TransactionMLTrainer()
    
    # Create synthetic data if requested
    if args.create_synthetic:
        synthetic_path = 'synthetic_transactions.csv'
        trainer.create_synthetic_data(synthetic_path)
        if not args.input:
            args.input = synthetic_path
    
    # Train model
    if args.input:
        df, X_text, y = trainer.load_data(args.input)
        metrics = trainer.train(X_text, y)
        
        # Export model
        metrics['n_samples'] = len(df)
        trainer.export_model(args.output, metrics)
        
        print(f"\n🎉 Training complete!")
        print(f"📱 To use in React Native app:")
        print(f"   1. Copy {args.output} to your app")
        print(f"   2. Load it using: mlCategorizationService.importPythonModel(modelData)")
    else:
        print("❌ Please provide --input CSV file or use --create-synthetic")


if __name__ == '__main__':
    main()