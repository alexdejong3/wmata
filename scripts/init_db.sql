-- Example Postgres initialization script
-- Creates a sample table for demonstration

CREATE TABLE IF NOT EXISTS metro_station (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    line VARCHAR(10) NOT NULL
);

-- Insert example data
INSERT INTO metro_station (code, name, line) VALUES
    ('A01', 'Metro Center', 'RD'),
    ('B03', 'Union Station', 'RD'),
    ('C01', 'Gallery Place', 'YL');

