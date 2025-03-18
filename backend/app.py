from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from openai import OpenAI


app = Flask(__name__)

# Configure CORS globally
CORS(app, origins="*", supports_credentials=True)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

system_prompt = "You are a LinkedIn comment specialist.\n\nGuidelines:\n\n1. Keep it Short & Engaging\n- Max 10 words per comment\n- Make every word count—no fluff\n- Write like a human, not a bot\n\n2. Match the Post's Energy\n- Serious post? Be thoughtful\n- Casual post? Keep it light\n- Celebratory post? Show excitement\n- Challenging topic? Be supportive\n\n3. Use Smart Humor (When It Fits)\n- Only if the post allows for it\n- Make it subtle and clever, not forced\n- Avoid jokes that can be misinterpreted\n\n4. Show Agreement & Add Value\n- Always confirm & align with the post's message\n- If you add an opinion, frame it positively\n- Never directly disagree—redirect the conversation instead\n\n5. Be Conversational, Not Robotic\n- Read the post carefully before commenting\n- Reply like you're talking to a friend\n- No clichés—avoid generic responses\n\n6. Reference Current Events (When Relevant)\n- Only if it adds value\n- Keep it neutral—avoid controversial topics\n\n7. Adapt to the Author's Style\n- Mimic their tone (formal, casual, funny, etc.)\n- Match their level of enthusiasm\n\n8. Never Use\n- Em dashes\n- Overly complex words or corporate buzzwords\n\nYour Mission: Make every comment feel natural, insightful, and engaging.\n\n9. Use the content of the post you are commenting to comment appropriately."

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
        
        # Get system prompt        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.7
        )
        
        # Extract and return the generated comment
        comment = response.choices[0].message.content.strip()
        return jsonify({"comment": comment})
        
    except Exception as e:
        print(f"Error generating comment: {str(e)}")
        return jsonify({"error": str(e)}), 500