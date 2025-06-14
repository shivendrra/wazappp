import pandas as pd
import requests
import random, time, json, logging
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
import urllib.parse
from typing import Dict, List, Optional, Tuple

# Configure logging
logging.basicConfig(
  level=logging.INFO,
  format='%(asctime)s - %(levelname)s - %(message)s',
  handlers=[
    logging.FileHandler('whatsapp_messenger.log'),
    logging.StreamHandler()
  ]
)

class WhatsAppMessenger:
  def __init__(self, method='web', api_token=None, phone_number_id=None):
    """
    Initialize WhatsApp Messenger
    
    Args:
      method: 'web' for web automation, 'api' for WhatsApp Business API
      api_token: WhatsApp Business API token (required for API method)
      phone_number_id: Phone number ID for API method
    """
    self.method = method
    self.api_token = api_token
    self.phone_number_id = phone_number_id
    self.driver = None
    self.sent_messages = []
    self.failed_messages = []
    
    # Human-like behavior patterns
    self.typing_delays = {
      'short': (1, 3),      # 1-3 seconds for short messages
      'medium': (2, 5),     # 2-5 seconds for medium messages
      'long': (3, 8)        # 3-8 seconds for long messages
    }
    
    self.message_intervals = {
      'conservative': (30, 90),    # 30-90 seconds between messages
      'moderate': (15, 45),        # 15-45 seconds between messages
      'aggressive': (5, 20)        # 5-20 seconds between messages (higher ban risk)
    }
    
    if method == 'web':
      self._setup_driver()
  
  def _setup_driver(self):
    """Setup Chrome driver with optimized settings"""
    chrome_options = Options()
    
    # Add user agent to avoid detection
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    # Optimize for WhatsApp Web
    chrome_options.add_argument('--disable-blink-features=AutomationControlled')
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    # Keep browser session
    chrome_options.add_argument('--user-data-dir=./whatsapp_session')
    
    self.driver = webdriver.Chrome(ChromeDriverManager().install(), options=chrome_options)
    self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    
    logging.info("Chrome driver initialized successfully")
  
  def authenticate_whatsapp_web(self):
    """Authenticate WhatsApp Web - user needs to scan QR code"""
    if self.method != 'web':
      return
    
    logging.info("Opening WhatsApp Web for authentication...")
    self.driver.get("https://web.whatsapp.com")
    
    try:
      # Wait for QR code or main interface
      WebDriverWait(self.driver, 60).until(
        lambda driver: driver.find_elements(By.CSS_SELECTOR, '[data-testid="chat-list"]') or 
                      driver.find_elements(By.CSS_SELECTOR, 'canvas')
      )
      
      if self.driver.find_elements(By.CSS_SELECTOR, 'canvas'):
        logging.info("Please scan the QR code to authenticate WhatsApp Web")
        input("Press Enter after scanning the QR code and WhatsApp Web is loaded...")
      
      # Verify authentication
      WebDriverWait(self.driver, 30).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, '[data-testid="chat-list"]'))
      )
      
      logging.info("WhatsApp Web authenticated successfully!")
      return True
      
    except TimeoutException:
      logging.error("Failed to authenticate WhatsApp Web")
      return False
  
  def _get_typing_delay(self, message_length: int) -> float:
    """Calculate human-like typing delay based on message length"""
    if message_length < 50:
      return random.uniform(*self.typing_delays['short'])
    elif message_length < 150:
      return random.uniform(*self.typing_delays['medium'])
    else:
      return random.uniform(*self.typing_delays['long'])
  
  def _get_message_interval(self, strategy: str = 'moderate') -> float:
    """Get interval between messages based on strategy"""
    return random.uniform(*self.message_intervals.get(strategy, self.message_intervals['moderate']))
  
  def _personalize_message(self, template: str, contact_data: Dict) -> str:
    """Personalize message template with contact data"""
    personalized = template
    
    # Replace common placeholders
    replacements = {
      '{name}': contact_data.get('Name', 'there'),
      '{first_name}': contact_data.get('Name', 'there').split()[0] if contact_data.get('Name') else 'there',
      '{phone}': str(contact_data.get('Phone', '')),
      '{email}': contact_data.get('Email', ''),
      '{company}': contact_data.get('Company', ''),
      '{city}': contact_data.get('City', ''),
      '{country}': contact_data.get('Country', '')
    }
    
    for placeholder, value in replacements.items():
      personalized = personalized.replace(placeholder, value)
    
    return personalized
  
  def send_message_web(self, phone_number: str, message: str, country_code: str = "+91") -> bool:
    """Send message using WhatsApp Web automation"""
    try:
      # Format phone number
      full_number = f"{country_code}{phone_number}".replace('+', '').replace(' ', '').replace('-', '')
      
      # Encode message for URL
      encoded_message = urllib.parse.quote(message)
      whatsapp_url = f"https://web.whatsapp.com/send?phone={full_number}&text={encoded_message}"
      
      logging.info(f"Opening chat for {full_number}")
      self.driver.get(whatsapp_url)
      
      # Wait for chat to load
      time.sleep(random.uniform(3, 7))
      
      # Check if number is valid (look for invalid number message)
      try:
        invalid_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Phone number shared via url is invalid')]")
        if invalid_elements:
          logging.warning(f"Invalid phone number: {full_number}")
          return False
      except:
        pass
      
      # Wait for message input box
      try:
        message_box = WebDriverWait(self.driver, 15).until(
          EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="conversation-compose-box-input"]'))
        )
      except TimeoutException:
        # Try alternative selector
        try:
          message_box = WebDriverWait(self.driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, '//div[@contenteditable="true"][@data-tab="10"]'))
          )
        except TimeoutException:
          logging.error(f"Could not find message input for {full_number}")
          return False
      
      # Simulate human typing
      message_box.click()
      time.sleep(0.5)
      
      # Type message with human-like delays
      typing_delay = self._get_typing_delay(len(message))
      for char in message:
        message_box.send_keys(char)
        if random.random() < 0.1:  # 10% chance of brief pause
          time.sleep(random.uniform(0.1, 0.3))
      
      time.sleep(typing_delay)
      
      # Find and click send button
      try:
        send_button = WebDriverWait(self.driver, 10).until(
          EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="send"]'))
        )
        send_button.click()
        
        logging.info(f"Message sent successfully to {full_number}")
        return True
        
      except TimeoutException:
        # Try alternative send button selector
        try:
          send_button = self.driver.find_element(By.XPATH, '//span[@data-icon="send"]')
          send_button.click()
          logging.info(f"Message sent successfully to {full_number}")
          return True
        except NoSuchElementException:
          logging.error(f"Could not find send button for {full_number}")
          return False
    
    except Exception as e:
      logging.error(f"Error sending message to {full_number}: {str(e)}")
      return False
  
  def send_message_api(self, phone_number: str, message: str, country_code: str = "91") -> bool:
    """Send message using WhatsApp Business API"""
    if not self.api_token or not self.phone_number_id:
      logging.error("API token and phone number ID required for API method")
      return False
    
    try:
      # Format phone number for API
      full_number = f"{country_code}{phone_number}".replace('+', '').replace(' ', '').replace('-', '')
      
      url = f"https://graph.facebook.com/v18.0/{self.phone_number_id}/messages"
      
      headers = {
        'Authorization': f'Bearer {self.api_token}',
        'Content-Type': 'application/json'
      }
      
      payload = {
        'messaging_product': 'whatsapp',
        'to': full_number,
        'type': 'text',
        'text': {
          'body': message
        }
      }
      
      response = requests.post(url, headers=headers, json=payload)
      
      if response.status_code == 200:
        logging.info(f"Message sent successfully via API to {full_number}")
        return True
      else:
        logging.error(f"API Error for {full_number}: {response.status_code} - {response.text}")
        return False
        
    except Exception as e:
      logging.error(f"Error sending message via API to {full_number}: {str(e)}")
      return False
  
  def bulk_send_messages(self, 
                        csv_file: str, 
                        message_template: str, 
                        strategy: str = 'moderate',
                        max_messages_per_hour: int = 50,
                        start_time: Optional[str] = None,
                        end_time: Optional[str] = None) -> Dict:
    """
    Send bulk messages with advanced controls
    
    Args:
      csv_file: Path to CSV file with contact details
      message_template: Message template with placeholders
      strategy: 'conservative', 'moderate', or 'aggressive'
      max_messages_per_hour: Rate limiting
      start_time: Start time in HH:MM format (optional)
      end_time: End time in HH:MM format (optional)
    """
    try:
      # Read CSV file
      df = pd.read_csv(csv_file)
      logging.info(f"Loaded {len(df)} contacts from {csv_file}")
      
      # Validate required columns
      required_columns = ['Phone']
      missing_columns = [col for col in required_columns if col not in df.columns]
      if missing_columns:
        raise ValueError(f"Missing required columns: {missing_columns}")
      
      # Add default country code if not present
      if 'CountryCode' not in df.columns:
        df['CountryCode'] = '91'  # Default to India
      
      results = {
        'total_contacts': len(df),
        'messages_sent': 0,
        'messages_failed': 0,
        'failed_contacts': [],
        'sent_contacts': []
      }
      
      # Authenticate if using web method
      if self.method == 'web':
        if not self.authenticate_whatsapp_web():
          return results
      
      messages_sent_this_hour = 0
      hour_start_time = datetime.now()
      
      for index, row in df.iterrows():
        # Check time restrictions
        if start_time or end_time:
          current_time = datetime.now().time()
          if start_time and current_time < datetime.strptime(start_time, '%H:%M').time():
            logging.info(f"Waiting until {start_time} to start sending messages")
            continue
          if end_time and current_time > datetime.strptime(end_time, '%H:%M').time():
            logging.info(f"Stopping at {end_time} as specified")
            break
        
        # Rate limiting
        if messages_sent_this_hour >= max_messages_per_hour:
          time_to_wait = 3600 - (datetime.now() - hour_start_time).seconds
          if time_to_wait > 0:
            logging.info(f"Rate limit reached. Waiting {time_to_wait} seconds...")
            time.sleep(time_to_wait)
          messages_sent_this_hour = 0
          hour_start_time = datetime.now()
        
        try:
          phone_number = str(row['Phone']).strip()
          country_code = str(row.get('CountryCode', '91')).strip()
          
          # Personalize message
          personalized_message = self._personalize_message(message_template, row.to_dict())
          
          # Send message based on method
          if self.method == 'web':
            success = self.send_message_web(phone_number, personalized_message, country_code)
          else:
            success = self.send_message_api(phone_number, personalized_message, country_code)
          
          if success:
            results['messages_sent'] += 1
            results['sent_contacts'].append({
              'phone': f"{country_code}{phone_number}",
              'name': row.get('Name', 'Unknown'),
              'timestamp': datetime.now().isoformat()
            })
            messages_sent_this_hour += 1
          else:
            results['messages_failed'] += 1
            results['failed_contacts'].append({
              'phone': f"{country_code}{phone_number}",
              'name': row.get('Name', 'Unknown'),
              'reason': 'Send failed'
            })
          
          # Wait between messages with human-like pattern
          if index < len(df) - 1:  # Don't wait after last message
            interval = self._get_message_interval(strategy)
            logging.info(f"Waiting {interval:.1f} seconds before next message...")
            time.sleep(interval)
            
        except Exception as e:
          logging.error(f"Error processing contact {index}: {str(e)}")
          results['messages_failed'] += 1
          results['failed_contacts'].append({
            'phone': f"{row.get('CountryCode', '91')}{row.get('Phone', 'Unknown')}",
            'name': row.get('Name', 'Unknown'),
            'reason': str(e)
          })
      
      # Generate report
      self._generate_report(results)
      
      return results
      
    except Exception as e:
      logging.error(f"Error in bulk send: {str(e)}")
      return {'error': str(e)}
  
  def _generate_report(self, results: Dict):
    """Generate detailed report of the bulk send operation"""
    report = f"""
=== WhatsApp Bulk Messaging Report ===
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Summary:
- Total Contacts: {results['total_contacts']}
- Messages Sent: {results['messages_sent']}
- Messages Failed: {results['messages_failed']}
- Success Rate: {(results['messages_sent'] / results['total_contacts'] * 100):.1f}%

"""
    
    if results['failed_contacts']:
      report += "\nFailed Contacts:\n"
      for contact in results['failed_contacts']:
        report += f"- {contact['name']} ({contact['phone']}): {contact['reason']}\n"
    
    # Save report to file
    with open(f'whatsapp_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt', 'w') as f:
      f.write(report)
    
    logging.info("Report generated successfully")
    print(report)
  
  def close(self):
    """Clean up resources"""
    if self.driver:
      self.driver.quit()
      logging.info("Driver closed successfully")