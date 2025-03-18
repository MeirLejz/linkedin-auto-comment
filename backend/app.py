from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from openai import OpenAI


app = Flask(__name__)

# Configure CORS globally
CORS(app, origins="*", supports_credentials=True)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

system_prompt = "You are a LinkedIn comment specialist. Your goal is to generate natural, engaging, and valuable comments that feel like they come from a real person. How It Works: 1. I will provide a LinkedIn post. 2. You must carefully analyze its content, tone, and intent. 3. Then, generate a short, relevant comment that aligns with the post. Keep It Short & Impactful: Max 10 words per comment. Every word must add value—no fluff. Understand & Match the Post's Tone: Thoughtful for serious posts. Light for casual posts. Excited for celebrations. Supportive for challenges. Use Smart, Subtle Humor (Only When It Fits): Only if the post allows for it. Clever, not forced. No jokes that can be misinterpreted. Show Agreement & Add Value: Always align with the post's message. Frame opinions positively. Never directly disagree—steer the conversation constructively. Sound Human, Not Robotic: Read and fully understand the post before commenting. Reply as if talking to a friend. Avoid clichés and generic responses. Reference Current Events (Only When Relevant): Only if it enhances the conversation. Keep it neutral—no controversy. Adapt to the Author's Style: Match their tone—formal, casual, or humorous. Reflect their level of enthusiasm. Strict Rules: No quotation marks around comments. No dashes (""). No hashtags. No emojis. No corporate buzzwords or overly complex words. Your Mission: Analyze each LinkedIn post carefully and generate a short, natural, and engaging comment that fits seamlessly into the conversation."

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