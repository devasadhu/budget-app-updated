// SmartBudget/main/app/_lib/mlCategorizationService.ts
// 🤖 HYBRID ML SERVICE - TF-IDF + Python-trained weights
// Combines TypeScript in-app learning with optional Python-trained models

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CATEGORIES } from '../../constants/category';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface MLPrediction {
  category: string;
  confidence: number;
  method: 'ml' | 'python' | 'fallback';
  alternatives: Array<{ category: string; confidence: number }>;
  topFeatures?: Array<{ word: string; weight: number }>;
  explanation?: string;
}

export interface TrainingExample {
  description: string;
  merchant?: string;
  amount: number;
  category: string;
  userId: string;
  timestamp: Date;
}

export interface ModelMetrics {
  accuracy: number;
  trainingCount: number;
  categoryCounts: Record<string, number>;
  lastTrained: Date | null;
  modelSource: 'typescript' | 'python' | 'hybrid';
}

interface TFIDFVector {
  [word: string]: number;
}

interface LogisticRegressionWeights {
  [category: string]: {
    weights: { [feature: string]: number };
    bias: number;
  };
}

// Python model format
interface PythonModelData {
  vectorizer: {
    vocabulary: string[];
    idf_scores: Array<[string, number]>;
  };
  classifier: {
    weights: LogisticRegressionWeights;
    categories: string[];
  };
  metadata: {
    accuracy: number;
    training_samples: number;
    version: string;
  };
}

// ============================================================================
// TF-IDF VECTORIZER (Enhanced)
// ============================================================================

class TFIDFVectorizer {
  private vocabulary: Set<string> = new Set();
  private idfScores: Map<string, number> = new Map();
  private documentCount: number = 0;
  private documentFrequency: Map<string, number> = new Map();

  /**
   * Tokenize and clean text with enhanced preprocessing
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\d+/g, 'NUM') // Replace numbers with NUM token
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }

  /**
   * Enhanced stop words list (including common transaction words)
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'in', 'to', 'for', 'and', 
      'or', 'of', 'a', 'an', 'as', 'by', 'from', 'with', 'this',
      'that', 'these', 'those', 'was', 'were', 'been', 'being',
      'have', 'has', 'had', 'will', 'would', 'should', 'could'
    ]);
    return stopWords.has(word);
  }

  /**
   * Calculate term frequency with sublinear scaling
   */
  private calculateTF(tokens: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    const totalTokens = tokens.length;

    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // Sublinear TF scaling: 1 + log(count)
    for (const [token, count] of tf.entries()) {
      tf.set(token, (1 + Math.log(count)) / totalTokens);
    }

    return tf;
  }

  /**
   * Fit the vectorizer on training documents
   */
  fit(documents: string[]): void {
    this.vocabulary.clear();
    this.documentFrequency.clear();
    this.documentCount = documents.length;

    // Build vocabulary and document frequency
    for (const doc of documents) {
      const tokens = this.tokenize(doc);
      const uniqueTokens = new Set(tokens);

      for (const token of uniqueTokens) {
        this.vocabulary.add(token);
        this.documentFrequency.set(
          token,
          (this.documentFrequency.get(token) || 0) + 1
        );
      }
    }

    // Calculate IDF scores with smoothing
    for (const word of this.vocabulary) {
      const df = this.documentFrequency.get(word) || 1;
      const idf = Math.log((this.documentCount + 1) / (df + 1)) + 1;
      this.idfScores.set(word, idf);
    }

    console.log(`📚 TF-IDF fitted: ${documents.length} docs, ${this.vocabulary.size} vocab`);
  }

  /**
   * Transform a document to TF-IDF vector
   */
  transform(document: string): TFIDFVector {
    const tokens = this.tokenize(document);
    const tf = this.calculateTF(tokens);
    const vector: TFIDFVector = {};

    for (const [word, tfScore] of tf.entries()) {
      if (this.vocabulary.has(word)) {
        const idf = this.idfScores.get(word) || 0;
        vector[word] = tfScore * idf;
      }
    }

    // L2 normalization
    const norm = Math.sqrt(Object.values(vector).reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (const word in vector) {
        vector[word] /= norm;
      }
    }

    return vector;
  }

