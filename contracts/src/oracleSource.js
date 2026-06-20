// Chainlink Functions source: fetch NASA POWER climate data for carbon project assessment
// args[0] = latitude  (e.g. "13.75")
// args[1] = longitude (e.g. "100.49")
// Returns packed uint256: solarScaled * 100000 + precipScaled
// where solarScaled = solar_kWh_m2_day * 100, precipScaled = precip_mm_day * 100

const lat = args[0];
const lon = args[1];

const response = await Functions.makeHttpRequest({
  url: `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=ALLSKY_SFC_SW_DWN,PRECTOTCORR&community=RE&longitude=${lon}&latitude=${lat}&format=JSON`,
  timeout: 9000
});

if (response.error || response.status !== 200) {
  throw Error("NASA POWER API request failed");
}

const params = response.data.properties.parameter;
if (!params || !params.ALLSKY_SFC_SW_DWN || !params.PRECTOTCORR) {
  throw Error("Invalid NASA API response structure");
}

const solar = params.ALLSKY_SFC_SW_DWN.ANN;
const precip = params.PRECTOTCORR.ANN;

const solarInt = Math.round(solar * 100);  // e.g. 4.83 → 483
const precipInt = Math.round(precip * 100); // e.g. 3.51 → 351

// Pack into single uint256 (solar fits in 5 upper digits, precip in 5 lower)
const packed = solarInt * 100000 + precipInt;

return Functions.encodeUint256(packed);
