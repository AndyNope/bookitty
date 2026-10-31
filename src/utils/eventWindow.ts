export const STARTUP_NIGHT_ENDS_AT = new Date('2026-12-01T00:00:00+01:00').getTime();

export const isStartupNightActive = (now = Date.now()) => now < STARTUP_NIGHT_ENDS_AT;