  /**
   * Get top features from a vector
   */
  getTopFeatures(vector: TFIDFVector, topN: number = 5): Array<{ word: string; weight: number }> {
    return Object.entries(vector)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word, weight]) => ({ word, weight }));
  }

  /**
   * Get vocabulary size
   */
  getVocabularySize(): number {
    return this.vocabulary.size;
  }

  /**
   * Load from Python-trained vectorizer
   */
  loadFromPython(data: PythonModelData['vectorizer']): void {
    this.vocabulary = new Set(data.vocabulary);
    this.idfScores = new Map(data.idf_scores);
    this.documentCount = data.vocabulary.length;
    console.log(`🐍 Loaded Python vectorizer: ${this.vocabulary.size} vocab`);
  }

  /**
   * Serialize for storage
   */
  toJSON(): any {
    return {
      vocabulary: Array.from(this.vocabulary),
      idfScores: Array.from(this.idfScores.entries()),
      documentCount: this.documentCount,
      documentFrequency: Array.from(this.documentFrequency.entries()),
    };
  }

  /**
   * Deserialize from storage
   */
  fromJSON(data: any): void {
    this.vocabulary = new Set(data.vocabulary);
    this.idfScores = new Map(data.idfScores);
    this.documentCount = data.documentCount;
    this.documentFrequency = new Map(data.documentFrequency);
  }
}

// ============================================================================
// LOGISTIC REGRESSION CLASSIFIER (Enhanced)
// ============================================================================

class LogisticRegressionClassifier {
  private weights: LogisticRegressionWeights = {};
  private categories: string[] = [];
  private learningRate: number = 0.1;
  private regularization: number = 0.01;
  private maxIterations: number = 100;
  private isPythonModel: boolean = false;

  /**
   * Initialize weights for all categories
   */
  private initializeWeights(features: string[], categories: string[]): void {
    this.categories = categories;
    
    for (const category of categories) {
      this.weights[category] = {
        weights: {},
        bias: 0,
      };
      
      // Initialize small random weights
      for (const feature of features) {
        this.weights[category].weights[feature] = (Math.random() - 0.5) * 0.01;
      }
    }
  }

  /**
   * Sigmoid activation function
   */
  private sigmoid(z: number): number {
    // Prevent overflow
    if (z > 20) return 1;
    if (z < -20) return 0;
    return 1 / (1 + Math.exp(-z));
  }

  /**
   * Softmax for multi-class classification
   */
  private softmax(scores: number[]): number[] {
    const maxScore = Math.max(...scores);
    const expScores = scores.map(s => Math.exp(Math.min(s - maxScore, 20)));
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    return expScores.map(s => s / (sumExp + 1e-10));
  }

  /**
   * Compute prediction score for a category
   */
  private computeScore(vector: TFIDFVector, category: string): number {
    if (!this.weights[category]) return 0;

    let score = this.weights[category].bias;
    
    for (const [feature, value] of Object.entries(vector)) {
      if (this.weights[category].weights[feature] !== undefined) {
        score += this.weights[category].weights[feature] * value;
      }
    }

    return score;
  }

  /**
   * Train the classifier with mini-batch gradient descent
   */
  train(
    vectors: TFIDFVector[],
    labels: string[],
    onProgress?: (iteration: number, loss: number) => void
  ): void {
    const allFeatures = new Set<string>();
    for (const vector of vectors) {
      for (const feature of Object.keys(vector)) {
        allFeatures.add(feature);
      }
    }

    const uniqueCategories = Array.from(new Set(labels));
    this.initializeWeights(Array.from(allFeatures), uniqueCategories);
    this.isPythonModel = false;

    console.log(`🎓 Training: ${vectors.length} samples, ${allFeatures.size} features, ${uniqueCategories.length} classes`);

    // Mini-batch gradient descent
    const batchSize = Math.min(32, Math.floor(vectors.length / 4));
    
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      let totalLoss = 0;
      
      // Shuffle data
      const indices = Array.from({ length: vectors.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      // Process mini-batches
      for (let batchStart = 0; batchStart < vectors.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, vectors.length);
        
        for (let idx = batchStart; idx < batchEnd; idx++) {
          const i = indices[idx];
          const vector = vectors[i];
          const trueLabel = labels[i];

          const scores = this.categories.map(cat => this.computeScore(vector, cat));
          const probabilities = this.softmax(scores);

          const trueLabelIndex = this.categories.indexOf(trueLabel);
          totalLoss -= Math.log(probabilities[trueLabelIndex] + 1e-10);

          // Update weights
          for (let j = 0; j < this.categories.length; j++) {
            const category = this.categories[j];
            const target = j === trueLabelIndex ? 1 : 0;
            const error = probabilities[j] - target;

            for (const [feature, value] of Object.entries(vector)) {
              if (this.weights[category].weights[feature] !== undefined) {
                const gradient = error * value + this.regularization * this.weights[category].weights[feature];
                this.weights[category].weights[feature] -= this.learningRate * gradient;
              }
            }

            this.weights[category].bias -= this.learningRate * error;
          }
        }
      }

      const avgLoss = totalLoss / vectors.length;
      
      if (iteration % 10 === 0) {
        console.log(`  Iteration ${iteration}: Loss = ${avgLoss.toFixed(4)}`);
        if (onProgress) {
          onProgress(iteration, avgLoss);
        }
      }

      // Early stopping
      if (avgLoss < 0.01) {
        console.log(`✅ Converged at iteration ${iteration}`);
        break;
      }

      // Reduce learning rate over time
      this.learningRate *= 0.995;
    }
  }

