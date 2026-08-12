# UI Fixes

## Sub-tasks
1. **Fix duplicate "Setup" in the header**
   - The global header shows "Setup" in the breadcrumbs and also in the TopMenuBar's active group. Investigate `HeaderCrumbs` and `TopMenuBar` to prevent visually redundant Setup pills in compact mode.

2. **Fix missing UiModeSwitch and Window Menu**
   - Despite previous changes, the user reports the UI toggle and Window menu are still not accessible. Verify they are correctly placed in `HeaderActions` or `TopMenuBar` and aren't hidden by CSS or conditionals on compact screens.

3. **Hide "CLI: Unknown" when no backend is selected**
   - The CLI connection status badge in the top right shows "CLI: Unknown". Hide it if there is no backend configured to avoid clutter.

4. **Fix CLI Sessions "403 Non-envelope response" Error**
   - The Vision Sys dashboard shows `E_BE_BAD_RESPONSE: Non-envelope response (status 403)` when loading CLI sessions. Find where this API call is made and handle the 403 gracefully or fix the API endpoint.

5. **Ensure Controls Stay on Screen**
   - The user reports controls still go out of the screen on compact views. Verify `SelectionOverlay.tsx` layout and any floating palettes (e.g. `Properties`) are clamped correctly to the viewport.
