# WhatsApp Quick Commerce AI Agent

An AI-powered WhatsApp bot that processes natural language grocery orders, compares prices across quick commerce platforms, and facilitates order placement through conversational interfaces.

## 🏗️ Architecture Overview

```
WhatsApp User
    ↓
Meta WhatsApp Cloud API
    ↓
Cloud Function (webhook receiver)
    ↓
Pub/Sub Topic (message queue)
    ↓
Cloud Run Service (orchestrator)
    ↓
Dialogflow CX (conversation AI)
    ↓
Cloud Firestore (user data & orders)
    ↓
Quick Commerce Platforms (mock)
```

## 🚀 Features

- **Natural Language Processing**: Understands orders like "get me 2 liters of milk"
- **Multi-Platform Comparison**: Compares prices across Blinkit, Instamart, Zepto (mock)
- **User Preferences**: Remembers preferred brands, addresses, payment methods
- **Order Confirmation Flow**: Guided conversation for order review and confirmation
- **Real-time Notifications**: WhatsApp notifications for order status updates
- **Comprehensive Logging**: Full observability with Cloud Logging and Monitoring

## 🛠️ Technology Stack

### Google Cloud Platform
- **Dialogflow CX**: Conversational AI and intent recognition
- **Cloud Run**: Serverless container orchestration service
- **Cloud Functions**: WhatsApp webhook receiver
- **Pub/Sub**: Asynchronous message processing
- **Cloud Firestore**: NoSQL database for user preferences and orders
- **Secret Manager**: Secure credential storage
- **Cloud Logging & Monitoring**: Observability and alerting

### External Services
- **Meta WhatsApp Business API**: WhatsApp message integration
- **Quick Commerce Platforms**: Blinkit, Instamart, Zepto (mock implementations)

### Development
- **Python 3.9**: Primary programming language
- **Flask**: Web framework for Cloud Run service
- **Docker**: Containerization for Cloud Run deployment

## 📋 Prerequisites

- Google Cloud Platform account with billing enabled
- Meta Developer account
- WhatsApp Business Account
- Basic understanding of GCP services
- Python 3.9+ and Docker (for local development)

## 🔧 Installation & Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd whatsapp-quick-commerce-agent
```

### 2. GCP Project Setup
```bash
# Create and configure GCP project
gcloud projects create quick-commerce-ai-agent
gcloud config set project quick-commerce-ai-agent

# Enable required APIs
gcloud services enable dialogflow.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com
```

### 3. Meta WhatsApp Setup
1. Go to [Meta for Developers](https://developers.facebook.com)
2. Create a new Business app
3. Add WhatsApp product to your app
4. Generate access token from WhatsApp > API Setup
5. Add test phone numbers (up to 5 for testing)

### 4. Create Pub/Sub Infrastructure
```bash
# Create topic and subscription
gcloud pubsub topics create whatsapp-incoming-messages
gcloud pubsub subscriptions create whatsapp-incoming-messages-sub \
    --topic=whatsapp-incoming-messages
```

### 5. Deploy WhatsApp Webhook Function
```bash
cd whatsapp-webhook
gcloud functions deploy whatsapp-webhook-receiver \
    --gen2 \
    --runtime=python39 \
    --source=. \
    --entry-point=whatsapp_webhook_receiver \
    --trigger=http \
    --allow-unauthenticated \
    --set-env-vars="VERIFY_TOKEN=your-secure-token-here" \
    --region=asia-south1
```

### 6. Configure Firestore
```bash
# Initialize Firestore in native mode
gcloud firestore databases create --region=asia-south1
```

### 7. Setup Secret Manager
```bash
# Store WhatsApp access token
echo "YOUR_WHATSAPP_ACCESS_TOKEN" | gcloud secrets create whatsapp-access-token \
    --data-file=-

# Create service account
gcloud iam service-accounts create quick-commerce-agent-sa \
    --display-name="Quick Commerce Agent Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding quick-commerce-ai-agent \
    --member="serviceAccount:quick-commerce-agent-sa@quick-commerce-ai-agent.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding quick-commerce-ai-agent \
    --member="serviceAccount:quick-commerce-agent-sa@quick-commerce-ai-agent.iam.gserviceaccount.com" \
    --role="roles/datastore.user"

