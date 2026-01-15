import smtplib
import os
from datetime import datetime
from zoneinfo import ZoneInfo
import requests
#from dotenv import load_dotenv


def send_message(message, sender_email, sender_password, recipient_emails):
    recipient_list = [email.strip() for email in recipient_emails.split(",") if email.strip()]

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(sender_email, sender_password)

    for recipient_email in recipient_list:
        server.sendmail(sender_email, recipient_email, message)

    server.quit()


def _today_strings():
    now_et = datetime.now(ZoneInfo("America/New_York"))
    return now_et.strftime("%Y-%m-%d"), now_et.strftime("%Y%m%d")


def _build_email_with_date(base_email, date_compact):
    if not base_email:
        base_email = "form.checker@example.com"
    if "@" not in base_email:
        return f"{base_email}.{date_compact}@example.com"
    local, domain = base_email.split("@", 1)
    return f"{local}+{date_compact}@{domain}"


def submit_form(form_action_url, base_email):
    date_display, date_compact = _today_strings()
    email_value = _build_email_with_date(base_email, date_compact)

    payload = {
        "entry.10882405": email_value,
        "entry.45946671": f"Form Checker {date_display}",
        "entry.1474145636": date_display,
        "entry.1752543779": f"123 Test St {date_display}",
        "entry.1439816745": f"555-0100 {date_display}",
        "entry.1931067816": f"Test Insurance {date_display}",
        "entry.1143925446": f"Dr. Example {date_display}",
        "entry.220115827": f"Automated daily check {date_display}",
        "entry.766197364": "Daytime before 3:00pm",
        "entry.1799808608": "In Office",
        "entry.1492622105": "Male",
    }

    response = requests.post(form_action_url, data=payload, timeout=20)
    if response.status_code == 200:
        success_text = (
            "Your response has been received. When an appointment becomes available, "
            "you will receive a call from our office. Thank you!"
        )
        if success_text in response.text:
            return True, "Form submitted successfully."
        return False, "Form submission failed: confirmation text not found."
    return False, f"Form submission failed: HTTP {response.status_code}"


def main():
    #load_dotenv()

    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("EMAIL_PASSWORD")
    recipient_emails = os.getenv("RECIPIENT_EMAILS") or os.getenv("RECIPIENT_EMAIL")
    failed_recipient_emails = os.getenv("RECIPIENT_EMAILS_FAILED")
    form_action_url = os.getenv("FORM_ACTION_URL")
    base_email = os.getenv("FORM_EMAIL", sender_email)

    success, message = submit_form(form_action_url, base_email)
    print(message)

    if sender_email and sender_password:
        subject = "Daily Form Submission Result"
        if recipient_emails:
            send_message(f"Subject: {subject}\n\n{message}", sender_email, sender_password, recipient_emails)
        if not success and failed_recipient_emails:
            send_message(f"Subject: {subject}\n\n{message}", sender_email, sender_password, failed_recipient_emails)


if __name__ == "__main__":
    main()
