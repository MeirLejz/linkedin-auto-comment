import hashlib
import secrets
import datetime
import uuid
from datetime import datetime, timedelta
import sqlite3

# Password hashing function
def hash_password(password, salt=None):
    if salt is None:
        salt = secrets.token_hex(16)
    
    # Combine password and salt, then hash
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    return password_hash, salt

# Generate authentication token
def generate_auth_token():
    return secrets.token_hex(32)

# Store authentication token in database
def store_auth_token(user_id):
    token = generate_auth_token()
    expires_at = datetime.now() + timedelta(days=30)
    
    conn = sqlite3.connect('usage.db')
    c = conn.cursor()
    
    c.execute(
        "INSERT INTO auth_tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token, user_id, datetime.now(), expires_at)
    )
    
    conn.commit()
    conn.close()
    
    return token

# Validate authentication token
def validate_auth_token(token):
    conn = sqlite3.connect('usage.db')
    c = conn.cursor()
    
    c.execute(
        "SELECT user_id, expires_at FROM auth_tokens WHERE token = ?", 
        (token,)
    )
    
    result = c.fetchone()
    conn.close()
    
    if not result:
        return None
    
    user_id, expires_at = result
    expires_at = datetime.strptime(expires_at, '%Y-%m-%d %H:%M:%S.%f')
    
    if expires_at < datetime.now():
        return None
        
    return user_id