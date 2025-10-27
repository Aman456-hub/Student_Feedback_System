import openai
import os
import re
from textblob import TextBlob
from collections import Counter
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class SentimentAnalyzer:
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.stop_words = set(stopwords.words('english'))
    
    def analyze_sentiment_openai(self, text):
        """Use OpenAI API for sentiment analysis"""
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a sentiment analysis expert. Analyze the sentiment of student feedback and respond with only: POSITIVE, NEGATIVE, or NEUTRAL followed by a confidence score (0.0-1.0). Format: SENTIMENT|CONFIDENCE_SCORE"
                    },
                    {
                        "role": "user",
                        "content": f"Analyze this student feedback: {text}"
                    }
                ],
                max_tokens=20,
                temperature=0
            )
            
            result = response.choices[0].message.content.strip()
            parts = result.split('|')
            sentiment = parts[0].strip()
            confidence = float(parts[1].strip()) if len(parts) > 1 else 0.8
            
            return sentiment.lower(), confidence
            
        except Exception as e:
            print(f"OpenAI API Error: {e}")
            # Fallback to TextBlob
            return self.analyze_sentiment_textblob(text)
    
    def analyze_sentiment_textblob(self, text):
        """Fallback sentiment analysis using TextBlob"""
        blob = TextBlob(text)
        polarity = blob.sentiment.polarity
        
        if polarity > 0.1:
            sentiment = "positive"
        elif polarity < -0.1:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        confidence = abs(polarity) if abs(polarity) > 0.3 else 0.6
        return sentiment, min(confidence, 1.0)
    
    def extract_keywords(self, text):
        """Extract important keywords from text"""
        # Clean and tokenize text
        text = re.sub(r'[^a-zA-Z\s]', '', text.lower())
        tokens = word_tokenize(text)
        
        # Remove stopwords and short words
        keywords = [word for word in tokens 
                   if word not in self.stop_words and len(word) > 2]
        
        # Count frequency
        keyword_freq = Counter(keywords)
        return dict(keyword_freq.most_common(10))
    
    def categorize_feedback(self, text):
        """Categorize feedback into course, faculty, facilities, events"""
        text_lower = text.lower()
        
        course_keywords = ['course', 'subject', 'curriculum', 'syllabus', 'assignment', 'exam', 'test']
        faculty_keywords = ['teacher', 'professor', 'instructor', 'faculty', 'teaching']
        facility_keywords = ['facility', 'building', 'lab', 'library', 'classroom', 'infrastructure']
        event_keywords = ['event', 'program', 'seminar', 'workshop', 'conference', 'activity']
        
        course_score = sum(1 for keyword in course_keywords if keyword in text_lower)
        faculty_score = sum(1 for keyword in faculty_keywords if keyword in text_lower)
        facility_score = sum(1 for keyword in facility_keywords if keyword in text_lower)
        event_score = sum(1 for keyword in event_keywords if keyword in text_lower)
        
        scores = {
            'course': course_score,
            'faculty': faculty_score,
            'facilities': facility_score,
            'events': event_score
        }
        
        return max(scores, key=scores.get) if max(scores.values()) > 0 else 'general'