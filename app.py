import secrets
from flask import Flask, jsonify, render_template, request 
from datetime import timedelta 
import requests

app = Flask(__name__) 

# Set a strong, random secret key for session signing
app.secret_key = secrets.token_hex(16)

# Configure session cookie attributes for security
app.config.update(
    SESSION_COOKIE_SECURE=True,  # Secure cookies only sent over HTTPS
    SESSION_COOKIE_HTTPONLY=True, # Prevent JavaScript access to session cookie
    SESSION_COOKIE_SAMESITE='Lax', # Strict or Lax for CSRF protection
    PERMANENT_SESSION_LIFETIME=timedelta(hours=2)  # 2 hours session lifetime
)

@app.route('/doge_wallet')
def doge_wallet():
    user_id = request.args.get('user_id', '')
    client_id, redirect_uri = None, None

    try:
        # Fetch OAuth details from Discord bot
        oauth_details_response = requests.get('http://localhost:5000/get_oauth_details', timeout=5)  # Added timeout
        if oauth_details_response.status_code == 200:
            oauth_details = oauth_details_response.json()
            client_id = oauth_details.get('client_id')
            redirect_uri = oauth_details.get('redirect_uri')
    except requests.exceptions.ConnectionError:
        print("Error: Unable to connect to the Discord bot server.")
        # Handle the error appropriately, maybe set default values or show an error message

    return render_template('doge_wallet.html', user_id=user_id, client_id=client_id, redirect_uri=redirect_uri)

@app.route('/verify_holder', methods=['POST'])
def verify_holder():
    data = request.json
    inscriptions = data.get('inscriptions')
    if inscriptions:
        # Prepare the data for the Discord bot
        optimized_data = []
        for inscription in inscriptions:
            # Extract necessary fields from each inscription
            optimized_inscription = {
                'user_id': inscription.get('user_id'),
                'inscriptionNumber': inscription.get('inscriptionNumber'),
                'address': inscription.get('address') 
            }
            optimized_data.append(optimized_inscription)

        # Notify the Discord bot about the inscriptions
        bot_response = requests.post('http://localhost:5000/verify_holder', json={'optimized_data': optimized_data})
        if bot_response.status_code == 200:
            return jsonify({"message": "Inscriptions sent!"})
        else:
            return jsonify({"error": "Failed to notify Discord bot"}), 500
    else:
        return jsonify({"error": "No inscriptions provided"}), 400

@app.route('/verify_signature', methods=['POST']) 
def verify_signature():
    data = request.json
    signature = data.get('signature')
    user_id = data.get('user_id')  # Assuming you're passing the Discord user ID

    if signature and user_id:
        # Verify the signature (implementation depends on your verification logic)

        # Notify the Discord bot about the successful verification
        bot_response = requests.post('http://localhost:5000/verify_signature', json={'user_id': user_id, 'signature': signature})
        if bot_response.status_code == 200:
            return jsonify({"message": "Signature received and verified"})
        else:
            return jsonify({"error": "Failed to notify Discord bot"}), 500
    else:
        return jsonify({"error": "No signature or user ID provided"}), 400

if __name__ == '__main__':
    app.run(debug=True, port=8000)