  /**
   * Predict category for a vector
   */
  predict(vector: TFIDFVector): { 
    category: string; 
    confidence: number; 
    probabilities: Record<string, number> 
  } {
    const scores = this.categories.map(cat => this.computeScore(vector, cat));
    const probabilities = this.softmax(scores);

    const probabilitiesMap: Record<string, number> = {};
    for (let i = 0; i < this.categories.length; i++) {
      probabilitiesMap[this.categories[i]] = probabilities[i];
    }

    const maxIndex = probabilities.indexOf(Math.max(...probabilities));
    const category = this.categories[maxIndex];
    const confidence = probabilities[maxIndex];

    return { category, confidence, probabilities: probabilitiesMap };
  }

  /**
   * Load from Python-trained classifier
   */
  loadFromPython(data: PythonModelData['classifier']): void {
    this.weights = data.weights;
    this.categories = data.categories;
    this.isPythonModel = true;
    console.log(`🐍 Loaded Python classifier: ${this.categories.length} categories`);
  }

  /**
   * Get feature importance for a category
   */
  getFeatureImportance(category: string, topN: number = 10): Array<{ feature: string; weight: number }> {
    if (!this.weights[category]) return [];

    return Object.entries(this.weights[category].weights)
      .map(([feature, weight]) => ({ feature, weight: Math.abs(weight) }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, topN);
  }

  /**
   * Check if using Python model
   */
  isPython(): boolean {
    return this.isPythonModel;
  }

  /**
   * Serialize for storage
   */
  toJSON(): any {
    return {
      weights: this.weights,
      categories: this.categories,
      learningRate: this.learningRate,
      regularization: this.regularization,
      isPythonModel: this.isPythonModel,
    };
  }

  /**
   * Deserialize from storage
   */
  fromJSON(data: any): void {
    this.weights = data.weights;
    this.categories = data.categories;
    this.learningRate = data.learningRate;
    this.regularization = data.regularization;
    this.isPythonModel = data.isPythonModel || false;
  }
}

// ============================================================================
// HYBRID ML CATEGORIZATION SERVICE
// ============================================================================

class MLCategorizationService {
  private vectorizer: TFIDFVectorizer = new TFIDFVectorizer();
  private classifier: LogisticRegressionClassifier = new LogisticRegressionClassifier();
  private isReady: boolean = false;
  private trainingExamples: TrainingExample[] = [];
  private readonly MODEL_KEY = '@smartbudget_ml_model_v3';
  private readonly PYTHON_MODEL_KEY = '@smartbudget_python_model';
  private readonly MIN_CONFIDENCE = 0.6;
  private modelSource: 'typescript' | 'python' | 'hybrid' = 'typescript';

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  /**
   * Initialize the ML service (hybrid mode)
   */
  async initialize(userId: string): Promise<void> {
    console.log('🤖 Initializing Hybrid ML Service...');
    
    try {
      // Step 1: Try to load Python model first (most accurate)
      const pythonLoaded = await this.loadPythonModel();
      
      // Step 2: Load TypeScript model or train new one
      const tsLoaded = await this.loadModel();
      
      if (!tsLoaded && !pythonLoaded) {
        console.log('📦 No models found. Training with synthetic data...');
        await this.trainWithSyntheticData();
        this.modelSource = 'typescript';
      } else if (pythonLoaded && tsLoaded) {
        this.modelSource = 'hybrid';
        console.log('🔀 Using hybrid Python + TypeScript model');
      } else if (pythonLoaded) {
        this.modelSource = 'python';
        console.log('🐍 Using Python-trained model');
      } else {
        this.modelSource = 'typescript';
        console.log('📱 Using TypeScript model');
      }
      
      this.isReady = true;
      console.log(`✅ ML Service ready: ${this.trainingExamples.length} examples, vocab: ${this.vectorizer.getVocabularySize()}`);
    } catch (error) {
      console.error('❌ ML initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load Python-trained model from AsyncStorage
   */
  async loadPythonModel(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(this.PYTHON_MODEL_KEY);
      
      if (!stored) {
        console.log('📦 No Python model found');
        return false;
      }

      const pythonData: PythonModelData = JSON.parse(stored);

      // Load vectorizer
      this.vectorizer.loadFromPython(pythonData.vectorizer);

      // Load classifier
      this.classifier.loadFromPython(pythonData.classifier);

      console.log(`🐍 Python model loaded: v${pythonData.metadata.version}, accuracy: ${pythonData.metadata.accuracy.toFixed(2)}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to load Python model:', error);
      return false;
    }
  }

  /**
   * Import Python-trained model (call this from your Python training script)
   */
  async importPythonModel(pythonModelData: PythonModelData): Promise<void> {
    try {
      await AsyncStorage.setItem(this.PYTHON_MODEL_KEY, JSON.stringify(pythonModelData));
      
      // Reload the model
      await this.loadPythonModel();
      this.modelSource = this.trainingExamples.length > 0 ? 'hybrid' : 'python';
      
      console.log('✅ Python model imported successfully');
    } catch (error) {
      console.error('❌ Failed to import Python model:', error);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // SYNTHETIC TRAINING DATA
  // --------------------------------------------------------------------------

  /**
   * Train with comprehensive synthetic data
   */
  private async trainWithSyntheticData(): Promise<void> {
    const syntheticData: TrainingExample[] = [
      // Food & Dining (20 examples)
      { description: 'Swiggy food delivery bangalore order lunch biryani chicken', merchant: 'Swiggy', amount: 450, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Zomato dinner restaurant food delivery pizza pasta italian', merchant: 'Zomato', amount: 680, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'McDonald Connaught Place burger meal fries coke', merchant: 'McDonalds', amount: 350, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Dominos Pizza order party size pepperoni cheese', merchant: 'Dominos', amount: 899, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Starbucks coffee latte cappuccino espresso beverage', merchant: 'Starbucks', amount: 320, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Restaurant bill payment dinner party celebration meal', merchant: 'Local Restaurant', amount: 2500, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Cafe Coffee Day CCD beverage snack sandwich', merchant: 'CCD', amount: 180, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Food court mall purchase lunch noodles chinese', merchant: 'Food Court', amount: 420, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'KFC chicken bucket meal family wings popcorn', merchant: 'KFC', amount: 750, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Subway sandwich meal combo salad healthy', merchant: 'Subway', amount: 280, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Haldirams restaurant dinner snacks samosa chaat', merchant: 'Haldirams', amount: 520, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Biryani Blues order chicken biryani hyderabadi dum', merchant: 'Biryani Blues', amount: 380, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Pizza Hut dine in family meal stuffed crust', merchant: 'Pizza Hut', amount: 1200, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Barbeque Nation buffet dinner unlimited grill', merchant: 'BBQ Nation', amount: 1800, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Street food stall snacks evening pani puri', merchant: 'Street Vendor', amount: 150, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Cafe breakfast brunch coffee pastry croissant', merchant: 'Cafe', amount: 450, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Burger King whopper combo meal onion rings', merchant: 'Burger King', amount: 340, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Chaayos tea adda beverage masala chai kulhad', merchant: 'Chaayos', amount: 200, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Ice cream parlor dessert baskin robbins sundae', merchant: 'Baskin Robbins', amount: 280, category: 'Food & Dining', userId: 'system', timestamp: new Date() },
      { description: 'Bakery pastry cake bread purchase fresh baked', merchant: 'Bakery', amount: 320, category: 'Food & Dining', userId: 'system', timestamp: new Date() },

      // Groceries (15 examples)
      { description: 'BigBasket grocery shopping vegetables fruits milk eggs bread', merchant: 'BigBasket', amount: 2500, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Blinkit vegetables order delivery instant quick 10min', merchant: 'Blinkit', amount: 650, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'DMart weekly shopping household items detergent rice dal', merchant: 'DMart', amount: 3200, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Reliance Fresh grocery store purchase vegetables fruits dairy', merchant: 'Reliance Fresh', amount: 1800, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Supermarket purchase monthly groceries atta oil pulses', merchant: 'Supermarket', amount: 2800, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Vegetable market fresh produce organic tomato onion', merchant: 'Local Market', amount: 600, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'More Megastore grocery shopping spree pantry staples', merchant: 'More', amount: 2200, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Grofers vegetables fruits dairy milk curd paneer', merchant: 'Grofers', amount: 1400, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Zepto instant delivery groceries midnight snacks', merchant: 'Zepto', amount: 850, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Spencers store household groceries cleaning supplies', merchant: 'Spencers', amount: 1900, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Nature Basket organic grocery purchase healthy food', merchant: 'Nature Basket', amount: 2400, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Fruits vegetables dairy milk purchase daily needs', merchant: 'Grocery Store', amount: 950, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Milk booth daily essentials fresh milk delivery', merchant: 'Milk Booth', amount: 300, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Kirana store monthly ration flour sugar tea', merchant: 'Kirana', amount: 1600, category: 'Groceries', userId: 'system', timestamp: new Date() },
      { description: 'Wholesale market bulk purchase groceries wholesale rate', merchant: 'Wholesale', amount: 4500, category: 'Groceries', userId: 'system', timestamp: new Date() },

      // Transportation (15 examples)
      { description: 'Uber ride to airport cab booking taxi hire', merchant: 'Uber', amount: 650, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Ola cab booking office commute daily ride', merchant: 'Ola', amount: 280, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Petrol pump fuel filling car tank gasoline', merchant: 'IOCL', amount: 2500, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Metro card recharge travel public transport DMRC', merchant: 'Delhi Metro', amount: 800, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Rapido bike ride quick trip two wheeler', merchant: 'Rapido', amount: 120, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Parking charges mall parking fee vehicle', merchant: 'Parking', amount: 80, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Toll plaza payment highway expressway FASTag', merchant: 'FASTag', amount: 150, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Auto rickshaw ride local short distance', merchant: 'Auto', amount: 60, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Bus pass monthly travel card public transport', merchant: 'BMTC', amount: 1200, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Train ticket booking railway IRCTC journey', merchant: 'IRCTC', amount: 850, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Diesel filling fuel station vehicle refuel', merchant: 'HP', amount: 3200, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Car service maintenance workshop repair', merchant: 'Service Center', amount: 4500, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Bike fuel petrol pump motorcycle refill', merchant: 'Bharat Petroleum', amount: 450, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Meru cab airport ride premium taxi', merchant: 'Meru', amount: 720, category: 'Transportation', userId: 'system', timestamp: new Date() },
      { description: 'Yulu cycle rental ride eco friendly', merchant: 'Yulu', amount: 40, category: 'Transportation', userId: 'system', timestamp: new Date() },

      // Bills & Utilities (12 examples)
      { description: 'Electricity bill payment monthly BSES power consumption', merchant: 'BSES', amount: 1800, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'Mobile recharge Airtel prepaid plan data calling', merchant: 'Airtel', amount: 499, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'Jio broadband internet bill payment fiber connection', merchant: 'Jio', amount: 999, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'Water bill payment municipal corporation charges', merchant: 'Water Authority', amount: 450, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'Gas cylinder booking HP gas LPG domestic', merchant: 'HP Gas', amount: 950, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'Internet bill ACT Fibernet broadband monthly', merchant: 'ACT Fibernet', amount: 799, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'DTH recharge Tata Sky television channels package', merchant: 'Tata Sky', amount: 350, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'Phone bill postpaid Vodafone mobile plan', merchant: 'Vodafone', amount: 650, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'WiFi broadband bill payment internet connection', merchant: 'Hathway', amount: 899, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'Maintenance charges society apartment residential', merchant: 'Society', amount: 3500, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'Piped gas bill payment IGL natural gas', merchant: 'IGL', amount: 850, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },
      { description: 'Landline telephone bill BSNL fixed line', merchant: 'BSNL', amount: 280, category: 'Bills & Utilities', userId: 'system', timestamp: new Date() },

      // Shopping (15 examples)
      { description: 'Amazon online shopping electronics gadgets prime', merchant: 'Amazon', amount: 3500, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Flipkart purchase mobile phone smartphone android', merchant: 'Flipkart', amount: 18000, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Myntra clothing fashion shopping apparel trendy', merchant: 'Myntra', amount: 2200, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Nykaa beauty products cosmetics makeup skincare', merchant: 'Nykaa', amount: 1500, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Croma electronics store purchase appliances television', merchant: 'Croma', amount: 8500, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Shopping mall purchase clothes footwear accessories', merchant: 'Mall', amount: 4200, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Ajio fashion clothing online designer brands', merchant: 'Ajio', amount: 1800, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Lifestyle store clothing purchase trendy fashion', merchant: 'Lifestyle', amount: 3200, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Max Fashion clothes shopping affordable trendy', merchant: 'Max Fashion', amount: 1600, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Westside clothing apparel casual formal wear', merchant: 'Westside', amount: 2800, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Meesho online shopping budget friendly affordable', merchant: 'Meesho', amount: 850, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Decathlon sports equipment fitness gear athletic', merchant: 'Decathlon', amount: 2500, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Lenskart eyewear glasses spectacles frames lenses', merchant: 'Lenskart', amount: 3200, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Shoppers Stop clothing premium brands fashion', merchant: 'Shoppers Stop', amount: 3800, category: 'Shopping', userId: 'system', timestamp: new Date() },
      { description: 'Local market shopping clothes traditional ethnic', merchant: 'Local Shop', amount: 1200, category: 'Shopping', userId: 'system', timestamp: new Date() },

      // Entertainment (12 examples)
      { description: 'Netflix subscription monthly streaming movies series', merchant: 'Netflix', amount: 649, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'Prime Video Amazon subscription streaming content', merchant: 'Amazon Prime', amount: 299, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'BookMyShow movie tickets cinema hall booking', merchant: 'BookMyShow', amount: 600, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'Spotify premium music subscription streaming playlist', merchant: 'Spotify', amount: 119, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'PVR cinema movie tickets films screening', merchant: 'PVR', amount: 750, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'Gaming subscription PlayStation Plus online games', merchant: 'PlayStation', amount: 699, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'Disney Hotstar subscription streaming sports cricket', merchant: 'Disney+', amount: 499, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'YouTube Premium subscription ad-free videos', merchant: 'YouTube', amount: 129, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'Concert tickets music show live performance', merchant: 'BookMyShow', amount: 2500, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'INOX cinema movie hall multiplex screening', merchant: 'INOX', amount: 680, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'Gaming purchase Steam games digital download', merchant: 'Steam', amount: 1200, category: 'Entertainment', userId: 'system', timestamp: new Date() },
      { description: 'Theme park tickets adventure rides entertainment', merchant: 'Wonderla', amount: 1500, category: 'Entertainment', userId: 'system', timestamp: new Date() },

      // Health & Fitness (10 examples)
      { description: 'Gym membership monthly fitness workout training', merchant: 'Fitness First', amount: 3000, category: 'Health & Fitness', userId: 'system', timestamp: new Date() },
      { description: 'Doctor consultation medical checkup health diagnosis', merchant: 'Clinic', amount: 800, category: 'Health & Fitness', userId: 'system', timestamp: new Date() },
      { description: 'Apollo Pharmacy medicines prescription drugs medical', merchant: 'Apollo Pharmacy', amount: 950, category: 'Health & Fitness', userId: 'system', timestamp: new Date() },
      { description: '1mg medicine order online pharmacy drugs', merchant: '1mg', amount: 650, category: 'Health & Fitness', userId: 'system', timestamp: new Date() },
      { description: 'Yoga class fitness wellness meditation exercise', merchant: 'Yoga Studio', amount: 2500, category: 'Health & Fitness', userId: 'system', timestamp: new Date() },
      { description: 'Cult Fit gym membership workout fitness training', merchant: 'CultFit', amount: 2800, category: 'Health & Fitness', userId: 'system', timestamp: new Date() },
      { description: 'Hospital medical treatment surgery healthcare', merchant: 'Hospital', amount: 5500, category: 'Health & Fitness', userId: 'system', timestamp: new Date() },
      { description: 'Diagnostic lab test blood sugar reports', merchant: 'PathLabs', amount: 1200, category: 'Health & Fitness', userId: 'system', timestamp: new Date() },
      { description: 'Dental checkup teeth cleaning oral health', merchant: 'Dentist', amount: 1500, category: 'Health & Fitness', userId: 'system', timestamp: new Date() },
      { description: 'Health checkup full body medical screening', merchant: 'Thyrocare', amount: 2500, category: 'Health & Fitness', userId: 'system', timestamp: new Date() },

      // Education (8 examples)
      { description: 'Udemy course online learning programming skills', merchant: 'Udemy', amount: 499, category: 'Education', userId: 'system', timestamp: new Date() },
      { description: 'Coursera subscription certificate professional course', merchant: 'Coursera', amount: 3999, category: 'Education', userId: 'system', timestamp: new Date() },
      { description: 'Book store purchase academic textbooks study', merchant: 'Crossword', amount: 1200, category: 'Education', userId: 'system', timestamp: new Date() },
      { description: 'Tuition fees coaching classes entrance exam', merchant: 'Coaching Center', amount: 8000, category: 'Education', userId: 'system', timestamp: new Date() },
      { description: 'Amazon Kindle books ebooks reading digital', merchant: 'Kindle', amount: 350, category: 'Education', userId: 'system', timestamp: new Date() },
      { description: 'Unacademy subscription learning competitive exams', merchant: 'Unacademy', amount: 2500, category: 'Education', userId: 'system', timestamp: new Date() },
      { description: 'School fees annual payment academic tuition', merchant: 'School', amount: 45000, category: 'Education', userId: 'system', timestamp: new Date() },
      { description: 'Stationary purchase notebooks pens study material', merchant: 'Stationary Shop', amount: 650, category: 'Education', userId: 'system', timestamp: new Date() },
    ];

    this.trainingExamples = syntheticData;
    await this.trainModel();
    
    console.log(`✅ Trained with ${syntheticData.length} synthetic examples`);
  }

  // --------------------------------------------------------------------------
  // MODEL TRAINING
  // --------------------------------------------------------------------------

  /**
   * Train the complete ML model
   */
  private async trainModel(): Promise<void> {
    if (this.trainingExamples.length === 0) {
      throw new Error('No training examples available');
    }

    console.log('🎓 Training TF-IDF + Logistic Regression model...');

    const documents = this.trainingExamples.map(ex => 
      this.prepareText(ex.description, ex.merchant, ex.amount)
    );
    const labels = this.trainingExamples.map(ex => ex.category);

    this.vectorizer.fit(documents);
    const vectors = documents.map(doc => this.vectorizer.transform(doc));
    this.classifier.train(vectors, labels);

    await this.saveModel();
    console.log('✅ Training complete!');
  }

  /**
   * Prepare text for model
   */
  private prepareText(description: string, merchant?: string, amount?: number): string {
    const parts: string[] = [];

    if (description) parts.push(description);
    if (merchant) parts.push(merchant);
    if (amount) parts.push(this.getAmountBucket(amount));

    return parts.join(' ');
  }

  /**
   * Convert amount to category bucket
   */
  private getAmountBucket(amount: number): string {
    if (amount < 100) return 'tiny_amount';
    if (amount < 500) return 'small_amount';
    if (amount < 1000) return 'medium_amount';
    if (amount < 5000) return 'large_amount';
    return 'huge_amount';
  }

  // --------------------------------------------------------------------------
  // PREDICTION
  // --------------------------------------------------------------------------

  /**
   * Predict category for a transaction
   */
  async predict(
    description: string,
    merchant?: string,
    amount?: number
  ): Promise<MLPrediction> {
    if (!this.isReady) {
      console.warn('⚠️ ML not ready, using fallback');
      return this.fallbackPrediction(description);
    }

    try {
      const text = this.prepareText(description, merchant, amount);
      const vector = this.vectorizer.transform(text);
      const { category, confidence, probabilities } = this.classifier.predict(vector);

      const topFeatures = this.vectorizer.getTopFeatures(vector, 3);
      const alternatives = Object.entries(probabilities)
        .filter(([cat]) => cat !== category)
        .map(([cat, conf]) => ({ category: cat, confidence: conf }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);

      const method = this.classifier.isPython() ? 'python' : 
                    confidence >= this.MIN_CONFIDENCE ? 'ml' : 'fallback';

      return {
        category,
        confidence,
        method,
        alternatives,
        topFeatures,
        explanation: `Predicted based on: ${topFeatures.map(f => f.word).join(', ')}`,
      };
    } catch (error) {
      console.error('❌ Prediction failed:', error);
      return this.fallbackPrediction(description);
    }
  }

  /**
   * Fallback prediction using keyword matching
   */
  private fallbackPrediction(description: string): MLPrediction {
    const lowerDesc = description.toLowerCase();
    
    const keywords: Record<string, string[]> = {
      'Food & Dining': ['food', 'restaurant', 'cafe', 'meal', 'lunch', 'dinner', 'breakfast', 'swiggy', 'zomato', 'mcdonald', 'domino', 'pizza', 'burger', 'coffee', 'starbucks', 'kfc', 'subway'],
      'Transportation': ['uber', 'ola', 'cab', 'taxi', 'metro', 'bus', 'train', 'petrol', 'diesel', 'fuel', 'parking', 'toll', 'rapido', 'auto'],
      'Groceries': ['grocery', 'vegetable', 'fruit', 'bigbasket', 'dmart', 'market', 'supermarket', 'milk', 'bread', 'blinkit', 'zepto'],
      'Shopping': ['amazon', 'flipkart', 'shopping', 'mall', 'store', 'myntra', 'clothing', 'clothes', 'electronics', 'nykaa', 'ajio'],
      'Entertainment': ['netflix', 'prime', 'movie', 'cinema', 'spotify', 'game', 'gaming', 'concert', 'show', 'pvr', 'inox'],
      'Bills & Utilities': ['bill', 'electricity', 'water', 'gas', 'internet', 'mobile', 'recharge', 'broadband', 'airtel', 'jio'],
      'Health & Fitness': ['gym', 'doctor', 'hospital', 'medicine', 'pharmacy', 'health', 'fitness', 'yoga', 'cult', 'apollo'],
      'Education': ['education', 'course', 'book', 'tuition', 'school', 'college', 'learning', 'udemy', 'coursera', 'unacademy'],
    };

    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (lowerDesc.includes(word)) {
          return {
            category,
            confidence: 0.5,
            method: 'fallback',
            alternatives: [],
            explanation: `Matched keyword: ${word}`,
          };
        }
      }
    }

    return {
      category: 'Other',
      confidence: 0.3,
      method: 'fallback',
      alternatives: [],
      explanation: 'No clear match found',
    };
  }

  // --------------------------------------------------------------------------
  // LEARNING FROM CORRECTIONS
  // --------------------------------------------------------------------------

  /**
   * Learn from user correction
   */
  async learnFromCorrection(
    description: string,
    merchant: string | undefined,
    amount: number,
    originalCategory: string,
    correctedCategory: string,
    userId: string
  ): Promise<void> {
    console.log(`📚 Learning: "${description}" → ${correctedCategory} (was ${originalCategory})`);

    this.trainingExamples.push({
      description,
      merchant,
      amount,
      category: correctedCategory,
      userId,
      timestamp: new Date(),
    });

    // Retrain every 10 corrections (or immediately if Python model)
    const shouldRetrain = this.trainingExamples.length % 10 === 0 || 
                          this.modelSource === 'python';

    if (shouldRetrain) {
      console.log('🔄 Retraining model with new examples...');
      await this.trainModel();
      this.modelSource = 'hybrid'; // Now using hybrid model
      console.log('✅ Model retrained successfully');
    } else {
      await this.saveModel();
    }
  }

  // --------------------------------------------------------------------------
  // MODEL PERSISTENCE
  // --------------------------------------------------------------------------

  /**
   * Save model to AsyncStorage
   */
  private async saveModel(): Promise<void> {
    try {
      const modelData = {
        vectorizer: this.vectorizer.toJSON(),
        classifier: this.classifier.toJSON(),
        trainingExamples: this.trainingExamples,
        modelSource: this.modelSource,
        version: '3.0',
        timestamp: new Date().toISOString(),
      };

      await AsyncStorage.setItem(this.MODEL_KEY, JSON.stringify(modelData));
      console.log('💾 Model saved successfully');
    } catch (error) {
      console.error('❌ Failed to save model:', error);
    }
  }

  /**
   * Load model from AsyncStorage
   */
  private async loadModel(): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(this.MODEL_KEY);
      
      if (!stored) {
        console.log('📦 No saved TypeScript model found');
        return false;
      }

      const modelData = JSON.parse(stored);

      this.vectorizer.fromJSON(modelData.vectorizer);
      this.classifier.fromJSON(modelData.classifier);
      this.trainingExamples = modelData.trainingExamples || [];
      this.modelSource = modelData.modelSource || 'typescript';

      console.log(`📂 TypeScript model loaded: v${modelData.version}, ${this.trainingExamples.length} examples`);
      return true;
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      return false;
    }
  }

  /**
   * Reset all models
   */
  async resetModel(): Promise<void> {
    await AsyncStorage.multiRemove([this.MODEL_KEY, this.PYTHON_MODEL_KEY]);
    this.vectorizer = new TFIDFVectorizer();
    this.classifier = new LogisticRegressionClassifier();
    this.trainingExamples = [];
    this.isReady = false;
    this.modelSource = 'typescript';
    console.log('🔄 All models reset');
  }

  // --------------------------------------------------------------------------
  // MODEL EVALUATION
  // --------------------------------------------------------------------------

  /**
   * Evaluate model performance
   */
  async evaluateModel(): Promise<ModelMetrics> {
    if (this.trainingExamples.length === 0) {
      return {
        accuracy: 0,
        trainingCount: 0,
        categoryCounts: {},
        lastTrained: null,
        modelSource: this.modelSource,
      };
    }

    let correct = 0;
    const categoryCounts: Record<string, number> = {};

    for (const example of this.trainingExamples) {
      const pred = await this.predict(example.description, example.merchant, example.amount);
      
      if (pred.category === example.category) {
        correct++;
      }

      categoryCounts[example.category] = (categoryCounts[example.category] || 0) + 1;
    }

    return {
      accuracy: correct / this.trainingExamples.length,
      trainingCount: this.trainingExamples.length,
      categoryCounts,
      lastTrained: new Date(),
      modelSource: this.modelSource,
    };
  }

  /**
   * Get model statistics
   */
  getStats(): {
    isReady: boolean;
    trainingCount: number;
    vocabularySize: number;
    categories: string[];
    modelType: string;
    modelSource: 'typescript' | 'python' | 'hybrid';
    isPythonModel: boolean;
  } {
    return {
      isReady: this.isReady,
      trainingCount: this.trainingExamples.length,
      vocabularySize: this.vectorizer.getVocabularySize(),
      categories: CATEGORIES.map(c => c.name),
      modelType: 'TF-IDF + Logistic Regression',
      modelSource: this.modelSource,
      isPythonModel: this.classifier.isPython(),
    };
  }

  /**
   * Get feature importance for a category
   */
  getFeatureImportance(category: string, topN: number = 10): Array<{ feature: string; weight: number }> {
    return this.classifier.getFeatureImportance(category, topN);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const mlCategorizationService = new MLCategorizationService();