import json
import time
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

API_URL = "http://localhost:8080/api/seed/products"

def scrape_tgdd():
    with sync_playwright() as p:
        # headless=True is default, using headless to run in background
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()

        # Scrape Laptops
        scrape_category(page, "https://www.thegioididong.com/laptop", "Laptop")
        
        # Scrape Phones
        scrape_category(page, "https://www.thegioididong.com/dtdd", "Điện thoại")

        browser.close()

def scrape_category(page, category_url, category_name):
    print(f"\n--- Đang lấy danh sách {category_name} từ {category_url} ---")
    page.goto(category_url, timeout=60000)
    time.sleep(3) 

    html = page.content()
    soup = BeautifulSoup(html, 'html.parser')

    # Get first 5 products
    product_items = soup.select('.main-contain .item > a:first-child')
    if not product_items:
        # Fallback to general item link
        product_items = soup.select('.item a.main-contain')
    
    if not product_items:
        product_items = soup.select('li.item > a')

    if not product_items:
        print(f"Không tìm thấy danh sách sản phẩm {category_name}! Đang chụp màn hình...")
        page.screenshot(path=f"{category_name}_error.png")
        return

    product_urls = []
    for item in product_items[:5]: 
        link = item.get('href')
        if link and not link.startswith('http'):
            link = "https://www.thegioididong.com" + link
        product_urls.append(link)

    print(f"Tìm thấy {len(product_urls)} {category_name}.")

    for url in product_urls:
        print(f"-> Đang cào: {url}")
        try:
            page.goto(url, timeout=60000)
            time.sleep(3) 
            
            detail_html = page.content()
            detail_soup = BeautifulSoup(detail_html, 'html.parser')

            # Name
            name_tag = detail_soup.select_one('h1')
            name = name_tag.text.strip() if name_tag else "Unknown"
            if name == "Unknown":
                print("Lỗi: Không lấy được tên sản phẩm, có thể bị chặn hoặc sai cấu trúc HTML.")
                continue

            # Price
            price_tag = detail_soup.select_one('.box-price-present')
            price_text = price_tag.text.strip().replace('₫', '').replace('.', '').replace('*', '') if price_tag else "0"
            # Remove any trailing non-digits if present
            price_text = ''.join(filter(str.isdigit, price_text))
            price = int(price_text) if price_text.isdigit() else 0

            # Image
            img_tag = detail_soup.select_one('.owl-carousel .item img')
            img_url = img_tag.get('src') if img_tag else ""
            if not img_url:
                 # Try another fallback
                 img_tag = detail_soup.select_one('.detail-slider img')
                 img_url = img_tag.get('src') if img_tag else ""

            # Specs
            specs = {}
            spec_items = detail_soup.select('.parameter .parameter__item')
            if not spec_items:
                spec_items = detail_soup.select('.parameter-all li')

            for item in spec_items:
                key_tag = item.select_one('.lileft')
                val_tag = item.select_one('.liright')
                if key_tag and val_tag:
                    key = key_tag.text.strip().replace(':', '')
                    val = val_tag.text.strip()
                    specs[key] = val

            # Brand
            brand = "Unknown"
            breadcrumbs = detail_soup.select('.breadcrumb li a')
            if len(breadcrumbs) >= 3:
                brand = breadcrumbs[2].text.strip()

            product_data = {
                "name": name,
                "brand": brand,
                "categoryCode": "LAPTOP" if "Laptop" in category_name else "PHONE",
                "price": price,
                "sku": f"TGDD-{int(time.time()*1000)}", 
                "productUrl": url,
                "specs": specs
            }

            send_to_api(product_data, img_url)

        except Exception as e:
            print(f"Lỗi khi cào {url}: {e}")

def send_to_api(product_data, img_url):
    print(f"  Gửi sản phẩm [{product_data['name']}]...")
    
    files = {
        "productData": (None, json.dumps(product_data), "application/json")
    }

    if img_url:
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            img_response = requests.get(img_url, headers=headers, timeout=10)
            if img_response.status_code == 200:
                # determine content type based on URL
                ctype = "image/jpeg"
                if ".png" in img_url.lower(): ctype = "image/png"
                elif ".webp" in img_url.lower(): ctype = "image/webp"
                
                files["images"] = ("image.jpg", img_response.content, ctype)
        except Exception as e:
            print(f"  Lỗi khi tải ảnh: {e}")

    try:
        response = requests.post(API_URL, files=files)
        if response.status_code == 200:
            print(f"  ✅ Đã lưu thành công.")
        else:
            print(f"  ❌ Lỗi API ({response.status_code}): {response.text}")
    except Exception as e:
        print(f"  ❌ Không kết nối được tới Backend: {e}")

if __name__ == "__main__":
    scrape_tgdd()
