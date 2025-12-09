import apiClient from '../apiClient';
import type { CellularResponse } from '../../types/cellular';
import { cellularMockData } from '../mockData/cellularMockData';

const isDevelopment = import.meta.env.DEV;

/**
 * PUBLIC_INTERFACE
 * Fetch cellular information from the backend or mock data in development.
 * GET /API/info?list=Cellular
 *
 * Returns:
 *  - CellularResponse: { Cellular: CellularInfo }
 */
export async function getCellularStatus(): Promise<CellularResponse> {
  if (isDevelopment) {
    // In dev, return mock data to avoid backend dependency.
    return cellularMockData;
  }
  // Use params style consistent with other APIs, but keep compatibility with backend
  const response = await apiClient.get<CellularResponse>('/API/info?list=Cellular');
  return response;
}

/**
 * Normalize payload ensuring boolean flags are converted to numbers (1/0),
 * since backend types for RoamingEnabled and InterfaceEnable are numeric.
 */
function normalizeCellularPayload(payload: {
  Cellular: {
    RoamingEnabled: boolean | number;
    InterfaceEnable: boolean | number;
    X_PRPLWARE_COM_IPType: string;
    APN: string;
    PreferredAccessTechnology: string;
  };
}) {
  const { Cellular } = payload;

  const toNum = (v: boolean | number): number =>
    typeof v === 'boolean' ? (v ? 1 : 0) : v;

  return {
    Cellular: {
      RoamingEnabled: toNum(Cellular.RoamingEnabled),
      InterfaceEnable: toNum(Cellular.InterfaceEnable),
      X_PRPLWARE_COM_IPType: Cellular.X_PRPLWARE_COM_IPType,
      APN: Cellular.APN,
      PreferredAccessTechnology: Cellular.PreferredAccessTechnology,
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * Update cellular settings on the backend.
 * POST /API/info?list=Cellular
 *
 * Payload shape (must match exactly the following keys):
 * {
 *   "Cellular": {
 *     "RoamingEnabled": boolean|number,         // will be normalized to 1/0 if boolean
 *     "InterfaceEnable": boolean|number,        // will be normalized to 1/0 if boolean
 *     "X_PRPLWARE_COM_IPType": string,          // e.g., "ipv4v6"
 *     "APN": string,                            // e.g., "internet"
 *     "PreferredAccessTechnology": string       // e.g., "5g"
 *   }
 * }
 *
 * Note: Booleans are converted to numeric flags (1/0) for backend compatibility.
 *
 * Returns:
 *  - CellularResponse: updated cellular info from backend after applying settings
 */
export async function updateCellularSettings(payload: {
  Cellular: {
    RoamingEnabled: boolean | number;
    InterfaceEnable: boolean | number;
    X_PRPLWARE_COM_IPType: string;
    APN: string;
    PreferredAccessTechnology: string;
  };
}): Promise<CellularResponse> {
  if (isDevelopment) {
    // Simulate update by merging into mock data and returning it.
    const normalized = normalizeCellularPayload(payload);
    const updated: CellularResponse = {
      Cellular: {
        ...cellularMockData.Cellular,
        ...normalized.Cellular,
      },
    };
    return updated;
  }

  const normalized = normalizeCellularPayload(payload);

  const response = await apiClient.post<CellularResponse>(
    '/API/info?list=Cellular',
    normalized
  );

  return response;
}
