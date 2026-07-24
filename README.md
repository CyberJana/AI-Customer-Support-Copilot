# 🤖 AI Customer Support Copilot

An AI-powered customer support assistant that helps businesses answer customer questions using company knowledge, documents, and previous conversations. It combines Retrieval-Augmented Generation (RAG), Large Language Models (LLMs), and ticket management into one intelligent platform.

---

## 🚀 Features

- 💬 AI-powered customer support chatbot
- 📄 PDF & document search using RAG
- 🔍 Semantic search with Qdrant
- 🎫 Automatic support ticket creation
- 👨‍💼 Human agent handoff
- 🌍 Multi-language support
- 📊 Analytics dashboard
- 🔐 Secure authentication
- 📚 Conversation history
- ⚡ Fast API responses
- 🐳 Docker deployment

---

## 🛠 Tech Stack

### Frontend
- React
- Tailwind CSS
- Axios

### Backend
- FastAPI
- Python
- PostgreSQL
- SQLAlchemy
- JWT Authentication

### AI & Vector Database
- OpenAI GPT-4 / GPT-4o
- Llama 3
- LangChain
- Qdrant
- Sentence Transformers

### DevOps
- Docker
- Docker Compose
- GitHub
- Nginx (Optional)

---

## 📂 Project Structure

```
ai-customer-support-copilot/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── app/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── database/
│   ├── requirements.txt
│   └── main.py
│
├── documents/
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## ⚙ Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/ai-customer-support-copilot.git

cd ai-customer-support-copilot
```

---

### Backend

```bash
cd backend

python -m venv venv

source venv/bin/activate
# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

---

### Frontend

```bash
cd frontend

npm install

npm run dev
```

---

## Environment Variables

Create a `.env` file.

```env
OPENAI_API_KEY=your_api_key

DATABASE_URL=postgresql://username:password@localhost/support_db

QDRANT_URL=http://localhost:6333

JWT_SECRET=your_secret_key
```

---

## Docker

```bash
docker-compose up --build
```

---

## Workflow

```
Customer
    │
    ▼
React Frontend
    │
    ▼
FastAPI Backend
    │
    ├── OpenAI / Llama 3
    ├── Qdrant Vector Database
    ├── PostgreSQL
    └── Support Ticket System
```

---

## Screenshots

### Chat Interface

(Add Screenshot)

### Analytics Dashboard

(Add Screenshot)

### Ticket Management

(Add Screenshot)

---

## Future Improvements

- Voice chatbot
- WhatsApp integration
- Email automation
- CRM integration
- Sentiment analysis
- AI agent memory
- Auto ticket prioritization
- Live translation
- Mobile application

---

## Security

- JWT Authentication
- Role-based Access Control
- HTTPS Support
- Rate Limiting
- Input Validation
- Secure API Keys

---

## API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | /chat | Chat with AI |
| POST | /upload | Upload documents |
| GET | /documents | List documents |
| POST | /ticket | Create support ticket |
| GET | /tickets | View tickets |
| GET | /analytics | Dashboard analytics |

---

## Author

**Janarthanan A**

M.Sc. Information Security & Digital Forensics

AI • Cyber Security • Digital Forensics

GitHub: https://github.com/yourusername

LinkedIn: https://linkedin.com/in/yourprofile

---

## License

MIT License

---

⭐ If you like this project, please give it a star on GitHub!
