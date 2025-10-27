from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import pandas as pd
import json
from io import StringIO

from models import get_db, create_tables, Feedback, Theme
from sentiment_service import SentimentAnalyzer

# Create tables on startup
create_tables()

app = FastAPI(title="Student Feedback Sentiment Analysis API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize sentiment analyzer
analyzer = SentimentAnalyzer()

# Pydantic models for request/response
from pydantic import BaseModel

class FeedbackRequest(BaseModel):
    text: str
    category: str = "general"

class FeedbackResponse(BaseModel):
    id: int
    text: str
    sentiment: str
    confidence_score: float
    category: str

class AnalyticsResponse(BaseModel):
    total_feedback: int
    positive_count: int
    negative_count: int
    neutral_count: int
    positive_percentage: float
    negative_percentage: float
    neutral_percentage: float

@app.get("/")
def read_root():
    return {"message": "Student Feedback Sentiment Analysis API"}

@app.post("/api/feedback", response_model=FeedbackResponse)
def submit_feedback(feedback: FeedbackRequest, db: Session = Depends(get_db)):
    """Submit single feedback for analysis"""
    try:
        # Analyze sentiment
        sentiment, confidence = analyzer.analyze_sentiment_openai(feedback.text)
        
        # Categorize if not provided
        category = feedback.category
        if category == "general":
            category = analyzer.categorize_feedback(feedback.text)
        
        # Save to database
        db_feedback = Feedback(
            text=feedback.text,
            sentiment=sentiment,
            confidence_score=confidence,
            category=category
        )
        
        db.add(db_feedback)
        db.commit()
        db.refresh(db_feedback)
        
        # Extract and save keywords
        keywords = analyzer.extract_keywords(feedback.text)
        for keyword, freq in keywords.items():
            # Check if keyword already exists
            existing_theme = db.query(Theme).filter(
                Theme.keyword == keyword,
                Theme.sentiment == sentiment
            ).first()
            
            if existing_theme:
                existing_theme.frequency += freq
            else:
                new_theme = Theme(
                    keyword=keyword,
                    frequency=freq,
                    sentiment=sentiment
                )
                db.add(new_theme)
        
        db.commit()
        
        return FeedbackResponse(
            id=db_feedback.id,
            text=db_feedback.text,
            sentiment=db_feedback.sentiment,
            confidence_score=db_feedback.confidence_score,
            category=db_feedback.category
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# COPY AND PASTE THIS ENTIRE FUNCTION INTO YOUR main.py FILE

@app.post("/api/feedback/bulk")
def upload_bulk_feedback(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload and process bulk feedback from CSV/Excel"""
    try:
        # Read file
        contents = file.file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(StringIO(contents.decode('utf-8')))
        elif file.filename.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(contents)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Validate required columns
        if 'text' not in df.columns:
            raise HTTPException(status_code=400, detail="CSV must contain 'text' column")
        
        results = []
        
        for index, row in df.iterrows():
            text = str(row['text']) # Ensure text is a string
            if not text or pd.isna(text):
                continue # Skip empty rows

            category = row.get('category', 'general')
            
            # Analyze sentiment
            sentiment, confidence = analyzer.analyze_sentiment_openai(text)
            
            # Categorize
            if category == 'general':
                category = analyzer.categorize_feedback(text)
            
            # Save to database
            db_feedback = Feedback(
                text=text,
                sentiment=sentiment,
                confidence_score=confidence,
                category=category
            )
            
            db.add(db_feedback)
            
            results.append({
                'text': text,
                'sentiment': sentiment,
                'confidence': confidence,
                'category': category
            })
            
            # Extract keywords
            keywords = analyzer.extract_keywords(text)
            for keyword, freq in keywords.items():
                existing_theme = db.query(Theme).filter(
                    Theme.keyword == keyword,
                    Theme.sentiment == sentiment
                ).first()
                
                if existing_theme:
                    existing_theme.frequency += freq
                else:
                    new_theme = Theme(
                        keyword=keyword,
                        frequency=freq,
                        sentiment=sentiment
                    )
                    db.add(new_theme)
        
        db.commit()
        
        return {
            "message": f"Successfully processed {len(results)} feedback entries",
            "results": results
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()  # <-- THIS NEW LINE WILL PRINT THE REAL ERROR
        raise HTTPException(status_code=500, detail="An internal server error occurred. Check server logs.")

@app.get("/api/analytics", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    """Get sentiment analytics summary"""
    try:
        # Get total count
        total = db.query(Feedback).count()
        
        if total == 0:
            return AnalyticsResponse(
                total_feedback=0,
                positive_count=0,
                negative_count=0,
                neutral_count=0,
                positive_percentage=0.0,
                negative_percentage=0.0,
                neutral_percentage=0.0
            )
        
        # Get counts by sentiment
        positive_count = db.query(Feedback).filter(Feedback.sentiment == 'positive').count()
        negative_count = db.query(Feedback).filter(Feedback.sentiment == 'negative').count()
        neutral_count = db.query(Feedback).filter(Feedback.sentiment == 'neutral').count()
        
        return AnalyticsResponse(
            total_feedback=total,
            positive_count=positive_count,
            negative_count=negative_count,
            neutral_count=neutral_count,
            positive_percentage=round((positive_count / total) * 100, 2),
            negative_percentage=round((negative_count / total) * 100, 2),
            neutral_percentage=round((neutral_count / total) * 100, 2)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/themes")
def get_themes(db: Session = Depends(get_db)):
    """Get common themes and keywords"""
    try:
        themes = db.query(Theme).order_by(Theme.frequency.desc()).limit(20).all()
        
        return {
            "themes": [
                {
                    "keyword": theme.keyword,
                    "frequency": theme.frequency,
                    "sentiment": theme.sentiment
                }
                for theme in themes
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/feedback/category/{category}")
def get_feedback_by_category(category: str, db: Session = Depends(get_db)):
    """Get feedback analytics by category"""
    try:
        feedback_list = db.query(Feedback).filter(Feedback.category == category).all()
        
        if not feedback_list:
            return {"message": f"No feedback found for category: {category}"}
        
        total = len(feedback_list)
        positive = sum(1 for f in feedback_list if f.sentiment == 'positive')
        negative = sum(1 for f in feedback_list if f.sentiment == 'negative')
        neutral = sum(1 for f in feedback_list if f.sentiment == 'neutral')
        
        return {
            "category": category,
            "total_feedback": total,
            "positive_count": positive,
            "negative_count": negative,
            "neutral_count": neutral,
            "positive_percentage": round((positive / total) * 100, 2),
            "negative_percentage": round((negative / total) * 100, 2),
            "neutral_percentage": round((neutral / total) * 100, 2)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
