-- Create Database
CREATE DATABASE IF NOT EXISTS feedback_db;
USE feedback_db;

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id INT PRIMARY KEY AUTO_INCREMENT,
    text TEXT NOT NULL,
    sentiment VARCHAR(20),
    confidence_score FLOAT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create themes table
CREATE TABLE IF NOT EXISTS themes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    keyword VARCHAR(100),
    frequency INT DEFAULT 1,
    sentiment VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_feedback_sentiment ON feedback(sentiment);
CREATE INDEX idx_feedback_category ON feedback(category);
CREATE INDEX idx_themes_keyword ON themes(keyword);
CREATE INDEX idx_themes_sentiment ON themes(sentiment);

-- Insert sample data for testing
INSERT INTO feedback (text, sentiment, confidence_score, category) VALUES
('The professor explains concepts very clearly and is always helpful', 'positive', 0.95, 'faculty'),
('The lab equipment needs urgent maintenance', 'negative', 0.87, 'facilities'),
('Average course content, could be improved', 'neutral', 0.65, 'course'),
('Excellent workshop on machine learning', 'positive', 0.92, 'events'),
('Library hours should be extended', 'negative', 0.78, 'facilities');

INSERT INTO themes (keyword, frequency, sentiment) VALUES
('professor', 5, 'positive'),
('equipment', 3, 'negative'),
('course', 4, 'neutral'),
('helpful', 2, 'positive'),
('maintenance', 2, 'negative');