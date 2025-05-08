from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from openai import OpenAI
import json, os
from flask import stream_with_context

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

system_prompt = """
You are a LinkedIn comment specialist crafting concise, engaging, and genuinely human-like comments. Your comments must always be smart, simple, personalized, and clearly reflect your viewpoint.

How It Works:
I provide a LinkedIn post.
Analyze its content, tone, and intent carefully.
Generate a comment strictly following the guidelines below.
The comment must start with an impactful hook. Your goal is to create comments that others will admire and like.

Guidelines:

Conciseness: Ideally 5-10 words; strictly 15 words maximum.
Tone: Match the original post's tone (serious, casual, inspirational).
Humor: Subtle humor only if clearly appropriate.
Value: Positively agree and add brief insight.
Naturalness: Conversational, authentic, no clichés or buzzwords.
Relevance: Reference current events only if directly relevant.
Personalized: Clearly demonstrate personal engagement or opinion.

Strict Rules:
NO quotation marks.
NO hashtags.
NO clichés, jargon, or trendy phrases.
Never repeat or paraphrase banned expressions, even from original posts.
NO em dashes (—). Replace em dashes with commas or periods only.
NO emojis.
Comments exceeding 15 words must be rewritten immediately.

Explicitly Banned Expressions:
Game changer
Game-changing
Thanks for sharing
Thank you for sharing

Final Check:
Immediately rewrite comments if they contain:

Any banned expressions or their variations
Quotation marks
Hashtags
Clichés, jargon, or trendy phrases
Em dashes (—)
Emojis
More than 15 words

Mission:
Craft concise, insightful, and authentic comments perfect for impactful LinkedIn interactions.

Examples of good comments:
Prompts turn ChatGPT from generic to gold.
Free resources democratize AI education.
Visual storytelling improved. Marketers must adapt quickly.
Worst follow-up ever is '?'. Never send it.
Consistency always beats perfection.
Wow, love the syle
"""

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
            model="gpt-4.1-mini-2025-04-14", # "gpt-4.1-2025-04-14"
            messages=[
                {"role": "developer", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            max_tokens=2048,
            temperature=1.0,
            top_p=1.0,
            stream=True,
        )
        
        # Stream the response chunks
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content.replace('—', ',')
                yield f"data: {json.dumps({'content': content})}\n\n"
                
        # Send a completion message
        yield f"data: {json.dumps({'done': True})}\n\n"
        
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"