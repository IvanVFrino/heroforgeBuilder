# Manual Testing Guidelines for HeroForge Electron App

These guidelines outline the steps to manually test the core functionalities of the HeroForge Electron application, focusing on data persistence and core user flows.

## 1. Starting the Application in Development Mode

1.  **Clone the Repository**: Ensure you have the latest version of the code.
2.  **Install Dependencies**: Open a terminal in the project root and run `npm install`.
3.  **Set API Key**: Ensure the `GEMINI_API_KEY` is set in your environment or in a `.env.local` file at the project root (e.g., `GEMINI_API_KEY=your_api_key_here`).
4.  **Start the App**: Run the development script:
    ```bash
    npm run dev:electron
    ```
    This will launch the Vite development server for the UI and then the Electron application window.

## 2. First Launch Checks

1.  **No Pre-existing Data**: On the very first launch (or after clearing user data), the application should start fresh.
    *   The "Initial Load View" might briefly appear, then transition to the Main Menu.
    *   Character Gallery and Bestiary should be empty.
    *   AI Content Studio lists for custom races, classes, and backgrounds should be empty.
2.  **Data Directory Creation**:
    *   Locate your operating system's user data directory for the application. The base path is typically:
        *   **Windows**: `C:\Users\<YourUsername>\AppData\Roaming\HeroForge\HeroForgeData` (or `com.electron.heroforge\HeroForgeData` if `appId` was changed later)
        *   **macOS**: `~/Library/Application Support/HeroForge/HeroForgeData` (or `com.electron.heroforge/HeroForgeData`)
        *   **Linux**: `~/.config/HeroForge/HeroForgeData` (or `com.electron.heroforge/HeroForgeData`)
        *   *You can also find this path by adding a temporary `console.log(app.getPath('userData'))` in `electron/main.ts` during development.*
    *   Verify that the `HeroForgeData` directory and its subdirectories (`characters`, `aiRaces`, `aiClasses`, `aiBackgrounds`, `aiBestiary`) are created automatically.

## 3. Character Creation, Persistence, and Deletion

1.  **Navigate to Creation**: From the Main Menu, click "Create New Character".
2.  **Complete Character Creation**:
    *   Select a race (and subrace if applicable).
    *   Select a class.
    *   Assign ability scores using any method.
    *   Choose class skills.
    *   Select a background.
    *   Enter final details (name, alignment). Optionally generate backstory/names with AI.
    *   Review the character on the final step.
3.  **Save Character**: Click "Save Character" (or the equivalent save button).
    *   An alert should confirm the character is saved locally.
    *   The app should navigate to the Character Gallery.
4.  **Verify Persistence**:
    *   The new character should appear in the Character Gallery.
    *   Close the application completely.
    *   Restart the application using `npm run dev:electron`.
    *   Navigate to the Character Gallery. The character should still be listed.
    *   **File System Check**: Check the `HeroForgeData/characters` directory. A JSON file corresponding to the saved character (e.g., `CharacterName_characterId.json`) should exist.
5.  **View Character**: Click "View Details" for the character in the gallery. Ensure the sheet displays correctly.
6.  **Delete Character**:
    *   While viewing the character sheet (or from a delete button in the gallery if available), click the "Delete Character" (or "Remove from Session") button.
    *   A confirmation dialog should appear, warning that the action is irreversible and will delete the local file. Confirm the deletion.
    *   The character should be removed from the Character Gallery.
    *   **File System Check**: The character's JSON file in `HeroForgeData/characters` should be deleted.
    *   Restart the app and verify the character is still gone.

## 4. AI-Generated Content Persistence and Deletion

1.  **Navigate to AI Content Studio**: From the Main Menu, select "AI Content Studio".
2.  **Generate Content**:
    *   Select "Race" (or Class/Background).
    *   Enter a prompt (e.g., "A race of sentient trees").
    *   Click "Generate Race".
