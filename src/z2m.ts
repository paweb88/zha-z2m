import { ZHABackup, Z2MConfig, Z2MDeviceEntry } from "./types";
import { convertColonHexStringToByteArray } from "./utils";

/**
 * Buduje finalną konfigurację Z2M, zawierając dane z backupu (network_info)
 * oraz listę urządzeń z registry (zhaDevices).
 */
export function buildZ2MConfig(backupData: ZHABackup, zhaDevices: Record<string, string>): Z2MConfig {
  const pan_id = parseInt(backupData.network_info.pan_id, 16);
  const ext_pan_id = convertColonHexStringToByteArray(backupData.network_info.extended_pan_id, true);
  const channel = backupData.network_info.channel;
  const network_key = convertColonHexStringToByteArray(backupData.network_info.network_key.key);

  // Tworzymy pusty obiekt devices
  const devices: { [key: string]: { friendly_name: string } } = {};

  // Mapujemy zhaDevices: klucz "0x<ieee>", wartość { friendly_name: <name> }
  for (const [ieee, name] of Object.entries(zhaDevices)) {
    devices[`0x${ieee}`] = { friendly_name: name };
  }

  return {
    advanced: {
      pan_id,
      ext_pan_id,
      channel,
      network_key
    },
    devices
  };
}

export async function getDevicesFromZigbeeDb(dbFile: File, SQL: any): Promise<Z2MDeviceEntry[]> {
  const arrayBuffer = await dbFile.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const db = new SQL.Database(uint8Array);

  const query = "SELECT ieee, nwk FROM devices_v13 WHERE nwk != 0;";
  const results = db.exec(query);
  if (!results || results.length === 0) {
    return [];
  }

  const { columns, values } = results[0];
  // Zakładamy, że columns = ["ieee", "nwk"]
  const ieeeIndex = columns.indexOf("ieee");
  const nwkIndex = columns.indexOf("nwk");

  if (ieeeIndex === -1 || nwkIndex === -1) {
    throw new Error("Tabela devices_v13 nie ma wymaganych kolumn (ieee, nwk).");
  }

  const devices: Z2MDeviceEntry[] = values.map((row: any[]) => {
    return {
      ieee: row[ieeeIndex],
      nwk: row[nwkIndex]
    };
  });

  return devices;
}

/**
 * Wczytuje plik docelowy (np. database.db) jako tekst
 * i dopisuje do niego linie w formacie JSON:
 *
 *  {"id":2,"type":"EndDevice","ieeeAddr":"0xa4c1382f3923f1c2","nwkAddr":1234}
 *
 * Zgodnie z Twoim przykładem w Pythonie.
 * Zwraca gotową treść, którą można zapisać w nowym pliku.
 */
export async function appendDevicesToDatabase(
  databaseFile: File,
  newDevices: Z2MDeviceEntry[]
): Promise<string> {
  // Odczytujemy zawartość dotychczasowego pliku (jeśli istnieje)
  const arrayBuffer = await databaseFile.arrayBuffer();
  let content = new TextDecoder().decode(arrayBuffer);

  // Zakładamy, że w pliku jest coordinator z id=1, więc zaczynamy od id=2
  // Możesz też wyszukać w `content` najwyższe "id" i zacząć od +1
  let currentId = 2;

  let linesToAdd = "";
  for (const entry of newDevices) {
    // Usuwamy dwukropki z IEEE
    const macAddr = entry.ieee.replace(/:/g, "");
    linesToAdd += `\n{"id":${currentId},"type":"EndDevice","ieeeAddr":"0x${macAddr}","nwkAddr":${entry.nwk}}`;
    currentId++;
  }

  // Dopisujemy do istniejącej zawartości
  content += linesToAdd;
  return content;
}