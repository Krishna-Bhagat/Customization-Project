# Customizer Side QA Checklist

Use this script to validate side consistency and object editing behavior across:

- Front
- Back
- Left Sleeve
- Right Sleeve

Run backend and frontend in development so debug logs are visible.

## 1. Environment Setup

1. Start backend:
```bash
cd backend
npm run dev
```
2. Start frontend:
```bash
cd frontend
npm run dev
```
3. Open app in browser and navigate to a product that supports all 4 sides.
4. Open DevTools Console to observe `[GiftCraft][customizer]` logs.

## 2. Per-Side Test Flow

Run the full flow below for each side in this order:

1. Front
2. Back
3. Left Sleeve
4. Right Sleeve

For each side:

1. Switch to side tab.
2. Upload image:
   - Verify image appears immediately.
   - Drag image inside printable area.
   - Resize from corner handles.
   - Rotate image.
3. Add text:
   - Open `Text` tool.
   - Add new text and confirm it appears immediately.
   - Drag and resize text.
4. Text editing validation:
   - Tap/select text object and verify edit drawer opens.
   - Change content, font, color, size, bold/italic/underline/alignment.
   - Click `Apply Changes`, confirm object updates on canvas.
5. Double edit behavior:
   - Desktop: double-click text object.
   - Mobile: double-tap text object.
   - Confirm text edit drawer opens for existing object (no duplicate text object created).
6. Layer checks:
   - Open `Layers`.
   - Select text/image from layer list.
   - Move up/down and verify visual stacking updates.
7. Save and restore:
   - Click `Save Draft`.
   - Switch to another side and back.
   - Confirm text and image still visible and editable.

## 3. Cross-Side Persistence Validation

1. Ensure each side has at least one image and one text object.
2. Switch repeatedly through all sides:
   - Front -> Back -> Left Sleeve -> Right Sleeve -> Front
3. Confirm no side loses visibility or editability.

## 4. Review and Cart Validation

1. Click `Add to Cart`.
2. In Cart:
   - Verify side previews render for all selected sides.
3. Click `Edit Design` from cart item:
   - Verify workspace restores existing side objects.
4. Proceed to Review page:
   - Verify side previews show expected output.

## 5. Debug Log Expectations

While testing, confirm logs appear for:

- `Side switched`
- `Canvas restored from snapshot`
- `Canvas render tick`
- `Image uploaded to canvas`
- `Text object added`
- `Text object updated`
- `Text editor opened for selected object`

## 6. Pass/Fail Matrix

Use this matrix and mark each cell as `PASS` or `FAIL`.

| Check | Front | Back | Left Sleeve | Right Sleeve |
|---|---|---|---|---|
| Image visible immediately |  |  |  |  |
| Image draggable |  |  |  |  |
| Image resizable/rotatable |  |  |  |  |
| Text visible immediately |  |  |  |  |
| Text draggable/resizable |  |  |  |  |
| Text edit drawer opens on select |  |  |  |  |
| Double click/tap opens edit drawer |  |  |  |  |
| Text style updates apply correctly |  |  |  |  |
| Layer select/up/down works |  |  |  |  |
| Side switch keeps objects visible |  |  |  |  |
| Side switch keeps objects editable |  |  |  |  |
| Save draft + return keeps state |  |  |  |  |
| Review page preview correct |  |  |  |  |
| Cart preview correct |  |  |  |  |

## 7. Failure Reporting Format

For any failed check, capture:

1. Side name
2. Failed step
3. Screenshot or short screen recording
4. Console logs around failure
5. Repro steps

