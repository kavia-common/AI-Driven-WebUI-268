# Cellular Basic Page Verification Notes

This document outlines steps to manually verify the "Basic setup > Cellular" page behavior.

## Route
- Navigate to: `/basic/cellular`
- Route guard requires authentication. If redirected to `/login`, authenticate or mock a session via AuthService.

## Initial Load (GET)
- Expected endpoint: `GET /API/info?list=Cellular`
- In development (`import.meta.env.DEV === true`):
  - No actual network request is made; mock data is returned from `services/mockData/cellularMockData.ts`.
  - UI should still populate form fields.
- In production:
  - Network request should be sent and return a `CellularResponse` JSON:
    ```
    {
      "Cellular": {
        "RoamingEnabled": number,
        "InterfaceEnable": number,
        "X_PRPLWARE_COM_IPType": string,
        "APN": string,
        "PreferredAccessTechnology": string,
        ...
      }
    }
    ```

## Save (POST)
- Click the "Save" button on the page.
- Expected endpoint: `POST /API/info?list=Cellular`
- Exact request payload:
  ```
  {
    "Cellular": {
      "RoamingEnabled": <boolean|number>,          // will be normalized to 1/0 by the service
      "InterfaceEnable": <boolean|number>,         // will be normalized to 1/0 by the service
      "X_PRPLWARE_COM_IPType": "<ipv4|ipv6|ipv4v6>",
      "APN": "<string>",
      "PreferredAccessTechnology": "<5g|lte>"
    }
  }
  ```
- The service normalizes boolean flags to numeric:
  - `true` -> `1`
  - `false` -> `0`

## Expected UI Feedback
- On success: a green success alert uses the i18n key `common.saveSuccess`.
- On failure: a red error alert uses the i18n key `common.saveFailed`.

## What to Capture During Live Verification
- Network tab entries for:
  - GET `/API/info?list=Cellular`: status code and response body.
  - POST `/API/info?list=Cellular`: request payload (confirm keys), status code, and response body.
- Console logs for any errors (JavaScript or network-related).
- Screenshot or note showing the success banner after saving.

## Code References
- Component: `src/views/network/cellular/CellularBasicConfig.vue`
- Service: `src/services/api/cellular.ts`
- Types: `src/types/cellular.ts`
- Router: `src/router/index.ts` (path `/basic/cellular`)
