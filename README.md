

# LeadWise: AI-Driven B2B Outreach Automation

LeadWise is a high-performance B2B outreach engine designed to replace generic, template-based email blasts with genuine, context-aware communication. By combining AI-driven scraping with a robust distributed job queue, it enables businesses to engage leads using personalized content derived from their actual website data.

## Key Features

*   **Intelligent Lead Scraping:** Uses **Playwright** to crawl and extract meaningful context from lead websites.
*   **LLM-Powered Personalization:** Leverages **Groq LLM** to generate 3-email drip sequences tailored to the specific business context, rather than simple template-swapping.
*   **Robust Background Processing:** Built on **Redis** and **BullMQ** to manage large-scale scraping and email queuing without system crashes.
*   **Secure Credential Management:** All SMTP credentials and API keys are protected at rest using **AES-256-GCM** encryption.
*   **Real-time Analytics:** A **React/Vite** dashboard provides live tracking of campaign execution and lead processing status via WebSockets.
*   **Dynamic Tone Tuning:** Supports "Tone of Voice" configuration, ensuring outreach matches brand identity.

## Architecture

This project is built for reliability and scalability. The decoupling of the scraping engine from the email delivery pipeline ensures that load spikes are handled gracefully by the BullMQ worker clusters.

## Project Demo
You can view the full architecture and code structure here: [LeadWise Repository](https://github.com/Faseeh-Ops/leadwise)

---

## Dashboard Visuals

*See the system in action below:*

<!-- Add your screenshots here. Follow the instructions in the 'How to add images' section below. -->
<img width="1021" height="227" alt="1779443147292" src="https://github.com/user-attachments/assets/5284c4e1-cfd1-43ec-a828-d438c3a912c9" />
--## Campaigns--
<img width="1280" height="672" alt="1779443147532" src="https://github.com/user-attachments/assets/d37a0bf8-a421-4469-8d99-ae6e5dae41a7" />
## Seetings
<img width="1280" height="663" alt="1779443148051" src="https://github.com/user-attachments/assets/a5ce37c7-30ed-428b-8482-e2f8f4d540d8" />
## Leads
<img width="1280" height="670" alt="1779443147777" src="https://github.com/user-attachments/assets/69e00476-0bf4-4121-8618-80ca067ea8c7" />
## Email Sequence
<img width="1280" height="670" alt="1779443148014" src="https://github.com/user-attachments/assets/c2f00ebe-0d20-4f24-ba3c-747b0711a370" />
## Email Sent

<img width="1280" height="752" alt="1779443147984" src="https://github.com/user-attachments/assets/f9f83786-7207-4d37-a4e1-477f335adcbd" />

## Tech Stack

*   **Frontend:** React, Vite, Tailwind CSS
*   **Backend:** Node.js
*   **Infrastructure:** Redis, BullMQ
*   **Automation:** Playwright
*   **AI:** Groq LLM
*   **Security:** AES-256-GCM

---

