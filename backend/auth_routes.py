from flask import request, jsonify
import sqlite3
import uuid
from datetime import datetime
from auth_helpers import hash_password, store_auth_token, validate_auth_token
from app import app

def register_user():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    # Hash the password
    password_hash, salt = hash_password(password)
    
    try:
        conn = sqlite3.connect('usage.db')
        c = conn.cursor()
        
        # Check if email already exists
        c.execute("SELECT id FROM users WHERE email = ?", (email,))
        if c.fetchone():
            conn.close()
            return jsonify({"error": "Email already registered"}), 409
        
        # Generate user ID
        user_id = str(uuid.uuid4())
        
        # Insert new user
        c.execute(
            "INSERT INTO users (id, email, password_hash, salt, subscription_status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (user_id, email, password_hash, salt, "trial", datetime.now())
        )
        
        conn.commit()
        
        # Generate auth token
        token = store_auth_token(user_id)
        
        conn.close()
        
        return jsonify({
            "message": "Registration successful",
            "userId": user_id,
            "authToken": token
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login_user():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    try:
        conn = sqlite3.connect('usage.db')
        c = conn.cursor()
        
        # Get user by email
        c.execute("SELECT id, password_hash, salt, subscription_status FROM users WHERE email = ?", (email,))
        user = c.fetchone()
        
        if not user:
            conn.close()
            return jsonify({"error": "Invalid credentials"}), 401
        
        user_id, stored_hash, salt, subscription_status = user
        
        # Verify password
        calculated_hash, _ = hash_password(password, salt)
        
        if calculated_hash != stored_hash:
            conn.close()
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Generate auth token
        token = store_auth_token(user_id)
        
        conn.close()
        
        return jsonify({
            "message": "Login successful",
            "userId": user_id,
            "authToken": token,
            "subscriptionStatus": subscription_status
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/auth/verify', methods=['GET'])
def verify_token():
    auth_header = request.headers.get('Authorization')
    
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({"error": "Unauthorized"}), 401
    
    token = auth_header.split(' ')[1]
    user_id = validate_auth_token(token)
    
    if not user_id:
        return jsonify({"error": "Invalid or expired token"}), 401
    
    conn = sqlite3.connect('usage.db')
    c = conn.cursor()
    
    c.execute("SELECT email, subscription_status FROM users WHERE id = ?", (user_id,))
    user = c.fetchone()
    conn.close()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    email, subscription_status = user
    
    return jsonify({
        "userId": user_id,
        "email": email,
        "subscriptionStatus": subscription_status,
        "isValid": True
    })