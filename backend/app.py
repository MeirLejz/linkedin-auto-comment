from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
# Enable CORS for Chrome extension
CORS(app)

# Export the app instance
from auth_routes import *

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Load prompts from JSON file
def load_prompts():
    with open('backend/prompts.json', 'r') as file:
        return json.load(file)

# Global prompts variable
PROMPTS = load_prompts()

@app.route('/generate-comment', methods=['POST'])
def generate_comment():
    try:
        # Get request data
        data = request.json
        post_content = data.get('post_content')
        style = data.get('style')
        
        if not post_content:
            return jsonify({"error": "Post content is required"}), 400
            
        # Get the appropriate prompt based on style
        prompt = get_prompt_for_style(style, post_content)
        
        # Get system prompt
        system_prompt = PROMPTS["system"].get("default")
        
        # Call OpenAI API with new client syntax
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        # Extract and return the generated comment using new response structure
        comment = response.choices[0].message.content.strip()
        return jsonify({"comment": comment})
        
    except Exception as e:
        print(f"Error generating comment: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_prompt_for_style(style, post_content):
    """Helper function to get the appropriate prompt based on style"""
    base_prompt = f'Post content: "{post_content}"'
    
    # Get prompt from loaded prompts or use default
    prompt_template = PROMPTS.get(style, PROMPTS.get("default"))
    
    return f"{prompt_template}\n\n{base_prompt}"

if __name__ == '__main__':
    app.run(debug=True)