gcloud projects add-iam-policy-binding quick-commerce-ai-agent \
    --member="serviceAccount:quick-commerce-agent-sa@quick-commerce-ai-agent.iam.gserviceaccount.com" \
    --role="roles/dialogflow.client"

gcloud projects add-iam-policy-binding quick-commerce-ai-agent \
    --member="serviceAccount:quick-commerce-agent-sa@quick-commerce-ai-agent.iam.gserviceaccount.com" \
    --role="roles/pubsub.subscriber"
```

### 8. Create Dialogflow CX Agent
1. Go to Dialogflow CX in GCP Console
2. Create new agent: "QuickCommerceAgent"
3. Configure intents:
   - **OrderGrocery**: "order me a liter of milk", "get me some bread"
   - **ConfirmOrder**: "yes, confirm", "looks good"
   - **CancelOrder**: "cancel my order", "never mind"
   - **ModifyOrder**: "change the quantity", "different brand"
4. Create entities: @product, @unit, @brand
5. Design conversation flow with order confirmation

### 9. Deploy Cloud Run Service
```bash
cd quick-commerce-backend

# Deploy with environment variables
gcloud run deploy quick-commerce-agent \
    --source . \
    --platform managed \
    --region asia-south1 \
    --allow-unauthenticated \
    --set-env-vars="GCP_PROJECT=quick-commerce-ai-agent,LOCATION_ID=asia-south1,DIALOGFLOW_AGENT_ID=YOUR_AGENT_ID,WHATSAPP_CLOUD_API_URL=https://graph.facebook.com/v19.0/YOUR_PHONE_NUMBER_ID/messages" \
    --service-account=quick-commerce-agent-sa@quick-commerce-ai-agent.iam.gserviceaccount.com
```

### 10. Configure Webhooks
1. **WhatsApp Webhook**: In Meta App Dashboard, set webhook URL to Cloud Function trigger URL
2. **Dialogflow Webhook**: In Dialogflow CX, set webhook URL to Cloud Run service `/webhook` endpoint

## 🧪 Testing

### End-to-End WhatsApp Testing
1. Send: `"order me a liter of milk"`
2. Expect: Platform comparison and price quote
3. Send: `"yes, confirm"`
4. Expect: Order confirmation with mock order ID
5. Send: `"cancel my order"`
6. Expect: Cancellation confirmation

### API Testing
```bash
# Test webhook endpoint
curl -X POST "YOUR_CLOUD_RUN_URL/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "fulfillmentInfo": {"tag": "OrderGrocery"},
    "sessionInfo": {
      "parameters": {
        "product": "milk",
        "quantity": "1",
        "unit": "liter"
      }
    }
  }'

# Monitor logs
gcloud logging read "resource.type=cloud_function" --limit=10
gcloud logging read "resource.type=cloud_run_revision" --limit=10
```

## 📊 Monitoring

### View Logs
```bash
# Cloud Function logs
gcloud logging read "resource.type=cloud_function AND resource.labels.function_name=whatsapp-webhook-receiver"

# Cloud Run logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=quick-commerce-agent"

