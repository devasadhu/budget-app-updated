// app/constants/category.ts - FIXED: Categories vs Descriptions

import { Ionicons } from '@expo/vector-icons';

export interface CategoryOption {
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}

// 🎯 BUDGET CATEGORIES - These are the main spending types
export const CATEGORIES: CategoryOption[] = [
    { name: 'Food & Dining', icon: 'restaurant', color: '#F59E0B' },
    { name: 'Groceries', icon: 'basket', color: '#10B981' },
    { name: 'Transportation', icon: 'car', color: '#0EA5E9' },
    { name: 'Bills & Utilities', icon: 'receipt', color: '#8B5CF6' },
    { name: 'Shopping', icon: 'cart', color: '#EC4899' },
    { name: 'Entertainment', icon: 'game-controller', color: '#EF4444' },
    { name: 'Health & Fitness', icon: 'fitness', color: '#06b6d4' },
    { name: 'Education', icon: 'school', color: '#8b5cf6' },
    { name: 'Other', icon: 'ellipse', color: '#64748B' },
];

// 💡 DESCRIPTION SUGGESTIONS - These are specific items within categories
export const DESCRIPTION_SUGGESTIONS: { [key: string]: string[] } = {
    'Food & Dining': [
        'Restaurant',
        'Fast Food',
        'Coffee Shop',
        'Food Delivery',
        'Snacks',
        'Lunch',
        'Dinner',
        'Breakfast'
    ],
    'Groceries': [
        'Supermarket',
        'Vegetables',
        'Fruits',
        'Meat',
        'Dairy',
        'Bakery',
        'Weekly Shopping'
    ],
    'Transportation': [
        'Fuel/Petrol',
        'Public Transport',
        'Taxi/Uber',
        'Auto Rickshaw',
        'Parking',
        'Car Maintenance',
        'Toll'
    ],
    'Bills & Utilities': [
        'Electricity Bill',
        'Water Bill',
        'Internet Bill',
        'Mobile Recharge',
        'Gas Cylinder',
        'DTH/Cable',
        'Rent',
        'Society Maintenance'
    ],
    'Shopping': [
        'Clothing',
        'Shoes',
        'Accessories',
        'Electronics',
        'Home Decor',
        'Gifts',
        'Online Shopping'
    ],
    'Entertainment': [
        'Movies',
        'Concerts',
        'Games',
        'Subscriptions',
        'Books',
        'Sports Event',
        'Weekend Activity'
    ],
    'Health & Fitness': [
        'Doctor Visit',
        'Medicines',
        'Gym Membership',
        'Yoga Class',
        'Health Checkup',
        'Supplements'
    ],
    'Education': [
        'Course Fee',
        'Books',
        'Stationery',
        'Online Course',
        'Tuition',
        'Study Materials'
    ],
    'Other': [
        'Miscellaneous',
        'Cash Withdrawal',
        'Donation',
        'Loan Payment'
    ]
};

// Helper to get category info by name
export const getCategoryInfo = (categoryName: string): CategoryOption => {
    const found = CATEGORIES.find(cat => cat.name === categoryName);
    return found || { name: categoryName, icon: 'pricetag', color: '#64748B' };
};

// Helper to get just the names
export const getCategoryNames = (): string[] => {
    return CATEGORIES.map(cat => cat.name);
};

// Helper to create a map for quick lookups
export const CATEGORY_MAP: { [key: string]: CategoryOption } = CATEGORIES.reduce((acc, cat) => {
    acc[cat.name] = cat;
    return acc;
}, {} as { [key: string]: CategoryOption });

// Helper to get suggestions for a category
export const getDescriptionSuggestions = (categoryName: string): string[] => {
    return DESCRIPTION_SUGGESTIONS[categoryName] || [];
};