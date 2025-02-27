export interface ZHABackup {
    version: number;
    network_info: {
      extended_pan_id: string;
      pan_id: string;
      channel: number;
      network_key: {
        key: string;
      };
    };
  }
  
  export interface HADevice {
    id: string
    identifiers: [string, string][];
    name_by_user: string | null;
    name: string;
    area_id?: string | null;
  }
  
  export interface HARegistry {
    data: {
      devices: HADevice[];
    };
  }
  
  export interface Z2MConfig {
    advanced: {
      pan_id: number;
      ext_pan_id: number[];
      channel: number;
      network_key: number[];
    };
    devices: {
      [key: string]: {
        friendly_name: string;
      };
    };
  }

  export interface Z2MDeviceEntry {
    ieee: string;
    nwk: number;
  }