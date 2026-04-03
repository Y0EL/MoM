import httpx
import json

async def test_voice_analysis():
    url = "http://localhost:8000/analyze-text"
    payload = {"text": "Gue tadi makan sate ayam 5 tusuk sama es teh manis"}
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            print(f"Testing analysis for: '{payload['text']}'")
            res = await client.post(url, json=payload)
            print(f"Status: {res.status_code}")
            print(f"Response: {json.dumps(res.json(), indent=2)}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_voice_analysis())