# Dialogflow CX logs
gcloud logging read "resource.type=dialogflow_agent"
```

### Create Alerts
```bash
# Error rate alert
gcloud alpha monitoring policies create --policy-from-file=monitoring/error-alert-policy.json
```

## 🗂️ Project Structure

```
whatsapp-quick-commerce-agent/
├── whatsapp-webhook/
│   ├── main.py                 # WhatsApp webhook Cloud Function
│   └── requirements.txt
├── quick-commerce-backend/
│   ├── app.py                 # Main orchestration service
│   ├── requirements.txt
│   └── Dockerfile
├── monitoring/
│   └── error-alert-policy.json
├── CLAUDE.md                  # Development learnings & patterns
├── README.md                  # This file
└── .gitignore
```

## 🔐 Security Considerations

### Implemented Security Measures
- **Secret Management**: All credentials stored in Google Secret Manager
- **IAM Permissions**: Principle of least privilege for all service accounts
- **Webhook Verification**: WhatsApp webhook signature validation
- **Network Security**: Private GCP network communication

### Production Security Enhancements
- Implement WhatsApp message signature verification
- Add rate limiting and abuse protection
- Secure user authentication and session management
- PCI DSS compliance for payment processing

## ⚠️ Important Limitations

### Mock Platform Integration
**Current State**: The system uses mock responses for quick commerce platforms.

**Production Requirements**:
- Official business partnerships with Blinkit, Instamart, Zepto
- Private API access agreements
- Real-time inventory synchronization
- Actual transactional order placement

### Mock Implementation Example
```python
def query_quick_commerce_platforms(product, quantity, brand=None):
    """
    CRITICAL: This is a MOCK implementation for demonstration.
    Production requires official platform APIs.
    """
    mock_results = [
        {'platform': 'Blinkit', 'price': 52.00, 'available': True},
        {'platform': 'Instamart', 'price': 48.00, 'available': True}
    ]
    return min([r for r in mock_results if r['available']], key=lambda x: x['price'])
```

## 🚀 Production Deployment Checklist

### Pre-Production
- [ ] Replace mock platform integration with real APIs
- [ ] Implement proper payment processing
- [ ] Add comprehensive error handling
- [ ] Set up monitoring and alerting
- [ ] Configure auto-scaling policies
- [ ] Implement rate limiting
- [ ] Add user authentication
- [ ] Legal compliance review

### Deployment
- [ ] Update all environment variables
- [ ] Configure production secrets
- [ ] Set up CI/CD pipeline
- [ ] Configure domain and SSL certificates
- [ ] Enable backup and disaster recovery
- [ ] Performance testing
- [ ] Security audit

## 🔄 Future Enhancements

### Immediate (Next 2-4 weeks)
- Real platform API integration
- Payment gateway integration (Razorpay/Stripe)
- Enhanced error handling and user feedback
- Multi-language support

### Medium-term (1-3 months)
- Voice message processing
- Image-based product recognition
- Order history and favorites
- Location-based platform selection
- Real-time order tracking

### Long-term (3-6 months)
- Advanced analytics and insights
- Subscription-based recurring orders
- AI-powered demand forecasting
- Dynamic pricing optimization
- Multi-tenant architecture for white-label deployment

## 📈 Performance Metrics

### Key Performance Indicators
- **Response Time**: < 2 seconds for order queries
- **Availability**: 99.9% uptime target
- **Order Completion Rate**: Track successful order placements
- **User Engagement**: Conversation completion rates
- **Error Rate**: < 1% system errors

### Monitoring Dashboard
```bash
# Create custom metrics
gcloud logging metrics create order_completion_rate \
    --log-filter='jsonPayload.event="order_confirmed"'

gcloud logging metrics create average_response_time \
    --log-filter='resource.type="cloud_run_revision"'
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow Python PEP 8 style guidelines
- Add comprehensive unit tests for new features
- Update documentation for any API changes
- Ensure all services pass health checks

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Issue**: WhatsApp webhook timeouts
**Solution**: Check Cloud Function logs and ensure Pub/Sub topic exists

**Issue**: Dialogflow CX not responding
**Solution**: Verify webhook URL and service account permissions

**Issue**: Platform queries failing
**Solution**: Remember that platform integration is mocked - check mock data

### Getting Help

1. Check the [CLAUDE.md](CLAUDE.md) file for detailed technical guidance
2. Review Cloud Logging for error messages
3. Verify all environment variables are correctly set
4. Ensure all GCP APIs are enabled

### Contact

For technical questions or support:
- Create an issue in this repository
- Check Google Cloud documentation
- Review Dialogflow CX best practices

---

**⚠️ Disclaimer**: This is a demonstration project with mock quick commerce platform integration. Production deployment requires official business partnerships and proper API agreements with quick commerce platforms.