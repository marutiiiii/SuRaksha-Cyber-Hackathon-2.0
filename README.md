# ReguFlow AI 🚀


**ReguFlow AI** is a privacy-first, locally-hosted platform designed for intelligent regulatory compliance mapping and validation. Built with a focus on data security, ReguFlow AI runs intensive machine learning models entirely on your local hardware, ensuring that sensitive organizational data never leaves your environment.

---

## ✨ Key Features

- 🔒 **Absolute Data Privacy:** All AI processing and data storage occurs locally on your machine. No external API calls are made with your sensitive compliance data.
- 🗺️ **Automated Compliance Mapping:** Ingest, parse, and map regulatory requirements dynamically using the built-in data pipelines.
- 💬 **Interactive AI Copilot:** Chat with a locally-hosted AI assistant specifically trained to help you navigate your regulatory landscape and answer compliance-related queries.
- 📊 **Impact Analysis Dashboard:** A rich, interactive interface to visualize regulatory changes, manage organizational members, and track compliance health.
- ⚡ **Offline-Ready:** Designed to function completely disconnected from the internet once the initial model weights are downloaded.

## 🏗️ Architecture

ReguFlow AI is composed of several tightly integrated microservices and modules:

- **`acris-dashboard/`**: The modern web frontend built with TypeScript and React, providing the interactive user interface.
- **`backend/`**: A robust Python-based API server that handles business logic, authentication, and database operations.
- **`ReguFlow-Validator/`**: The core AI engine responsible for processing text, validating compliance rules, and powering the Copilot.
- **`acris-data-pipeline/`**: Services dedicated to ingesting, cleaning, and formatting large regulatory datasets.

## 🛠️ Installation & Getting Started

### For End Users (Desktop Application)
ReguFlow AI is packaged as a standalone executable for ease of use.

1. Download the latest `ReguFlow AI.exe` from the Releases page.
2. Launch the application.
3. *Note:* On first launch, the application will download necessary offline AI models and initialize the local database. This may take a few moments.
4. Once loaded, the interactive dashboard will open automatically.

For detailed instructions and troubleshooting, please see our [Installation Guide](./INSTALLATION_GUIDE.md).

### For Developers (Source Setup)

To run the platform from source for development and testing:

**1. Clone the repository:**
```bash
git clone https://github.com/your-org/ReguFlow-AI.git
cd ReguFlow-AI
```

**2. Backend Setup:**
```bash
# Navigate to the backend or root depending on the exact structure
pip install -r requirements.txt
# Start the backend server (e.g., via FastAPI/Uvicorn)
```

**3. Frontend Setup:**
```bash
cd acris-dashboard
npm install
npm run dev
```

## 📖 Usage

1. **Dashboard:** Navigate to the local server address (usually `http://localhost:3000` or provided by the executable).
2. **Setup Organization:** Configure your organization profile and invite members via the `Organization Members` tab.
3. **Analyze Regulations:** Upload or sync your regulatory documents. Use the `Impact Analysis` tool to determine how new rules affect your current compliance posture.
4. **Consult Copilot:** Open the Copilot sidebar to ask specific questions about your ingested rulebooks.

## 🤝 Contributing

We welcome contributions! Please follow these steps:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
*For support or inquiries, please contact the development team or open an issue on the repository.*
