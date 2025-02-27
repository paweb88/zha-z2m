// src/db.ts

import { ZHABackup } from "./types";

export async function getZhaBackup(dbFile: File, SQL: any): Promise<ZHABackup> {
  // Odczytujemy zawartość pliku
  const arrayBuffer = await dbFile.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Tworzymy bazę w pamięci
  const db = new SQL.Database(uint8Array);

  // Pobieramy najnowszy rekord
  const query = "SELECT * FROM network_backups_v13 ORDER BY ID DESC LIMIT 1;";
  const results = db.exec(query);
  if (!results || results.length === 0) {
    throw new Error("Tabela network_backups_v13 jest pusta lub nie istnieje.");
  }

  const { columns, values } = results[0];
  const backupJsonIndex = columns.indexOf("backup_json");
  if (backupJsonIndex === -1) {
    throw new Error("Nie znaleziono kolumny backup_json.");
  }

  const backupJsonValue = values[0][backupJsonIndex];
  if (typeof backupJsonValue !== "string") {
    throw new Error("backup_json nie jest łańcuchem znaków!");
  }

  // Parsujemy JSON
  let backupData: ZHABackup;
  try {
    backupData = JSON.parse(backupJsonValue);
  } catch (error) {
    throw new Error("Błąd parsowania JSON backupu: " + error);
  }

  return backupData;
}