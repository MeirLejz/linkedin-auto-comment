from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from openai import OpenAI
import json, os
from flask import stream_with_context
import requests
import time

IS_DEVELOPMENT = False

app = Flask(__name__)

# Configure CORS globally
CORS(app, origins="*", supports_credentials=True)

if IS_DEVELOPMENT:
    # Load API key from .env file
    from dotenv import load_dotenv
    load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SUPABASE_PROJECT_ID = "hzhuqrztsisuwjilobiv"
PROMPT_FILENAME = "free_tier.txt"
PROMPT_URL = f"https://{SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/prompts//{PROMPT_FILENAME}"
PROMPT_CACHE_TTL = 10 * 30 # 10 minutes
_system_prompt_cache = None
_system_prompt_cache_time = 0

def get_system_prompt():
    """
    Fetch the system prompt from remote storage, using a 15-minute cache.
    Cache is reset on backend restart (e.g., redeploy).
    """
    global _system_prompt_cache, _system_prompt_cache_time
    now = time.time()
    if _system_prompt_cache is not None and (now - _system_prompt_cache_time) < PROMPT_CACHE_TTL:
        return _system_prompt_cache
    try:
        response = requests.get(PROMPT_URL)
        if response.status_code == 200:
            _system_prompt_cache = response.text
            _system_prompt_cache_time = now
            print("System prompt downloaded and cached!")
            return _system_prompt_cache
        else:
            print(f"Failed to download system prompt. Status code: {response.status_code}")
            return _system_prompt_cache
    except Exception as e:
        print(f"Error downloading system prompt: {e}")
        return _system_prompt_cache

@app.route('/generate-comment', methods=['POST'])
def generate_comment():
    try:
        # Get request data
        data = request.json
        post_content = data.get('post_content')
        
        if not post_content:
            return jsonify({"error": "Post content is required"}), 400
            
        # Get prompt
        prompt = f'Write a comment for the following post: "{post_content}"'
        
        # Return streaming response
        return Response(stream_with_context(generate_comment_stream(prompt)), 
                       content_type='text/event-stream')
        
    except Exception as e:
        print(f"Error generating comment: {str(e)}")
        return jsonify({"error": str(e)}), 500

def generate_comment_stream(prompt):
    """Generate a streaming response for comment generation"""
    try:
        system_prompt = get_system_prompt()
        # Call OpenAI API with streaming enabled
        stream = client.chat.completions.create(
            messages=[
                {"role": "developer", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            model="gpt-4.1-mini-2025-04-14",
            max_tokens=2048,
            temperature=2.0,
            top_p=1.0,
            stream=True,
        )
        
        # Stream the response chunks
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content.replace('—', ', ')
                yield f"data: {json.dumps({'content': content})}\n\n"
                
        # Send a completion message
        yield f"data: {json.dumps({'done': True})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"