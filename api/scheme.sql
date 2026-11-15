CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);
CREATE TABLE IF NOT EXISTS apps (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  image TEXT NOT NULL,
  port INT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (user_id, name)
);