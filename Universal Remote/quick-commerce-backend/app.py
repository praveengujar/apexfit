import os
import json
from flask import Flask, request, jsonify
from google.cloud import dialogflowcx_v3beta1 as dialogflow
from google.cloud import firestore
from google.cloud import secretmanager
from google.cloud import pubsub_v1
import requests

app = Flask(__name__)

# Configuration
PROJECT_ID = os.environ.get('GCP_PROJECT')
LOCATION_ID = os.environ.get('LOCATION_ID', 'asia-south1')
DIALOGFLOW_AGENT_ID = os.environ.get('DIALOGFLOW_AGENT_ID', 'YOUR_DIALOGFLOW_AGENT_ID')
WHATSAPP_CLOUD_API_URL = os.environ.get('WHATSAPP_CLOUD_API_URL', 'https://graph.facebook.com/v19.0/YOUR_PHONE_NUMBER_ID/messages')
WHATSAPP_ACCESS_TOKEN_SECRET_ID = os.environ.get('WHATSAPP_ACCESS_TOKEN_SECRET_ID', 'whatsapp-access-token')

# Clients
df_client = dialogflow.AgentsClient()
firestore_client = firestore.Client(project=PROJECT_ID)
secret_client = secretmanager.SecretManagerServiceClient()
pubsub_subscriber = pubsub_v1.SubscriberClient()

# Pub/Sub subscription
WHATSAPP_INCOMING_SUB_ID = 'whatsapp-incoming-messages-sub'
whatsapp_incoming_sub_path = pubsub_subscriber.subscription_path(PROJECT_ID, WHATSAPP_INCOMING_SUB_ID)

def get_secret(secret_id):
    """Retrieves a secret from Google Cloud Secret Manager."""
    name = f"projects/{PROJECT_ID}/secrets/{secret_id}/versions/latest"
    response = secret_client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

def send_whatsapp_message(to_number, message_text):
    """Sends a text message via WhatsApp Cloud API."""
    try:
        whatsapp_access_token = get_secret(WHATSAPP_ACCESS_TOKEN_SECRET_ID)
        headers = {
            'Authorization': f'Bearer {whatsapp_access_token}',
            'Content-Type': 'application/json'
        }
        payload = {
            'messaging_product': 'whatsapp',
            'to': to_number,
            'type': 'text',
            'text': {'body': message_text}
        }
        response = requests.post(WHATSAPP_CLOUD_API_URL, headers=headers, json=payload)
        response.raise_for_status()
        print(f"WhatsApp message sent to {to_number}: {response.json()}")
        return True
    except Exception as e:
        print(f"Error sending WhatsApp message: {e}")
        return False

def get_user_preferences(user_id):
    """Retrieves user preferences from Firestore."""
    doc_ref = firestore_client.collection('users').document(user_id)
    doc = doc_ref.get()
    if doc.exists:
        return doc.to_dict().get('preferences', {})
    return {}

def update_user_preferences(user_id, preferences):
    """Updates user preferences in Firestore."""
    doc_ref = firestore_client.collection('users').document(user_id)
    doc_ref.set({'preferences': preferences}, merge=True)
    print(f"Updated preferences for user {user_id}: {preferences}")

def query_quick_commerce_platforms(product, quantity, brand=None):
    """
    Mocks querying quick commerce platforms.
    CRITICAL: This is a MOCK implementation for demonstration.
    Real implementation requires official platform APIs or compliant data aggregation.
    """
    print(f"Mocking quick commerce query for: {quantity} {product} (Brand: {brand})")
    
    # Mock data - replace with actual API calls in production
    mock_results = [
        {
            'platform': 'Blinkit',
            'product_id': f'{product}_blinkit_123',
            'price': 52.00,
            'delivery_time': '15 mins',
            'available': True
        },
        {
            'platform': 'Instamart',
            'product_id': f'{product}_instamart_456',
            'price': 48.00,
            'delivery_time': '25 mins',
            'available': True
        },
        {
            'platform': 'Zepto',
            'product_id': f'{product}_zepto_789',
            'price': 55.00,
            'delivery_time': '10 mins',
            'available': False
        }
    ]
    
    # Simple logic to pick the cheapest available option
    available_options = [r for r in mock_results if r['available']]
    if not available_options:
        return None

    best_option = min(available_options, key=lambda x: x['price'])
    return best_option

def place_mock_order(user_id, order_details):
    """
    Mocks placing an order.
    CRITICAL: In production, this requires actual platform integration.
    """
    print(f"Mocking order placement for user {user_id}: {order_details}")
    
    order_id = f"MOCK_ORDER_{os.urandom(4).hex()}"
    order_details['status'] = 'Pending Confirmation'
    order_details['order_id'] = order_id
    
    # Store mock order in Firestore
    firestore_client.collection('orders').add(order_details)
    print(f"Mock order {order_id} placed.")
    return order_id

