"""
Download Wang tileset metadata from PixelLab MCP API.
Extracts tile corner data for autotiling.
"""
import os, json, re, urllib.request, time

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
}

OUT_DIR = os.path.join(os.path.dirname(__file__), "tiles", "candidates")

def mcp_call(tool_name, arguments):
    body = json.dumps({
        "jsonrpc": "2.0",
        "method": "tools/call",
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

def parse_metadata_from_sse(text):
    """Extract tile metadata from MCP SSE response text."""
    # Find the text content that contains metadata info
    # The response has format: tileset15, with tiles having corners and bounding_box
    # Parse the JSON structure from SSE event data

    # Look for the JSON data event
    data_matches = re.findall(r'data:\s*(\{.*?\})\s*\n', text, re.DOTALL)

    for dm in data_matches:
        try:
            parsed = json.loads(dm)
            result = parsed.get("result", {})
            content = result.get("content", [])
            for item in content:
                if item.get("type") == "text":
                    raw = item["text"]
                    # Try to find JSON metadata structure in text
                    # Look for tiles array pattern
                    meta_match = re.search(r'\{[^{}]*"format"[^{}]*"tiles"\s*:\s*\[', raw)
                    if meta_match:
                        # Extract full JSON from this point
                        start = raw.index('{"format"') if '{"format"' in raw else -1
                        if start >= 0:
                            # Find matching close
                            depth = 0
                            for i in range(start, len(raw)):
                                if raw[i] == '{': depth += 1
                                elif raw[i] == '}': depth -= 1
                                if depth == 0:
                                    return json.loads(raw[start:i+1])
        except (json.JSONDecodeError, ValueError, KeyError):
            continue

    # Fallback: try to extract corners info from the text
    # Parse the example metadata shown in the response
    tiles = []
    tile_pattern = re.findall(
        r'"id":\s*"(\d+)".*?"corners":\s*\{.*?"NE":\s*"(\w+)".*?"NW":\s*"(\w+)".*?"SE":\s*"(\w+)".*?"SW":\s*"(\w+)".*?"bounding_box":\s*\{.*?"x":\s*(\d+).*?"y":\s*(\d+).*?"width":\s*(\d+).*?"height":\s*(\d+)',
        text, re.DOTALL
    )
    if tile_pattern:
        for t in tile_pattern:
            tiles.append({
                "id": t[0],
                "corners": {"NE": t[1], "NW": t[2], "SE": t[3], "SW": t[4]},
                "bounding_box": {"x": int(t[5]), "y": int(t[6]), "width": int(t[7]), "height": int(t[8])}
            })
        return {"format": "tileset15", "tiles": tiles}

    return None

def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    for name, tid in TILESETS.items():
        meta_path = os.path.join(OUT_DIR, f"{name}_meta.json")
        if os.path.exists(meta_path) and os.path.getsize(meta_path) > 50:
            print(f"OK {name}: already exists")
            continue

        try:
            text = mcp_call("get_topdown_tileset", {"tileset_id": tid})
            meta = parse_metadata_from_sse(text)

            if meta and meta.get("tiles"):
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump(meta, f, indent=2)
                print(f"OK {name}: {len(meta['tiles'])} tiles")
            else:
                # Save raw response for debugging
                with open(meta_path + ".raw.txt", "w", encoding="utf-8") as f:
                    f.write(text)
                print(f"?? {name}: could not parse metadata, saved raw")
        except Exception as e:
            print(f"XX {name}: {e}")

        time.sleep(0.5)

    print("Done!")

if __name__ == "__main__":
    main()
