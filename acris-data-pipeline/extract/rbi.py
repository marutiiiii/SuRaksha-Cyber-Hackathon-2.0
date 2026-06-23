import requests
from bs4 import BeautifulSoup
import re

RBI_URL = "https://www.rbi.org.in/Scripts/NotificationUser.aspx"


def fetch_notifications():
    """
    Fetch all RBI notifications from the RBI notification page.
    Returns a list of notification dictionaries.
    """

    response = requests.get(RBI_URL, timeout=30)

    if response.status_code != 200:
        raise Exception(
            f"Unable to fetch RBI page. Status Code: {response.status_code}"
        )

    soup = BeautifulSoup(response.text, "html.parser")

    notifications = []

    links = soup.find_all("a")

    for link in links:

        href = link.get("href")

        if not href:
            continue

        if "NotificationUser.aspx?Id=" not in href:
            continue

        title = link.get_text(strip=True)

        if not title:
            continue

        notification_url = (
            "https://www.rbi.org.in/Scripts/" + href
        )

        notifications.append(
            {
                "source": "RBI",
                "title": title,
                "notification_url": notification_url,
                "pdf_url": None,
            }
        )

    return notifications


def get_pdf_url(notification_url):
    """
    Extract PDF URL from an RBI notification page.
    """

    response = requests.get(
        notification_url,
        timeout=30
    )

    if response.status_code != 200:
        print(
            f"Failed to open notification page: "
            f"{notification_url}"
        )
        return None

    html = response.text

    # Find RBI PDF link
    match = re.search(
        r"https://rbidocs\.rbi\.org\.in/rdocs/notification/PDFs/[A-Za-z0-9_\-\.]+\.PDF",
        html,
    )

    if match:
        return match.group(0)

    print(
        f"No PDF found for notification: "
        f"{notification_url}"
    )

    return None


if __name__ == "__main__":

    notifications = fetch_notifications()

    print(
        f"Total Notifications Found: "
        f"{len(notifications)}"
    )

    if notifications:

        first_notification = notifications[0]

        print("\nTitle:")
        print(first_notification["title"])

        print("\nNotification URL:")
        print(first_notification["notification_url"])

        pdf_url = get_pdf_url(
            first_notification["notification_url"]
        )

        print("\nPDF URL:")
        print(pdf_url)