@app.route('/webhook', methods=['POST'])
def dialogflow_webhook():
    """Dialogflow CX Fulfillment Webhook endpoint."""
    try:
        request_json = request.get_json(silent=True)
        print(f"Dialogflow Webhook Request: {json.dumps(request_json, indent=2)}")

        session_id = request_json['session']
        intent_display_name = request_json['fulfillmentInfo']['tag']
        parameters = request_json['sessionInfo'].get('parameters', {})
        
        # Extract WhatsApp user ID from session or parameters
        whatsapp_user_id = parameters.get('whatsapp_user_id', 'default_user')

        response_text = "I'm sorry, I couldn't process that request."
        
        if intent_display_name == 'OrderGrocery':
            product = parameters.get('product')
            quantity = parameters.get('quantity')
            unit = parameters.get('unit')
            brand = parameters.get('brand')

            # Apply user preferences
            user_prefs = get_user_preferences(whatsapp_user_id)
            if not brand and user_prefs.get('preferred_brand'):
                brand = user_prefs['preferred_brand']
            if not unit and user_prefs.get('preferred_unit'):
                unit = user_prefs['preferred_unit']

            # Query platforms
            best_option = query_quick_commerce_platforms(product, quantity, brand)

            if best_option:
                session_params = {
                    'product': product,
                    'quantity': quantity,
                    'unit': unit,
                    'brand': brand,
                    'platform': best_option['platform'],
                    'price': best_option['price'],
                    'delivery_time': best_option['delivery_time'],
                    'product_id_on_platform': best_option['product_id']
                }
                
                response_text = (
                    f"I found {quantity} {unit} of {product} from {best_option['platform']} "
                    f"for ₹{best_option['price']:.2f} with delivery in {best_option['delivery_time']}. "
                    f"Shall I confirm this order?"
                )
                
                return jsonify({
                    "fulfillment_response": {
                        "messages": [{"text": {"text": [response_text]}}]
                    },
                    "session_info": {"parameters": session_params}
                })
            else:
                response_text = f"Sorry, I couldn't find {product} on any platform right now."
        
        elif intent_display_name == 'ConfirmOrder':
            order_details = {
                'product': parameters.get('product'),
                'quantity': parameters.get('quantity'),
                'unit': parameters.get('unit'),
                'brand': parameters.get('brand'),
                'platform': parameters.get('platform'),
                'price': parameters.get('price'),
                'delivery_time': parameters.get('delivery_time'),
                'user_id': whatsapp_user_id,
                'timestamp': firestore.SERVER_TIMESTAMP
            }

            order_id = place_mock_order(whatsapp_user_id, order_details)
            
            response_text = (
                f"Perfect! Your order for {order_details['quantity']} {order_details['unit']} "
                f"of {order_details['product']} from {order_details['platform']} is confirmed. "
                f"Order ID: {order_id}"
            )
            
            # Send confirmation to WhatsApp
            send_whatsapp_message(whatsapp_user_id, f"Order {order_id} confirmed!")

        elif intent_display_name == 'CancelOrder':
            response_text = "Your order has been cancelled. Anything else I can help with?"
        
        elif intent_display_name == 'ModifyOrder':
            response_text = "What would you like to change about your order?"

        return jsonify({
            "fulfillment_response": {
                "messages": [{"text": {"text": [response_text]}}]
            }
        })

    except Exception as e:
        print(f"Error in Dialogflow webhook: {e}")
        return jsonify({
            "fulfillment_response": {
                "messages": [{"text": {"text": ["Sorry, something went wrong. Please try again."]}}]
            }
        }), 500

@app.route('/pubsub/receive', methods=['POST'])
def pubsub_receiver():
    """Processes WhatsApp messages from Pub/Sub and sends to Dialogflow CX."""
    envelope = request.get_json()
    if not envelope:
        return 'No Pub/Sub message received', 400
    
    try:
        message_data = json.loads(envelope['message']['data'])
        print(f"Processing Pub/Sub message: {json.dumps(message_data, indent=2)}")

        # Parse WhatsApp webhook payload
        if 'entry' in message_data:
            entry = message_data['entry'][0]
            changes = entry['changes'][0]
            message_value = changes['value']
            
            if 'messages' in message_value:
                whatsapp_message = message_value['messages'][0]
                from_number = whatsapp_message['from']
                message_text = whatsapp_message['text']['body']
                
                # Create Dialogflow CX session
                session_client = dialogflow.SessionsClient()
                session_path = session_client.session_path(
                    PROJECT_ID, LOCATION_ID, DIALOGFLOW_AGENT_ID, from_number
                )

                # Detect intent
                text_input = dialogflow.TextInput(text=message_text)
                query_input = dialogflow.QueryInput(text=text_input, language_code='en-US')
                
                query_input.session_info = dialogflow.SessionInfo(
                    parameters={'whatsapp_user_id': from_number}
                )

                response = session_client.detect_intent(
                    request={"session": session_path, "query_input": query_input}
                )

                print(f"Dialogflow CX Response: {response.query_result.fulfillment_response.messages}")
                
                # Send response back to WhatsApp
                if response.query_result.fulfillment_response.messages:
                    response_text = response.query_result.fulfillment_response.messages[0].text.text[0]
                    send_whatsapp_message(from_number, response_text)
                
                return 'OK', 200
            else:
                print("No messages found in WhatsApp webhook payload.")
                return 'OK', 200
                
    except Exception as e:
        print(f"Error processing Pub/Sub message: {e}")
        return 'Error processing message', 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return {'status': 'healthy'}, 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))