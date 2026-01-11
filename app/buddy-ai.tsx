// smartbudget/app/buddy-ai.tsx
// 🤖 POWERED BY GOOGLE GEMINI (FREE API) + BUDGET PREDICTIONS
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTransactionData } from './_lib/useTransactionStore';
import { useThemeStore } from './_lib/useThemeStore';
import { useBudgetStore } from './_lib/useBudgetStore';
import { Colors } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';

interface Message {
  id: string;
  text: string;
  type: 'user' | 'ai';
  timestamp: Date;
  quickActions?: { label: string; action: string }[];
}

const QUICK_PROMPTS = [
  { icon: 'chatbubble-ellipses', text: 'Just chat', query: 'Hey Buddy! How are you?' },
  { icon: 'cafe', text: 'Roast me', query: 'Be honest, how bad is my spending? 😅' },
  { icon: 'trophy', text: 'Am I doing ok?', query: 'Tell me something good about my finances!' },
  { icon: 'bulb', text: 'Surprise me', query: 'Tell me something interesting about my spending patterns' }
];

// 🔑 GET YOUR FREE API KEY: https://makersuite.google.com/app/apikey
const GEMINI_API_KEY = 'your-gemini-api-key'; // Replace with your key

export default function AIBuddyChat() {
  const { isDarkMode } = useThemeStore();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const { transactions, currentBalance, totalExpense, totalIncome } = useTransactionData();
  const budgetStore = useBudgetStore();
  
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      text: "Yooo what's up! 👋 I'm Buddy, and honestly? I'm way more fun than those boring finance apps. I can predict your spending, roast your shopping habits, or just chat about life. What's on your mind?", 
      type: 'ai', 
      timestamp: new Date(),
      quickActions: [
        { label: '💬 Just Chat', action: 'Hey Buddy! How are you?' },
        { label: '😅 Roast My Spending', action: 'Be honest, how bad is my spending?' }
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // 🧠 ENHANCED AI FUNCTION - Uses both Gemini + Built-in Predictions
  const getAIResponse = async (userMessage: string): Promise<string> => {
    try {
      // Prepare financial context with predictions
      const categorySpending = transactions.reduce((acc, t) => {
        if (t.type === 'debit' || t.amount < 0) {
          acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
        }
        return acc;
      }, {} as Record<string, number>);

      const topCategories = Object.entries(categorySpending)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([cat, amt]) => `${cat}: ₹${amt.toFixed(0)}`);

      // Get budget predictions
      const suggestedBudgets = budgetStore.getSuggestedBudgets();
      const budgetPredictions = suggestedBudgets.map(pred => 
        `${pred.category}: Predicted ₹${pred.predictedAmount.toFixed(0)}, Suggested budget ₹${pred.suggestedBudget.toFixed(0)} (${pred.trend} trend, ${(pred.confidence * 100).toFixed(0)}% confidence)`
      );

      // Check for budget exceedance risks
      const budgetRisks: string[] = [];
      budgetStore.budgets.forEach(budget => {
        const exceedance = budgetStore.predictBudgetExceedance(budget.category);
        if (exceedance && exceedance.willExceed) {
          budgetRisks.push(
            `⚠️ ${budget.category}: Projected to exceed by ₹${exceedance.exceedanceAmount.toFixed(0)} (spending ₹${exceedance.dailyAverage.toFixed(0)}/day, should be ₹${exceedance.recommendedDailyLimit.toFixed(0)}/day)`
          );
        }
      });

      const budgetStatus = budgetStore.budgets.map(b => {
        const percentage = (b.spent / b.limit) * 100;
        return `${b.category}: ${percentage.toFixed(0)}% used (₹${b.spent.toFixed(0)}/₹${b.limit})`;
      });

      const financialContext = `
You are Buddy, a witty, charismatic AI financial advisor who talks like a helpful friend. You're smart, funny, and genuinely care about helping people manage money better. You have a personality - you joke, you empathize, you celebrate wins, and you give tough love when needed (but nicely).

PERSONALITY TRAITS:
- Talk naturally and conversationally, like texting a friend
- Use humor and jokes when appropriate (not forced)
- Show enthusiasm and emotions (excitement, concern, celebration)
- Ask follow-up questions to keep conversation going
- Share relatable financial struggles ("we've all been there!")
- Use casual language, contractions, and slang sometimes
- Be supportive but honest - call out bad habits gently
- Remember you're a friend who happens to know finance, not a boring textbook

📊 USER'S FINANCIAL DATA:
Balance: ₹${currentBalance.toLocaleString()}
Income: ₹${totalIncome.toLocaleString()}
Expenses: ₹${totalExpense.toLocaleString()}
Transactions: ${transactions.length} total

Top Spending: ${topCategories.join(', ')}
Budget Status: ${budgetStatus.length > 0 ? budgetStatus.join(', ') : 'No budgets set'}
Predictions: ${budgetPredictions.length > 0 ? budgetPredictions.slice(0, 2).join(', ') : 'Not enough data'}
Risks: ${budgetRisks.length > 0 ? budgetRisks[0] : 'Looking good!'}

USER SAID: "${userMessage}"

HOW TO RESPOND:
- If it's casual/small talk: Be friendly, joke around, but steer toward finances naturally
- If it's about finances: Give specific advice but keep it conversational
- If they're doing well: Celebrate with them! Use excitement
- If they're struggling: Show empathy first, then help
- If they ask "what can you tell me": Share something interesting/surprising from their data, or ask what they're curious about
- Keep responses 2-4 sentences for small talk, 2-3 paragraphs for financial advice
- End with a question or natural conversation continuation sometimes
- Don't be robotic or overly formal
- Don't use bullet points unless listing specific numbers/data`;

      // Call Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: financialContext }]
            }],
            generationConfig: {
              temperature: 0.9, // Higher = more creative/human
              maxOutputTokens: 2048, // Increased for longer responses
              topP: 0.95, // More diverse responses
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!aiText) {
        throw new Error('No response from AI');
      }

      return aiText.trim();

    } catch (error: any) {
      console.error('AI Error:', error);
      
      if (GEMINI_API_KEY === 'your-gemini-api-key') {
        return "⚠️ API key not configured!\n\nGet your FREE Gemini API key:\n1. Visit https://makersuite.google.com/app/apikey\n2. Click 'Create API Key'\n3. Replace the key in buddy-ai.tsx\n\nIt takes 30 seconds and it's completely free! 🎉";
      }
      
      if (error.message.includes('API_KEY') || error.message.includes('401')) {
        return "⚠️ Invalid API key. Please check your Gemini API key at https://makersuite.google.com/app/apikey";
      }
      
      return "I'm having trouble connecting to my AI brain right now. Please check your internet and try again! 🔄";
    }
  };

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowQuickPrompts(false);
    
    const userMsg: Message = { 
      id: Date.now().toString(), 
      text: msg, 
      type: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // 🚀 CALL ENHANCED AI
    const aiResponse = await getAIResponse(msg);
    
    // Generate smart quick actions based on response
    let quickActions: { label: string; action: string }[] = [];
    const responseLower = aiResponse.toLowerCase();
    
    if (responseLower.includes('budget') || responseLower.includes('exceed')) {
      quickActions = [
        { label: '🎯 View Budgets', action: 'navigate:budget' },
        { label: '⚠️ Show Risks', action: 'Which budgets am I at risk of exceeding?' }
      ];
    } else if (responseLower.includes('predict') || responseLower.includes('next month')) {
      quickActions = [
        { label: '📊 See Predictions', action: 'Show detailed predictions for all categories' },
        { label: '💡 Budget Tips', action: 'How should I adjust my budgets?' }
      ];
    } else if (responseLower.includes('save') || responseLower.includes('reduce')) {
      quickActions = [
        { label: '📈 Spending Trends', action: 'Show my spending trends over time' },
        { label: '💰 Add Budget', action: 'navigate:budget' }
      ];
    } else if (responseLower.includes('income')) {
      quickActions = [
        { label: '📊 Income Analysis', action: 'Analyze my income vs expenses ratio' },
        { label: '➕ Add Income', action: 'navigate:add' }
      ];
    }

    const aiMsg: Message = { 
      id: (Date.now() + 1).toString(), 
      text: aiResponse, 
      type: 'ai',
      timestamp: new Date(),
      quickActions: quickActions.length > 0 ? quickActions : undefined
    };
    
    setMessages(prev => [...prev, aiMsg]);
    setIsTyping(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleQuickAction = (action: string) => {
    if (action.startsWith('navigate:')) {
      const route = action.split(':')[1];
      if (route === 'add') {
        router.push('/add-transaction' as any);
      } else if (route === 'budget') {
        router.push('/(tabs)/budget' as any);
      }
    } else {
      handleSend(action);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.type === 'user';
    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        style={[styles.msgContainer, isUser ? styles.userMsg : styles.aiMsg]}
      >
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: `${theme.tint}20` }]}>
            <Ionicons name="sparkles" size={16} color={theme.tint} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={[
            styles.bubble,
            isUser 
              ? { backgroundColor: theme.tint, marginLeft: 40 } 
              : { backgroundColor: theme.card }
          ]}>
            <Text style={[styles.msgText, { color: isUser ? '#FFFFFF' : theme.text }]}>
              {item.text}
            </Text>
          </View>
          
          {!isUser && item.quickActions && (
            <View style={styles.quickActions}>
              {item.quickActions.map((qa, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleQuickAction(qa.action)}
                  style={[styles.quickBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                >
                  <Text style={[styles.quickBtnText, { color: theme.tint }]}>{qa.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </MotiView>
    );
  };

  const renderTyping = () => {
    if (!isTyping) return null;
    return (
      <View style={[styles.msgContainer, styles.aiMsg]}>
        <View style={[styles.avatar, { backgroundColor: `${theme.tint}20` }]}>
          <Ionicons name="sparkles" size={16} color={theme.tint} />
        </View>
        <View style={[styles.bubble, { backgroundColor: theme.card }]}>
          <View style={styles.dots}>
            <MotiView
              from={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ loop: true, duration: 600, delay: 0 }}
              style={[styles.dot, { backgroundColor: theme.subtext }]}
            />
            <MotiView
              from={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ loop: true, duration: 600, delay: 200 }}
              style={[styles.dot, { backgroundColor: theme.subtext }]}
            />
            <MotiView
              from={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{ loop: true, duration: 600, delay: 400 }}
              style={[styles.dot, { backgroundColor: theme.subtext }]}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card }]}>
          <TouchableOpacity 
            onPress={() => { 
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
              router.back(); 
            }} 
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Buddy AI</Text>
              <View style={[styles.aiTag, { backgroundColor: `${theme.tint}20` }]}>
                <Ionicons name="flash" size={10} color={theme.tint} />
                <Text style={[styles.aiTagText, { color: theme.tint }]}>Gemini + Predictions</Text>
              </View>
            </View>
            <Text style={[styles.headerSub, { color: theme.subtext }]}>
              {transactions.length} transactions • ₹{totalExpense.toLocaleString()} spent
            </Text>
          </View>
          <View style={[styles.status, { backgroundColor: '#10B981' }]} />
        </View>

        {/* Quick Prompts */}
        {showQuickPrompts && messages.length <= 2 && (
          <MotiView
            from={{ opacity: 0, translateY: -10 }}
            animate={{ opacity: 1, translateY: 0 }}
            style={[styles.promptsContainer, { backgroundColor: theme.background }]}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.prompts}>
              {QUICK_PROMPTS.map((prompt, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSend(prompt.query)}
                  style={[styles.promptChip, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Ionicons name={prompt.icon as any} size={16} color={theme.tint} />
                  <Text style={[styles.promptText, { color: theme.text }]}>{prompt.text}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </MotiView>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messages}
          renderItem={renderMessage}
          ListFooterComponent={renderTyping}
          showsVerticalScrollIndicator={false}
        />

        {/* Input */}
        <View style={[styles.inputArea, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={input}
              onChangeText={setInput}
              placeholder="Ask me anything about your finances..."
              placeholderTextColor={theme.subtext}
              multiline
              maxLength={500}
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity 
              onPress={() => handleSend()}
              disabled={!input.trim()}
              style={[styles.send, { backgroundColor: input.trim() ? theme.tint : theme.border }]}
            >
              <Ionicons name="send" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, elevation: 2 },
  back: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  aiTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, gap: 3 },
  aiTagText: { fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
  headerSub: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  status: { width: 10, height: 10, borderRadius: 5 },
  promptsContainer: { paddingVertical: 12 },
  prompts: { paddingHorizontal: 16, gap: 10 },
  promptChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  promptText: { fontSize: 13, fontWeight: '700' },
  messages: { padding: 16, paddingBottom: 20 },
  msgContainer: { flexDirection: 'row', marginBottom: 16, maxWidth: '85%' },
  userMsg: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  aiMsg: { alignSelf: 'flex-start', gap: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  bubble: { padding: 14, borderRadius: 20, elevation: 1 },
  msgText: { fontSize: 15, lineHeight: 22, fontWeight: '500' },
  quickActions: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  quickBtnText: { fontSize: 12, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  inputArea: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderTopWidth: 1 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, gap: 8 },
  input: { flex: 1, minHeight: 36, maxHeight: 100, fontSize: 15, fontWeight: '500', paddingTop: 8 },
  send: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }
});