import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm"; // kluczowe!
import yaml from "js-yaml";

import { getZhaBackup } from "./db";
import { parseRegistryFile, extractZhaDevices } from "./registry";
import { buildZ2MConfig, getDevicesFromZigbeeDb, appendDevicesToDatabase} from "./z2m";


async function initApp() {
    // 1) Inicjalizujemy sql.js
    const SQL = await initSqlJs({
      locateFile: () => wasmUrl
    });
  
    // 2) Obsługa przycisku "Przetwórz pliki" (generuje YAML z backupu + registry)
    const processBtn = document.getElementById("processBtn") as HTMLButtonElement;
    processBtn.addEventListener("click", async () => {
      try {
        const dbFileInput = document.getElementById("dbFile") as HTMLInputElement;
        if (!dbFileInput.files || dbFileInput.files.length === 0) {
          alert("Proszę wybrać plik bazy danych (backup ZHA).");
          return;
        }
        const backupData = await getZhaBackup(dbFileInput.files[0], SQL);
  
        const regFileInput = document.getElementById("deviceRegistryFile") as HTMLInputElement;
        if (!regFileInput.files || regFileInput.files.length === 0) {
          alert("Proszę wybrać plik core.device_registry.");
          return;
        }
        const registryData = await parseRegistryFile(regFileInput.files[0]);
  
        // Prosty wyciąg urządzeń "zha" (jeśli chcesz)
        const zhaDevices: Record<string, string> = {};
        registryData.data.devices.forEach(device => {
          if (device.identifiers.length > 0 && device.identifiers[0][0] === "zha") {
            const ieee = device.identifiers[0][1].replaceAll(":","");
            const name = device.name_by_user ? device.name_by_user.trim() : device.name.trim();
            zhaDevices[ieee] = name;
          }
        });
  
        // Tworzymy Z2MConfig
        const z2mConfig = buildZ2MConfig(backupData, zhaDevices);
  
        // Konwersja do YAML
        const yamlString = yaml.dump(z2mConfig, { indent: 2, lineWidth: -1, noRefs: true });
  
        // Wyświetlamy w <pre>
        const outputElem = document.getElementById("output") as HTMLElement;
        outputElem.textContent = yamlString;
  
        // Link do pobrania
        const blob = new Blob([yamlString], { type: "application/x-yaml" });
        const url = URL.createObjectURL(blob);
        let downloadLink = document.getElementById("downloadLink") as HTMLAnchorElement;
        if (!downloadLink) {
          downloadLink = document.createElement("a");
          downloadLink.id = "downloadLink";
          downloadLink.textContent = "Pobierz wygenerowany plik YAML";
          document.body.appendChild(downloadLink);
        }
        downloadLink.href = url;
        downloadLink.download = "z2m_config.yaml";
  
      } catch (error) {
        alert(`Wystąpił błąd: ${error}`);
      }
    });
  
    // 3) Obsługa przycisku "Dodaj do Z2M Database" (czyta devices_v12 i dopisuje do database.db)
    const appendBtn = document.getElementById("appendBtn") as HTMLButtonElement;
    appendBtn.addEventListener("click", async () => {
      try {
        const dbFileInput = document.getElementById("dbFile") as HTMLInputElement;
        if (!dbFileInput.files || dbFileInput.files.length === 0) {
            alert("Proszę wybrać plik bazy danych (backup ZHA).");
            return;
          }
        const deviceEntries = await getDevicesFromZigbeeDb(dbFileInput.files[0], SQL);
        if (deviceEntries.length === 0) {
          alert("Nie znaleziono urządzeń w devices_v13 (lub brak wierszy z nwk != 0).");
          return;
        }
  
        // Użytkownik wybiera plik docelowy "database.db"
        const z2mDatabaseFileInput = document.getElementById("z2mDatabaseFile") as HTMLInputElement;
        if (!z2mDatabaseFileInput.files || z2mDatabaseFileInput.files.length === 0) {
          alert("Proszę wybrać plik docelowy 'database.db'.");
          return;
        }
  
        // Dopisujemy do pliku docelowego linie JSON
        const newContent = await appendDevicesToDatabase(
          z2mDatabaseFileInput.files[0],
          deviceEntries
        );
  
        // Wyświetlamy wynik w konsoli lub w <pre> (opcjonalnie)
        console.log("Nowa zawartość database.db:\n", newContent);
  
        // Umożliwiamy pobranie nowej wersji pliku
        const blob = new Blob([newContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        let dlLink = document.getElementById("dbDownloadLink") as HTMLAnchorElement;
        if (!dlLink) {
          dlLink = document.createElement("a");
          dlLink.id = "dbDownloadLink";
          dlLink.textContent = "Pobierz zaktualizowany plik database.db";
          document.body.appendChild(dlLink);
        }
        dlLink.href = url;
        dlLink.download = "database.db";
  
        alert("Zaktualizowana zawartość database.db gotowa do pobrania!");
      } catch (error) {
        alert(`Wystąpił błąd przy aktualizacji database.db: ${error}`);
      }
    });
  }

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});