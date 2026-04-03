import requests
import os

# Alamat API lo
API_URL = "http://127.0.0.1:8000/analyze"

def test_cimeat_ai(image_path):
    print(f"🚀 Testing Cimeat AI with image: {image_path}")
    
    if not os.path.exists(image_path):
        print(f"❌ Error: File {image_path} tidak ditemukan!")
        return

    # Kirim as multipart/form-data
    with open(image_path, 'rb') as img:
        files = {'image': (os.path.basename(image_path), img, 'image/jpeg')}
        try:
            response = requests.post(API_URL, files=files, timeout=60)
            response.raise_for_status()
            
            print("\n✅ RESPONSE DARI AI (JSON):")
            print("-" * 30)
            import json
            print(json.dumps(response.json(), indent=2))
            print("-" * 30)
            
        except requests.exceptions.HTTPError as err:
            print(f"❌ API Error: {err}")
            print(f"Response Detail: {response.text}")
        except Exception as e:
            print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    # Ganti path ini ke foto makanan yang lo punya di Desktop
    # Contoh: "food.jpg"
    test_image = "food_sample.jpg" 
    
    # Cek kalo filenya belum ada, lo bisa taro foto apa aja ke folder backend/food_sample.jpg
    test_cimeat_ai(test_image)
