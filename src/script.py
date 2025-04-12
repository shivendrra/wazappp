import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager
import random, time

time_interval = random.randint(7, 18) # generates random no to put it as time interval to mimic human behavior

# creating a new instance of the Chrome driver
driver = webdriver.Chrome(ChromeDriverManager().install())

# reading the CSV file containing phone numbers
df = pd.read_csv('phone.csv')
message = "Hello, this is an automated message."  # message to be sent

for index, row in df.iterrows():
  phone_number = row['Phone']
  country_code = str(row['CountryCode'])
  full_number = f"{country_code}{phone_number}"

  whatsapp_url = f"https://web.whatsapp.com/send?phone={full_number}&text={message}"   # creating the WhatsApp Click-to-Chat URL
  driver.get(whatsapp_url)  # opens the WhatsApp URL in the browser

  # waiting for the page to load
  time.sleep(15)

  try:
    send_button = driver.find_element(By.XPATH, '//span[@data-icon="send"]')
    send_button.click()
    print(f"Message sent to {full_number}")
  except:
    print(f"Failed to send message to {full_number}. Is the number valid?")
  time.sleep(time_interval)

driver.quit()