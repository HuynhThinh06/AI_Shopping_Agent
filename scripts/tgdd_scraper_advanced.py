import json
import time
import re
import random
import requests
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

API_URL = "http://localhost:8080/api/seed/products"
TARGET_COUNT = 20

def parse_specs(raw_specs, category_code):
    specs = {}
    if category_code == "LAPTOP":
        # CPU
        if "CPU" in raw_specs:
            specs["cpu"] = raw_specs["CPU"]
        elif "Chíp xử lý" in raw_specs:
            specs["cpu"] = raw_specs["Chíp xử lý"]
        # RAM
        if "RAM" in raw_specs:
            m = re.search(r'(\d+)\s*GB', raw_specs["RAM"])
            if m: specs["ram"] = int(m.group(1))
        # Storage
        if "Ổ cứng" in raw_specs:
            m = re.search(r'(\d+)\s*(GB|TB)', raw_specs["Ổ cứng"])
            if m:
                val = int(m.group(1))
                if m.group(2) == 'TB': val *= 1024
                specs["storage"] = val
        # Screen
        if "Màn hình" in raw_specs:
            m = re.search(r'(\d+\.?\d*)\s*inch', raw_specs["Màn hình"].lower())
            if m: specs["screen_size"] = float(m.group(1))
        # Battery
        if "Thông tin Pin" in raw_specs or "Pin" in raw_specs:
            val = raw_specs.get("Thông tin Pin", raw_specs.get("Pin", ""))
            m = re.search(r'(\d+\.?\d*)\s*Wh', val)
            if m: specs["battery"] = float(m.group(1))
            else: specs["battery"] = random.choice([42, 50, 70, 86, 90]) # fallback
        else: specs["battery"] = random.choice([42, 50, 70, 86, 90])
        # Weight
        if "Trọng lượng" in raw_specs or "Kích thước, khối lượng" in raw_specs:
            val = raw_specs.get("Trọng lượng", raw_specs.get("Kích thước, khối lượng", ""))
            m = re.search(r'Nặng\s*(\d+\.?\d*)\s*kg', val) or re.search(r'(\d+\.?\d*)\s*kg', val)
            if m: specs["weight"] = float(m.group(1))
            else: specs["weight"] = 1.5

    elif category_code == "PHONE":
        # Chipset
        if "Chip xử lý (CPU)" in raw_specs: specs["chipset"] = raw_specs["Chip xử lý (CPU)"]
        elif "Chip" in raw_specs: specs["chipset"] = raw_specs["Chip"]
        # RAM
        if "RAM" in raw_specs:
            m = re.search(r'(\d+)\s*GB', raw_specs["RAM"])
            if m: specs["ram"] = int(m.group(1))
        # Storage
        if "Dung lượng lưu trữ" in raw_specs or "ROM" in raw_specs:
            val = raw_specs.get("Dung lượng lưu trữ", raw_specs.get("ROM", ""))
            m = re.search(r'(\d+)\s*(GB|TB)', val)
            if m:
                val_num = int(m.group(1))
                if m.group(2) == 'TB': val_num *= 1024
                specs["storage"] = val_num
        # Screen
        if "Màn hình" in raw_specs:
            m = re.search(r'(\d+\.?\d*)\s*inch', raw_specs["Màn hình"].lower())
            if m: specs["screen_size"] = float(m.group(1))
            elif "inch" in raw_specs["Màn hình"]:
                # Sometimes it's inside another tag or weird format
                m = re.search(r'(\d+\.?\d*)"', raw_specs["Màn hình"])
                if m: specs["screen_size"] = float(m.group(1))
        # Camera
        if "Camera sau" in raw_specs:
            m = re.search(r'(\d+)\s*MP', raw_specs["Camera sau"])
            if m: specs["camera"] = int(m.group(1))
        # Battery
        if "Dung lượng pin" in raw_specs or "Pin" in raw_specs:
            val = raw_specs.get("Dung lượng pin", raw_specs.get("Pin", ""))
            m = re.search(r'(\d+)\s*mAh', val)
            if m: specs["battery"] = int(m.group(1))

    return specs

def scrape_tgdd():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()

        # Scrape Laptops
        scrape_category(page, "https://www.thegioididong.com/laptop", "Laptop", "LAPTOP")
        
        # Scrape Phones
        scrape_category(page, "https://www.thegioididong.com/dtdd", "Điện thoại", "PHONE")

        browser.close()

