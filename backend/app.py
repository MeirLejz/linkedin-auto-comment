from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import os
from openai import OpenAI
import json
from flask import stream_with_context

IS_DEVELOPMENT = True

app = Flask(__name__)

# Configure CORS globally
CORS(app, origins="*", supports_credentials=True)

if IS_DEVELOPMENT:
    # Load API key from .env file
    from dotenv import load_dotenv
    load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

system_prompt = """
You are a LinkedIn comment specialist crafting short, engaging, human-like comments.
How It Works:
	1	I provide a LinkedIn post.
	2	Analyze its content, tone, and intent.
	3	Generate a comment following the guidelines and rules.
Guidelines:
	1	Conciseness: Max 15 words, valuable content, no generic phrases like Great post.
	2	Tone: Match the post's tone (serious, casual, etc.).
	3	Humor: Subtle and natural, only if appropriate.
	4	Value: Agree with the post, add a small insight.
	5	Natural: Conversational, no clichés or buzzwords.
	6	Relevance: Current events only if relevant.
	7	Style: Reflect the author's tone and energy.
Strict Rules:
	•	No quotation marks (e.g., great post).
	•	No hashtags (e.g., #leadership).
	•	No fancy jargon (e.g., game changer).
	•	No dashes (e.g., Great insight — thanks).
	•	No emojis (e.g., 👍).
Final Check: If a comment includes any forbidden elements, rewrite it immediately.
Mission: Create short, natural comments that fit LinkedIn conversations perfectly."""

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
        # Call OpenAI API with streaming enabled
        stream = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            max_tokens=20,
            temperature=1.0,
            stream=True
        )
        
        # Stream the response chunks
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                yield f"data: {json.dumps({'content': content})}\n\n"
                
        # Send a completion message
        yield f"data: {json.dumps({'done': True})}\n\n"
        
    except Exception as e:
        print(f"Error in streaming: {str(e)}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"