"""
Download all generated tilesets from PixelLab MCP API.
Uses JSON-RPC over HTTP to call get_topdown_tileset.
"""
import os, json, re, base64, urllib.request, time

API_KEY = "3de81da2-7db2-4684-8344-4d812ce99d3c"
MCP_URL = "https://api.pixellab.ai/mcp"

TILESETS = {
    "T01_grass_dirt":        "3a28efc4-b28c-439e-bf6a-12aa2dbfec5b",
    "T02_dirt_stone":        "df7e8297-f4ea-4438-921d-ca9606aad706",
    "T03_ocean_beach":       "b6378534-343f-4cc0-b68a-0b12e2589401",
    "T04_beach_grass":       "38fdebe5-5a01-496c-b54a-84c29fa6792d",
    "T05_forest_grass":      "1cd50fa6-3135-425d-9894-fba2357aab1a",
    "T06_snow_ice":          "70ea80a4-fedd-4766-89fa-ab6a3204aa10",
    "T07_volcanic_lava":     "82bd7aaa-8127-4737-ab0c-5504a8675450",
    "T08_cave_wall":         "d3837e73-c8ab-4402-90ec-aaabf78f94d7",
    "T09_cobblestone_grass": "3639c0b0-a5a6-4deb-82e8-30ae3261f5e5",
    "T10_swamp_marsh":       "7faed228-0455-4b59-9f6f-6b84e54d94d2",
    "T11_crystal_cave":      "187be617-dd95-420c-8750-a82f4ef8183c",
    "T12_corrupted_obsidian":"8960be71-8f5b-4b75-a5a9-9b6ac0ea35e2",
    "T13_gym_fire":          "ea6a16c2-1eca-45ad-a359-65e4cd593ced",
    "T14_gym_water":         "ad634fad-fae0-4fc3-b679-4d10a8c3b293",
    "T15_gym_electric":      "27fdac8f-8a83-48b6-b809-4cd7e35bae0b",
    "T16_gym_nature":        "0243ecbc-30e3-4c62-b35b-2f22eaeb687e",
    "T17_gym_fighting":      "e3d91796-9145-48f3-ac82-0b7dbb9ff78f",
    "T18_gym_ice":           "015b5f9c-bee5-4041-b413-28410164da22",
    "T19_gym_dragon":        "f5943693-3980-4d90-8660-ffaf7de07549",
    "T20_gym_dark":          "7328653a-1ef6-4bba-a1cb-259a8bada230",
}

OUT_DIR = os.path.join(os.path.dirname(__file__), "tiles", "candidates")

def mcp_call(method, tool_name, arguments):
    body = json.dumps({
        "jsonrpc": "2.0",
        "method": method,
        "params": {"name": tool_name, "arguments": arguments},
        "id": 1
    }).encode()
    req = urllib.request.Request(MCP_URL, data=body, headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "User-Agent": "pixellab-download/1.0",
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")

def extract_image(sse_text):
    matches = re.findall(r'"data":\s*"([A-Za-z0-9+/=]{100,})"', sse_text)
    if matches:
        return base64.b64decode(matches[0])
    return None

def extract_metadata(sse_text):
    # Extract the text content which contains metadata info
    text_matches = re.findall(r'"text":\s*"((?:[^"\\]|\\.)*)"', sse_text)
    return text_matches

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    success = 0
    fail = 0

    for name, tid in TILESETS.items():
        png_path = os.path.join(OUT_DIR, f"{name}.png")

        if os.path.exists(png_path) and os.path.getsize(png_path) > 100:
            print(f"✅ {name}: already downloaded ({os.path.getsize(png_path)} bytes)")
            success += 1
            continue

        try:
            text = mcp_call("tools/call", "get_topdown_tileset", {"tileset_id": tid})
            png_data = extract_image(text)

            if png_data and len(png_data) > 100:
                with open(png_path, "wb") as f:
                    f.write(png_data)
                print(f"✅ {name}: {len(png_data)} bytes")
                success += 1
            elif "still being generated" in text.lower() or "processing" in text.lower():
                print(f"⏳ {name}: still generating...")
                fail += 1
            else:
                print(f"❌ {name}: no image data found")
                fail += 1
        except Exception as e:
            print(f"❌ {name}: {e}")
            fail += 1

        time.sleep(0.5)  # Rate limiting

    print(f"\n{'='*40}")
    print(f"Downloaded: {success}/{len(TILESETS)}")
    if fail > 0:
        print(f"Failed/Pending: {fail} (re-run script later)")
    print(f"Output: {OUT_DIR}")

if __name__ == "__main__":
    main()
