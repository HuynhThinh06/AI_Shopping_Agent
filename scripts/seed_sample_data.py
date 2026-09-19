import json
import requests

API_URL = "http://localhost:8080/api/seed/products"


sample_data = [
    # Laptops
    {
        "categoryCode": "LAPTOP",
        "name": "MacBook Pro 14 M3",
        "brand": "Apple",
        "price": 39990000,
        "sku": "MAC-M3-14",
        "productUrl": "https://example.com/macbook-pro-14",
        "avgRating": 4.9,
        "reviewCount": 120,
        "specs": {
            "cpu": "Apple M3",
            "ram": 16,
            "storage": 512,
            "battery": 70,
            "screen_size": 14.2,
            "weight": 1.55
        }
    },
    {
        "categoryCode": "LAPTOP",
        "name": "Dell XPS 15 9530",
        "brand": "Dell",
        "price": 45000000,
        "sku": "DELL-XPS-15",
        "productUrl": "https://example.com/dell-xps-15",
        "avgRating": 4.7,
        "reviewCount": 85,
        "specs": {
            "cpu": "Intel Core i7-13700H",
            "ram": 32,
            "storage": 1024,
            "battery": 86,
            "screen_size": 15.6,
            "weight": 1.92
        }
    },
    {
        "categoryCode": "LAPTOP",
        "name": "Asus ROG Zephyrus G14",
        "brand": "Asus",
        "price": 35000000,
        "sku": "ASUS-ROG-G14",
        "productUrl": "https://example.com/asus-rog-g14",
        "avgRating": 4.8,
        "reviewCount": 200,
        "specs": {
            "cpu": "AMD Ryzen 9 7940HS",
            "ram": 16,
            "storage": 1024,
            "battery": 76,
            "screen_size": 14.0,
            "weight": 1.65
        }
    },
    {
        "categoryCode": "LAPTOP",
        "name": "Lenovo ThinkPad X1 Carbon Gen 11",
        "brand": "Lenovo",
        "price": 42000000,
        "sku": "LENOVO-X1-GEN11",
        "productUrl": "https://example.com/lenovo-x1",
        "avgRating": 4.6,
        "reviewCount": 50,
        "specs": {
            "cpu": "Intel Core i7-1355U",
            "ram": 16,
            "storage": 512,
            "battery": 57,
            "screen_size": 14.0,
            "weight": 1.12
        }
    },
    {
        "categoryCode": "LAPTOP",
        "name": "HP Spectre x360 14",
        "brand": "HP",
        "price": 38000000,
        "sku": "HP-SPECTRE-14",
        "productUrl": "https://example.com/hp-spectre-14",
        "avgRating": 4.5,
        "reviewCount": 75,
        "specs": {
            "cpu": "Intel Core Ultra 7 155H",
            "ram": 16,
            "storage": 1024,
            "battery": 68,
            "screen_size": 14.0,
            "weight": 1.44
        }
    },

    # Phones
    {
        "categoryCode": "PHONE",
        "name": "iPhone 15 Pro Max",
        "brand": "Apple",
        "price": 29990000,
        "sku": "IP15-PM-256",
        "productUrl": "https://example.com/iphone-15-pro-max",
        "avgRating": 4.9,
        "reviewCount": 500,
        "specs": {
            "chipset": "Apple A17 Pro",
            "ram": 8,
            "storage": 256,
            "battery": 4422,
            "screen_size": 6.7,
            "camera": 48
        }
    },
    {
        "categoryCode": "PHONE",
        "name": "Samsung Galaxy S24 Ultra",
        "brand": "Samsung",
        "price": 28000000,
        "sku": "SAM-S24U-256",
        "productUrl": "https://example.com/samsung-s24-ultra",
        "avgRating": 4.8,
        "reviewCount": 420,
        "specs": {
            "chipset": "Snapdragon 8 Gen 3",
            "ram": 12,
            "storage": 256,
            "battery": 5000,
            "screen_size": 6.8,
            "camera": 200
        }
    },
    {
        "categoryCode": "PHONE",
        "name": "Xiaomi 14 Pro",
        "brand": "Xiaomi",
        "price": 22000000,
        "sku": "XIAOMI-14P",
        "productUrl": "https://example.com/xiaomi-14-pro",
        "avgRating": 4.7,
        "reviewCount": 150,
        "specs": {
            "chipset": "Snapdragon 8 Gen 3",
            "ram": 12,
            "storage": 256,
            "battery": 4880,
            "screen_size": 6.73,
            "camera": 50
        }
    },
    {
        "categoryCode": "PHONE",
        "name": "Google Pixel 8 Pro",
        "brand": "Google",
        "price": 24000000,
        "sku": "PIXEL-8P",
        "productUrl": "https://example.com/pixel-8-pro",
        "avgRating": 4.6,
        "reviewCount": 110,
        "specs": {
            "chipset": "Google Tensor G3",
            "ram": 12,
            "storage": 128,
            "battery": 5050,
            "screen_size": 6.7,
            "camera": 50
        }
    },
    {
        "categoryCode": "PHONE",
        "name": "Oppo Find X7 Ultra",
        "brand": "Oppo",
        "price": 26000000,
        "sku": "OPPO-X7U",
        "productUrl": "https://example.com/oppo-find-x7-ultra",
        "avgRating": 4.5,
        "reviewCount": 90,
        "specs": {
            "chipset": "Snapdragon 8 Gen 3",
            "ram": 12,
            "storage": 256,
            "battery": 5000,
            "screen_size": 6.82,
            "camera": 50
        }
    }
]

def seed_data():
    img_path = r"C:\Users\Lenovo\.gemini\antigravity\brain\bd15bc5d-2e4c-4c60-bcae-41d58ff9ad0a\dummy_image.jpg"
    try:
        with open(img_path, 'rb') as f:
            img_bytes = f.read()
    except Exception:
        img_bytes = b'fake_image_content'
        
    for data in sample_data:
        print(f"Seeding {data['name']}...")
        files = {
            "productData": (None, json.dumps(data), "application/json"),
            "images": ("dummy.jpg", img_bytes, "image/jpeg")
        }
        res = requests.post(API_URL, files=files)
        if res.status_code == 200:
            print(" -> Success!")
        else:
            print(" -> Error:", res.text)

if __name__ == "__main__":
    seed_data()
