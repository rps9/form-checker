import smtplib
import os
import re
from datetime import datetime
from zoneinfo import ZoneInfo
import requests
from dotenv import load_dotenv


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
    if "@" not in base_email:
        return f"{base_email}.{date_compact}"
    local, domain = base_email.split("@", 1)
    return f"{local}+{date_compact}@{domain}"


def _build_payload(base_email):
    date_display, date_compact = _today_strings()
    email_value = _build_email_with_date(base_email, date_compact)
    payload = {
        "entry.10882405": email_value,
        "entry.45946671": f"CANARY Form Checker {date_display}",
        "entry.1474145636": date_display,
        "entry.1752543779": f"CANARY Form Checker {date_display}",
        "entry.1439816745": f"CANARY Form Checker {date_display}",
        "entry.1931067816": f"CANARY Form Checker {date_display}",
        "entry.1143925446": f"CANARY Form Checker {date_display}",
        "entry.220115827": f"CANARY Form Checker {date_display}",
        "entry.766197364": "Daytime before 3:00pm",
        "entry.1799808608": "In Office",
        "entry.1492622105": "Male",
    }
    return payload


def _fetch_form_entry_ids(form_view_url):
    response = requests.get(form_view_url, timeout=20)
    response.raise_for_status()
    html = response.text
    entry_ids = set(re.findall(r'data-params="[^"]*?\[\[(\d+),', html))
    if entry_ids:
        return {f"entry.{entry_id}" for entry_id in entry_ids}
    return set(re.findall(r'name="(entry\.\d+)"', html))


def _compare_payload_to_form(payload, form_view_url):
    form_entries = _fetch_form_entry_ids(form_view_url)
    payload_entries = set(payload.keys())
    missing_in_form = sorted(payload_entries - form_entries)
    missing_in_payload = sorted(form_entries - payload_entries)
    return missing_in_form, missing_in_payload


def check_form_entries(form_view_url, payload):
    try:
        missing_in_form, missing_in_payload = _compare_payload_to_form(payload, form_view_url)
    except requests.RequestException as exc:
        return False, f"Form entry check failed: {exc}"
    if missing_in_form or missing_in_payload:
        details = []
        if missing_in_form:
            details.append(f"Entries in payload not in form: {', '.join(missing_in_form)}")
        if missing_in_payload:
            details.append(f"Entries in form not in payload: {', '.join(missing_in_payload)}")
        return False, "Form entry mismatch detected. " + " | ".join(details)
    return True, "Form entry check passed."


def submit_form(form_action_url, payload):
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
    load_dotenv()

    sender_email = os.getenv("SENDER_EMAIL")
    sender_password = os.getenv("EMAIL_PASSWORD")
    recipient_emails = os.getenv("RECIPIENT_EMAILS")
    failed_recipient_emails = os.getenv("RECIPIENT_EMAILS_FAILED")
    form_url = os.getenv("FORM_URL")

    form_action_url = f"{form_url}/formResponse"
    form_view_url = f"{form_url}/viewform"

    payload = _build_payload("form_checker@gmail.com")
    check_success, check_message = check_form_entries(form_view_url, payload)
    submit_success, submit_message = submit_form(form_action_url, payload)
    success = check_success and submit_success
    message = f"{check_message}\n{submit_message}"
    print(message)

    if sender_email and sender_password:
        subject = "Daily Form Submission Result"
        if recipient_emails:
            send_message(f"Subject: {subject}\n\n{message}", sender_email, sender_password, recipient_emails)
        if not success and failed_recipient_emails:
            send_message(f"Subject: {subject}\n\n{message}", sender_email, sender_password, failed_recipient_emails)


if __name__ == "__main__":
    main()
