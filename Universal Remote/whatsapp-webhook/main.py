import functions_framework
from google.cloud import pubsub_v1
import os
import json

PROJECT_ID = os.environ.get('GCP_PROJECT')
PUBSUB_TOPIC_ID = 'whatsapp-incoming-messages'

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, PUBSUB_TOPIC_ID)

@functions_framework.http
def whatsapp_webhook_receiver(request):
    """
    Receives WhatsApp webhook events and publishes them to Pub/Sub.
    Handles verification requests from Meta.
    """
    if request.method == 'GET':
        # WhatsApp webhook verification
        VERIFY_TOKEN = os.environ.get('VERIFY_TOKEN', 'YOUR_VERIFY_TOKEN')
        mode = request.args.get('hub.mode')
        token = request.args.get('hub.verify_token')
        challenge = request.args.get('hub.challenge')

        if mode and token:
            if mode == 'subscribe' and token == VERIFY_TOKEN:
                print('WEBHOOK_VERIFIED')
                return challenge, 200
            else:
                return 'Forbidden', 403
        return 'OK', 200

    elif request.method == 'POST':
        try:
            data = request.get_json()
            print(f"Received WhatsApp webhook: {json.dumps(data, indent=2)}")

            if data and "entry" in data:
                # Publish the entire webhook payload to Pub/Sub
                future = publisher.publish(topic_path, json.dumps(data).encode('utf-8'))
                future.result()  # Wait for the publish operation to complete
                print(f"Message published to Pub/Sub topic: {PUBSUB_TOPIC_ID}")
            
            return 'OK', 200

        except Exception as e:
            print(f"Error processing webhook: {e}")
            return 'Internal Server Error', 500
    return 'Method Not Allowed', 405