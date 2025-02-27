var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm"; // kluczowe!
import yaml from "js-yaml";
/**
 * Konwertuje łańcuch hex oddzielony dwukropkami do tablicy liczb.
 */
function convertColonHexStringToByteArray(hexStr, reverse = false) {
    const parts = hexStr.split(":").map(part => parseInt(part, 16));
    if (reverse) {
        parts.reverse();
    }
    return parts;
}
function initApp() {
    return __awaiter(this, void 0, void 0, function* () {
        // Inicjalizacja sql.js z plikiem WASM, który Webpack skopiuje do public/js/sql-wasm.wasm
        const SQL = yield initSqlJs({
            locateFile: () => wasmUrl
        });
        const processBtn = document.getElementById("processBtn");
        processBtn.addEventListener("click", () => __awaiter(this, void 0, void 0, function* () {
            // 1) Odczyt pliku bazy danych SQLite
            const dbFileInput = document.getElementById("dbFile");
            if (!dbFileInput.files || dbFileInput.files.length === 0) {
                alert("Proszę wybrać plik bazy danych.");
                return;
            }
            const dbFile = dbFileInput.files[0];
            const arrayBuffer = yield dbFile.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const db = new SQL.Database(uint8Array);
            // Pobieramy najnowszy rekord z tabeli network_backups_v13
            const query = "SELECT * FROM network_backups_v13 ORDER BY ID DESC LIMIT 1;";
            const results = db.exec(query);
            if (!results || results.length === 0) {
                alert("Tabela network_backups_v13 jest pusta lub nie istnieje.");
                return;
            }
            const { columns, values } = results[0];
            const backupJsonIndex = columns.indexOf("backup_json");
            if (backupJsonIndex === -1) {
                alert("Nie znaleziono kolumny backup_json.");
                return;
            }
            const backupJsonValue = values[0][backupJsonIndex];
            if (typeof backupJsonValue !== "string") {
                alert("backup_json nie jest łańcuchem znaków!");
                return;
            }
            let backupData;
            try {
                backupData = JSON.parse(backupJsonValue);
            }
            catch (error) {
                alert("Błąd parsowania JSON backupu: " + error);
                return;
            }
            // 2) Konwersja danych backupu do konfiguracji Z2M
            const pan_id = parseInt(backupData.network_info.pan_id, 16);
            const ext_pan_id = convertColonHexStringToByteArray(backupData.network_info.extended_pan_id, true);
            const channel = backupData.network_info.channel;
            const network_key = convertColonHexStringToByteArray(backupData.network_info.network_key.key);
            const z2mConfig = {
                advanced: {
                    pan_id,
                    ext_pan_id,
                    channel,
                    network_key: [...network_key, ...network_key]
                },
                devices: {}
            };
            // 3) Odczyt pliku core.device_registry
            const regFileInput = document.getElementById("deviceRegistryFile");
            if (!regFileInput.files || regFileInput.files.length === 0) {
                alert("Proszę wybrać plik core.device_registry.");
                return;
            }
            const regFile = regFileInput.files[0];
            const regArrayBuffer = yield regFile.arrayBuffer();
            const regJsonStr = new TextDecoder().decode(regArrayBuffer);
            let registryData;
            try {
                registryData = JSON.parse(regJsonStr);
            }
            catch (error) {
                alert("Błąd parsowania pliku core.device_registry: " + error);
                return;
            }
            // 4) Wyciągamy tylko urządzenia z 'identifiers' == 'zha'
            const filteredDevices = registryData.data.devices.filter((device) => device.identifiers.some((id) => id[0] === "zha"));
            // 5) Uzupełniamy pole devices w konfiguracji Z2M
            filteredDevices.forEach(device => {
                if (!device.id) {
                    return;
                }
                const friendlyName = device.name_by_user ? device.name_by_user.trim() : device.name.trim();
                z2mConfig.devices[device.id] = { friendly_name: friendlyName };
            });
            // 6) Konwersja finalnej konfiguracji do YAML
            const yamlString = yaml.dump(z2mConfig, { indent: 2, lineWidth: -1, noRefs: true });
            // 7) Wyświetlamy wynik YAML w elemencie <pre>
            const outputElem = document.getElementById("output");
            outputElem.textContent = yamlString;
            // 8) Tworzymy plik YAML do pobrania
            const blob = new Blob([yamlString], { type: "application/x-yaml" });
            const url = URL.createObjectURL(blob);
            let downloadLink = document.getElementById("downloadLink");
            if (!downloadLink) {
                downloadLink = document.createElement("a");
                downloadLink.id = "downloadLink";
                downloadLink.textContent = "Pobierz wygenerowany plik YAML";
                document.body.appendChild(downloadLink);
            }
            downloadLink.href = url;
            downloadLink.download = "z2m_config.yaml";
        }));
    });
}
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});