3.  **Save Generated Content**:
    *   Review and optionally edit the generated content.
    *   Click "Save to Session" (or the equivalent save button for the AI content type).
    *   An alert should confirm it's saved locally.
4.  **Verify Persistence**:
    *   The new AI-generated race should appear in the list of existing custom races within the AI Content Studio.
    *   If you go to Character Creation, this new race should be available for selection.
    *   Close and restart the application (`npm run dev:electron`).
    *   Verify the custom race is still listed in the AI Content Studio and available in character creation.
    *   **File System Check**: Check the `HeroForgeData/aiRaces` directory. A JSON file for the new race (e.g., `Sentient_Trees.json`) should exist.
5.  **Delete AI-Generated Content**:
    *   In the AI Content Studio, find the custom race in the "Existing Custom Races" list.
    *   Click its "Delete" button.
    *   A confirmation dialog should appear. Confirm the deletion.
    *   The race should be removed from the list.
    *   Verify it's no longer available in character creation.
    *   **File System Check**: The race's JSON file in `HeroForgeData/aiRaces` should be deleted.

## 5. Bestiary Entry Persistence and Deletion (Similar to AI Content)

1.  **Navigate to AI Content Studio**:
2.  **Generate Character/NPC**:
    *   Select "Character/NPC".
    *   Enter a prompt.
    *   Click "Generate Character/NPC".
3.  **Save to Bestiary**:
    *   Review and optionally edit.
    *   Select "Bestiary" as the save destination.
    *   Click "Save to Session".
    *   An alert should confirm it's saved.
4.  **Verify Persistence**:
    *   Navigate to the "Bestiary" from the Main Menu. The new entry should be listed.
    *   Close and restart the app. Verify the entry is still in the Bestiary.
    *   **File System Check**: Check `HeroForgeData/aiBestiary` for the corresponding JSON file.
5.  **Delete Bestiary Entry**:
    *   From the Bestiary view, click "Delete" for the entry.
    *   Confirm the deletion.
    *   Verify it's removed from the UI and the file system.

## 6. Session Data Export/Import (Backup Functionality)

1.  **Create Data**: Ensure you have some saved characters, AI-generated content, and/or bestiary entries.
2.  **Export Session**:
    *   From the Main Menu, click "Export All Session Data".
    *   The application should trigger a download of a `HeroForge_Session_YYYY-MM-DD.json` file. Save this file.
3.  **Test Import (Optional: Simulate Data Loss or New Setup)**:
    *   **Option A (Simulate Data Loss)**: Manually delete a few items (e.g., a character file from `HeroForgeData/characters` and an AI race from `HeroForgeData/aiRaces`). Restart the app; these items should be gone.
    *   **Option B (Simulate New Setup)**: If possible, temporarily rename the `HeroForgeData` folder (e.g., to `HeroForgeData_backup`) to simulate a fresh launch. Restart the app; it should be empty.
4.  **Import Session**:
    *   On the "Initial Load View" (if you simulated a new setup) or from a dedicated "Import Session" button if available on the Main Menu (current design uses file input on InitialLoadView or CharacterGallery for characters), select the previously exported session JSON file.
    *   The application should parse the file. A confirmation might appear.
    *   All data from the session file (characters, AI content) should now be restored and visible in the respective galleries/studios.
    *   **Note**: This import should *add to or overwrite based on ID/name*, not just blindly append, to avoid massive duplication if importing into an existing dataset. The current implementation adds to existing arrays; this test will verify how it behaves. Individual file saves via `electronAppService` are now the primary persistence, so session import is more of a backup/restore of the *application state* at a point in time.

## 7. General Checks

*   **Error Handling**: Try to trigger errors (e.g., invalid file format for import, disconnect network if AI features are used during generation if those call external services directly). Check if error messages are displayed reasonably.
*   **UI Responsiveness**: Ensure the UI remains responsive during file operations (though most are quick, initial load might be noticeable).

By following these steps, core functionalities related to data persistence and user flows can be manually verified.
