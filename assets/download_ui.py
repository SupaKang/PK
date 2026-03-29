"""
Download all generated UI assets from PixelLab MCP API.
"""
import os, json, re, base64, urllib.request, time

API_KEY = "3de81da2-7db2-4684-8344-4d812ce99d3c"
MCP_URL = "https://api.pixellab.ai/mcp"

# UI Frame assets - Batch 1 (Battle + Common)
UI_ASSETS = {
    "UI01_hp_bar_frame":     "515d6509-e974-4909-9269-aa079dacda85",
    "UI02_message_box":      "25a683f0-cef1-4f18-a471-593ac1c47ec9",
    "UI03_skill_menu":       "a8cd2c6b-080d-4acf-b23c-55d84447b8d1",
    "UI04_action_menu":      "24fe1111-73d7-4b8e-bfd1-3461f6e90560",
    "UI05_list_panel":       "add521f4-50f6-49a5-b939-54e8b5c461ea",
    "UI06_dialog_box":       "7b44e2aa-e512-49b8-96b1-44dfe02fe772",
    "UI07_party_slot":       "74ebb72a-9dad-4a5d-9ecf-f3f92cf7192c",
    "UI08_save_slot":        "ce3450f5-a2dc-4753-98bc-e8553e44368b",
    # Batch 2
    "UI17_title_logo":       "7a1e2e74-c384-4130-9f3d-d2b747533026",
    "UI18_progress_bar":     "b4674c8b-f474-43a1-bbb6-5b5f60bb8f20",
    "UI15_shop_tabs":        "1f6c119c-d043-46e1-90f5-caa4ac8b4fb9",
    "UI16_inv_tabs":         "d8b44faa-47c6-467e-8fea-b9200f6f485b",
    "UC10_battle_platform":  "f9d65a7d-a05a-4e9c-b418-80f436dd04dc",
    "UC03_gold_icon":        "fd75940a-62a4-4ced-9f9d-00534db37c9e",
    "UC06_touch_dpad":       "dede3e95-d8bf-4dc1-8bd6-83fe1eb10d73",
    "UC07_touch_a_button":   "88884f76-6a22-4d94-b156-52e0563f5698",
}

OUT_DIR = os.path.join(os.path.dirname(__file__), "ui", "candidates")

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

def extract_image(sse_text):
    matches = re.findall(r'"data":\s*"([A-Za-z0-9+/=]{100,})"', sse_text)
    if matches:
        return base64.b64decode(matches[0])
    return None

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    success = 0
    fail = 0

    for name, oid in UI_ASSETS.items():
        if oid == "PENDING":
            print(f"-- {name}: PENDING")
            fail += 1
            continue

        png_path = os.path.join(OUT_DIR, f"{name}.png")
        if os.path.exists(png_path) and os.path.getsize(png_path) > 100:
            print(f"OK {name}: already downloaded ({os.path.getsize(png_path)} bytes)")
            success += 1
            continue

        try:
            text = mcp_call("get_map_object", {"object_id": oid})
            png_data = extract_image(text)

            if png_data and len(png_data) > 100:
                with open(png_path, "wb") as f:
                    f.write(png_data)
                print(f"OK {name}: {len(png_data)} bytes")
                success += 1
            elif "processing" in text.lower() or "generating" in text.lower():
                print(f".. {name}: still generating...")
                fail += 1
            else:
                print(f"XX {name}: no image data")
                fail += 1
        except Exception as e:
            print(f"XX {name}: {e}")
            fail += 1

        time.sleep(0.5)

    print(f"\nDownloaded: {success}/{len(UI_ASSETS)}")
    if fail > 0:
        print(f"Failed/Pending: {fail}")

if __name__ == "__main__":
    main()
