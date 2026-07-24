# 🤖 AI Customer Support Copilot

An AI-powered customer support assistant that answers customer queries using company documents, knowledge bases, and previous conversations. Built with **React**, **FastAPI**, **PostgreSQL**, **OpenAI/Llama 3**, and **Qdrant** using **Retrieval-Augmented Generation (RAG)**.

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)
![Docker](https://img.shields.io/badge/Container-Docker-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- 💬 AI-powered Customer Support Chatbot
- 📄 PDF & Document Search (RAG)
- 🔍 Semantic Search with Qdrant
- 🎫 Support Ticket Creation
- 👨‍💼 Human Agent Handoff
- 🌍 Multi-language Support
- 📊 Analytics Dashboard
- 🔐 Secure Authentication
- 📚 Conversation History
- 🐳 Docker Deployment

---

# 🏗️ Architecture

```
                 Customer
                     │
                     ▼
             React Frontend
                     │
                     ▼
             FastAPI Backend
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    OpenAI      Qdrant    PostgreSQL
    Llama 3   Vector DB    Database
```

---

# 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React, Tailwind CSS |
| Backend | FastAPI, Python |
| Database | PostgreSQL |
| AI | OpenAI API / Llama 3 |
| Vector Database | Qdrant |
| RAG | LangChain |
| Deployment | Docker |

---

# 📂 Project Structure

```text
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
│   ├── database/
│   ├── models/
│   ├── requirements.txt
│   └── main.py
│
├── documents/
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

# 🚀 Installation

## Clone Repository

```bash
git clone https://github.com/CyberJana/ai-customer-support-copilot.git

cd ai-customer-support-copilot
```

---

## Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm run dev
```

---

# 🔐 Environment Variables

Create a `.env` file inside the backend directory.

```env
OPENAI_API_KEY=your_openai_api_key

DATABASE_URL=postgresql://username:password@localhost/support_db

QDRANT_URL=http://localhost:6333

JWT_SECRET=your_secret_key
```

---

# 🐳 Docker

```bash
docker-compose up --build
```

---

# 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat` | Chat with AI |
| POST | `/upload` | Upload Documents |
| GET | `/documents` | List Documents |
| POST | `/ticket` | Create Support Ticket |
| GET | `/tickets` | View Tickets |
| GET | `/analytics` | Analytics Dashboard |

---

# 📊 Workflow

1. Customer asks a question.
2. FastAPI receives the request.
3. Relevant documents are retrieved from Qdrant.
4. OpenAI/Llama 3 generates an answer using RAG.
5. Response is returned to the user.
6. If unresolved, a support ticket is created and routed to a human agent.

---

# 📸 Screenshots

## Chat Interface

> Add screenshot here

---

## Analytics Dashboard

> Add screenshot here

---

## Ticket Management

> Add screenshot here

---

# 🚀 Future Roadmap

- 🎙️ Voice Assistant
- 📱 WhatsApp Integration
- 📧 Email Automation
- 🤖 AI Agent Memory
- 😊 Sentiment Analysis
- 🌐 Live Translation
- 📈 Customer Satisfaction Prediction
- 🔔 Smart Notifications
- 📲 Mobile Application

---

# 🔒 Security

- JWT Authentication
- HTTPS Support
- Role-Based Access Control
- Rate Limiting
- API Key Protection
- Secure Password Hashing

---

# 👨‍💻 Author

**Janarthanan A**

🎓 M.Sc. Information Security & Digital Forensics

🐙 GitHub: https://github.com/CyberJana

---

# 📄 License

This project is licensed under the **MIT License**.

---

## ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub!

**Repository:** https://github.com/CyberJana/ai-customer-support-copilot
