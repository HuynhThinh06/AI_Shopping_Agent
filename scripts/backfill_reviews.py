import requests
import json
import time
import random
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

API_BASE = "http://localhost:8080/api/seed"

def backfill_reviews():
    print("Fetching existing products from database...")
    try:
        response = requests.get(f"{API_BASE}/products")
        if response.status_code != 200:
            print("Failed to get products:", response.text)
            return
        products = response.json()
    except Exception as e:
        print("Error connecting to backend API:", e)
        return

    print(f"Found {len(products)} products. Starting review scraping...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()

        for product in products:
            p_id = product.get("id")
            url = product.get("productUrl")
            
            if not url or "thegioididong.com" not in url:
                print(f"Skipping product {p_id} with invalid URL: {url}")
                continue

            print(f"\n--- Scraping reviews for Product ID {p_id}: {url} ---")
            reviews = scrape_reviews_for_url(page, url)
            
            if not reviews:
                print(f"No reviews found for product {p_id} or failed to scrape.")
                # We can generate fake reviews if none found just to have data for testing
                print("Generating 3 dummy reviews for testing purposes...")
                reviews = [
                    {"reviewerName": "Nguyễn Văn A", "content": "Sản phẩm dùng khá tốt, máy chạy mượt, pin trâu.", "rating": 5},
                    {"reviewerName": "Trần Thị B", "content": "Thiết kế đẹp nhưng máy hơi nóng khi chơi game.", "rating": 4},
                    {"reviewerName": "Lê C", "content": "Màn hình sáng rõ, phù hợp với dân văn phòng.", "rating": 5}
                ]
            else:
                print(f"Successfully scraped {len(reviews)} real reviews.")

            # POST to backend
            try:
                res = requests.post(f"{API_BASE}/products/{p_id}/reviews", json=reviews)
                if res.status_code == 200:
                    print(f"✅ Successfully seeded {len(reviews)} reviews for product {p_id}")
                else:
                    print(f"❌ Failed to seed reviews for product {p_id}:", res.text)
            except Exception as e:
                print("Error sending reviews to API:", e)
            
            # Be nice to the server
            time.sleep(2)

        browser.close()

def scrape_reviews_for_url(page, url):
    reviews = []
    try:
        page.goto(url, timeout=60000)
        time.sleep(3)
        
        # Click on "Xem thêm đánh giá" or navigate to the review box if needed
        # TGDD reviews are usually inside .comment-list or .rating-lst
        
        html = page.content()
        soup = BeautifulSoup(html, 'html.parser')
        
        review_elements = soup.select('.comment-list .comment-item')
        if not review_elements:
             # Try alternative selector
             review_elements = soup.select('.rating-lst .rating-cmt')
        
        for el in review_elements[:10]: # Limit to 10 reviews for now
            name_el = el.select_one('.cmt-top-name') or el.select_one('.txtname')
            content_el = el.select_one('.cmt-txt') or el.select_one('.cmt-content')
            
            name = name_el.text.strip() if name_el else f"User {random.randint(100, 999)}"
            content = content_el.text.strip() if content_el else ""
            
            # Rating might be represented by stars
            stars = el.select('.icon-star') or el.select('.icon-star-full')
            rating = len(stars) if stars else 5
            if rating == 0: rating = 5
            
            if content:
                reviews.append({
                    "reviewerName": name,
                    "content": content,
                    "rating": rating
                })
                
    except Exception as e:
        print(f"Exception during scraping: {e}")
        
    return reviews

if __name__ == "__main__":
    backfill_reviews()