def scrape_category(page, category_url, category_name, category_code):
    print(f"\n--- Đang lấy danh sách {category_name} từ {category_url} ---")
    
    try:
        page.goto(category_url, timeout=60000)
    except Exception as e:
        print(f"Error loading {category_url}: {e}")
        return

    time.sleep(3) 

    # Scroll a bit to load more items (TGDD uses lazy loading)
    for _ in range(5):
        page.mouse.wheel(0, 1000)
        time.sleep(1)

    html = page.content()
    soup = BeautifulSoup(html, 'html.parser')

    product_items = soup.select('.main-contain .item > a:first-child')
    if not product_items:
        product_items = soup.select('.item a.main-contain')
    if not product_items:
        product_items = soup.select('li.item > a')

    product_urls = []
    for item in product_items:
        link = item.get('href')
        if not link: continue
        if not link.startswith('http'):
            link = "https://www.thegioididong.com" + link
        
        # Avoid weird SEO links like iPhone 18 if they exist, or promo links
        if "/dtdd/" in link or "/laptop/" in link:
            if link not in product_urls:
                product_urls.append(link)

    print(f"Tìm thấy {len(product_urls)} links {category_name}.")

    saved_count = 0
    for url in product_urls:
        if saved_count >= TARGET_COUNT:
            break

        print(f"-> Đang cào: {url}")
        try:
            page.goto(url, timeout=60000)
            time.sleep(3) 
            
            detail_html = page.content()
            detail_soup = BeautifulSoup(detail_html, 'html.parser')

            # Name
            name_tag = detail_soup.select_one('h1')
            name = name_tag.text.strip() if name_tag else "Unknown"
            if name == "Unknown" or not name:
                print("Lỗi: Không lấy được tên sản phẩm.")
                continue

            # Price
            price_tag = detail_soup.select_one('.box-price-present')
            price_text = price_tag.text.strip().replace('₫', '').replace('.', '').replace('*', '') if price_tag else "0"
            price_text = ''.join(filter(str.isdigit, price_text))
            price = int(price_text) if price_text.isdigit() else 0

            # Skip products without price
            if price == 0:
                print("Lỗi: Sản phẩm chưa có giá hoặc ngừng kinh doanh.")
                continue

            # Image
            img_tag = detail_soup.select_one('.owl-carousel .item img')
            img_url = img_tag.get('src') if img_tag else ""
            if not img_url:
                 img_tag = detail_soup.select_one('.detail-slider img')
                 img_url = img_tag.get('src') if img_tag else ""

            # Raw Specs
            raw_specs = {}
            # TGDD uses a combination of classes for specs. Let's try multiple fallbacks.
            box_specifi = detail_soup.select('.box-specifi aside')
            if box_specifi:
                current_key = None
                for aside in box_specifi:
                    strong = aside.select_one('strong')
                    if strong:
                        current_key = strong.text.strip().replace(':', '')
                    elif current_key:
                        raw_specs[current_key] = aside.text.strip()
                        current_key = None
            else:
                spec_items = detail_soup.select('.parameter .parameter__item') or detail_soup.select('.parameter-all li')
                for item in spec_items:
                    key_tag = item.select_one('.lileft')
                    val_tag = item.select_one('.liright')
                    if key_tag and val_tag:
                        key = key_tag.text.strip().replace(':', '')
                        val = val_tag.text.strip()
                        raw_specs[key] = val
                    
            if not raw_specs:
                print("Lỗi: Không tìm thấy bảng thông số kỹ thuật.")
                continue

            # Parse and map specs
            mapped_specs = parse_specs(raw_specs, category_code)

            # Brand
            brand = "Unknown"
            breadcrumbs = detail_soup.select('.breadcrumb li a')
            if len(breadcrumbs) >= 3:
                brand = breadcrumbs[2].text.strip()
            
            if brand == "Unknown":
                # Fallback to extract from name
                brand = name.split(" ")[1] if len(name.split(" ")) > 1 else "Unknown"

            # Randomize review data to make it look real (TGDD reviews are often loaded via API)
            rating_tag = detail_soup.select_one('.point')
            if rating_tag and rating_tag.text.strip().replace('.','').isdigit():
                avg_rating = float(rating_tag.text.strip())
            else:
                avg_rating = round(random.uniform(3.5, 5.0), 1)
                
            review_count = random.randint(5, 500)

            product_data = {
                "name": name,
                "brand": brand,
                "categoryCode": category_code,
                "price": price,
                "sku": f"TGDD-{int(time.time()*1000)}-{random.randint(100, 999)}", 
                "productUrl": url,
                "avgRating": avg_rating,
                "reviewCount": review_count,
                "specs": mapped_specs
            }

            if send_to_api(product_data, img_url):
                saved_count += 1
                print(f"  Thành công! Đã lưu {saved_count}/{TARGET_COUNT} {category_name}.")

        except Exception as e:
            print(f"Lỗi khi cào {url}: {e}")

def send_to_api(product_data, img_url):
    files = {
        "productData": (None, json.dumps(product_data), "application/json")
    }

    if img_url:
        try:
            headers = {"User-Agent": "Mozilla/5.0"}
            img_response = requests.get(img_url, headers=headers, timeout=10)
            if img_response.status_code == 200:
                ctype = "image/jpeg"
                if ".png" in img_url.lower(): ctype = "image/png"
                elif ".webp" in img_url.lower(): ctype = "image/webp"
                files["images"] = ("image.jpg", img_response.content, ctype)
        except Exception as e:
            print(f"  Lỗi khi tải ảnh: {e}")
            return False

    try:
        response = requests.post(API_URL, files=files)
        if response.status_code == 200:
            return True
        else:
            print(f"  Lỗi API ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        print(f"  Không kết nối được API: {e}")
        return False

if __name__ == "__main__":
    scrape_tgdd()
