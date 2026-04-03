import httpx
import os
from dotenv import load_dotenv

load_dotenv()

class PlacesService:
    def __init__(self):
        self.base_url = "https://overpass-api.de/api/interpreter"

    async def search_nearby_food(self, lat: float, lng: float, preference: str = "balanced"):
        # List of mirrors to try if the main one is slow/down
        endpoints = [
            "https://overpass-api.de/api/interpreter",
            "https://lz4.overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.openstreetmap.ru/api/interpreter"
        ]
        
        query = f"""
        [out:json][timeout:25];
        (
          node(around:2000,{lat},{lng})[amenity~"restaurant|cafe|fast_food|food_court"];
          way(around:2000,{lat},{lng})[amenity~"restaurant|cafe|fast_food|food_court"];
          relation(around:2000,{lat},{lng})[amenity~"restaurant|cafe|fast_food|food_court"];
        );
        out center;
        """
        
        last_error = None
        for url in endpoints:
            try:
                print(f"[Places/Overpass] Trying endpoint: {url}")
                async with httpx.AsyncClient() as client:
                    response = await client.post(url, data={"data": query}, timeout=30.0)
                    response.raise_for_status()
                    data = response.json()
                    
                    elements = data.get("elements", [])
                    processed_places = []
                    
                    for e in elements:
                        tags = e.get("tags", {})
                        name = tags.get("name", "Tempat Makan")
                        amenity = tags.get("amenity", "restaurant")
                        cuisine = (tags.get("cuisine") or tags.get("description") or "").lower()
                        name_lc = name.lower()

                        # filtering logic...
                        unhealthy = ["fast_food", "pizza", "burger", "coffee", "starbucks", "jco", "donut"]
                        is_junk = any(kw in cuisine or kw in name_lc or kw in amenity for kw in unhealthy)
                        healthy_kw = ["healthy", "salad", "vegetable", "vegan", "ikan", "rebus"]
                        is_healthy = any(kw in cuisine or kw in name_lc for kw in healthy_kw)

                        if preference == "healthy" and is_junk: continue
                        
                        affordable_kw = ["warung", "local", "food_court", "padang", "tegal"]
                        is_affordable = any(kw in cuisine or kw in name_lc or kw in amenity for kw in affordable_kw)
                        if preference == "affordable" and not is_affordable: continue

                        processed_places.append({
                            "name": name,
                            "rating": 4.5 if is_healthy else 4.0,
                            "price_level": "Affordable" if is_affordable else "Moderate",
                            "address": cuisine if cuisine else amenity.replace("_", " ")
                        })

                    if processed_places:
                        print(f"[Places/Overpass] Success with {url}, found {len(processed_places)}")
                        return processed_places[:5]
                    else:
                        # If no results but no error, maybe this area is empty in OSM
                        continue

            except Exception as e:
                last_error = e
                print(f"[Places/Overpass] Failed {url}: {type(e).__name__}")
                continue
                
        if last_error:
            import traceback
            print(f"[Places/Overpass] All endpoints failed. Last error: {last_error}")
        return []

places_service = PlacesService()
