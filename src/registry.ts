// src/registry.ts

import { HARegistry, HADevice } from "./types";

/**
 * Odczytuje plik JSON i zwraca obiekt HARegistry.
 */
export async function parseRegistryFile(regFile: File): Promise<HARegistry> {
  const regArrayBuffer = await regFile.arrayBuffer();
  const regJsonStr = new TextDecoder().decode(regArrayBuffer);

  let registryData: HARegistry;
  try {
    registryData = JSON.parse(regJsonStr);
  } catch (error) {
    throw new Error("Błąd parsowania pliku core.device_registry: " + error);
  }
  return registryData;
}

/**
 * Wyciąga urządzenia, które mają w `identifiers` parę ["zha", <ieee>].
 * Zwraca mapę { <ieee>: <friendly_name> }.
 */
export function extractZhaDevices(registry: HARegistry): Record<string, string> {
  const devices: Record<string, string> = {};

  registry.data.devices
    .filter((device: HADevice) =>
      device.identifiers?.length > 0 &&
      device.identifiers[0][0] === "zha"
    )
    .forEach(device => {
      const ieee = device.identifiers[0][1].replaceAll(":","");
      const name = device.name_by_user ? device.name_by_user.trim() : device.name.trim();
      devices[ieee] = name;
    });

  return devices;
}