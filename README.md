# Wazappp : WhatsApp Bulk Messenger

**Wazappp** is a powerful and easy-to-use web application that enables you to send personalized messages to multiple WhatsApp contacts effortlessly. Ideal for marketing, customer outreach, or personal announcements, this tool supports both WhatsApp Web automation and WhatsApp Business API.



## 🌟 Features

- 📁 Upload CSV contact lists with support for custom fields
- ✍️ Compose message templates with dynamic variables
- 🔁 Choose from multiple sending strategies (Conservative, Moderate, Aggressive)
- 🌐 Use WhatsApp Web or Business API for delivery
- 📊 Real-time progress tracking and detailed logs
- 🕒 Optional scheduling with start/end time
- 📉 Rate limiting and safety controls
- 💬 Toast notifications and confirmation modals



## 🧰 Tech Stack

- **Frontend:** HTML5, CSS3 (custom styles), JavaScript (Vanilla)
- **No dependencies** – 100% client-side
- ⚙️ Optionally integrates with **WhatsApp Business API**



## 📦 Installation

1. Clone this repository or download the ZIP:

   ```bash
   git clone https://github.com/shivendrra/wazappp.git

2. Open `main.html` in your browser to start using the app.
   *(No server or build step required!)*



## 📝 CSV Format

Your CSV file should include the following columns:

| Column Name   | Required | Description                         |
| - | -- | -- |
| `Name`        | ✅        | Full name of the contact            |
| `Phone`       | ✅        | Phone number (without country code) |
| `CountryCode` | ❌        | Defaults to selected value in UI    |
| `Email`       | ❌        | Optional                            |
| `Company`     | ❌        | Optional                            |
| `City`        | ❌        | Optional                            |
| `Country`     | ❌        | Optional                            |

### Example

```csv
Name,Phone,CountryCode,Email,Company
John Doe,9876543210,91,john@email.com,OpenAI
Jane Smith,9876543211,91,jane@email.com,SpaceX
```



## 🧠 Template Variables

You can use the following variables in your message template:

* `{name}` - Full name
* `{first_name}` - First name only
* `{phone}` - Phone number
* `{email}` - Email address
* `{company}` - Company name
* `{city}` - City
* `{country}` - Country

### Sample Template

```
Hello {first_name}! 👋

This is a personalized message from {company}.

Best regards!
```



## ⚙️ Sending Methods

* **WhatsApp Web:** Uses browser automation (opens a new tab for each contact)
* **WhatsApp Business API:** Requires API token and phone number ID



## 🧪 Strategy Modes

| Strategy     | Interval      | Description                    |
|--------------|---------------|--------------------------------|
| Conservative | 30–90 seconds | Safest, most human-like        |
| Moderate     | 15–45 seconds | Balanced speed and safety      |
| Aggressive   | 5–20 seconds  | Fastest, may trigger spam flag |



## 🔐 Requirements & Notes

* Keep WhatsApp Web tab open and authenticated (QR scan)
* Do not use your WhatsApp phone simultaneously
* Ensure stable internet connection
* For API usage:

  * A valid WhatsApp Business API token
  * Verified phone number ID



## ⚠️ Disclaimers

* Ensure **explicit permission** before messaging users
* Respect WhatsApp’s terms of service and local laws
* The creator is **not responsible** for misuse or spam

