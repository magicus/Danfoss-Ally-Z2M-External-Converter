/**
 * Danfoss Ally Effective Temperature Converter
 * 
 * This external converter extends the built-in Danfoss Ally definition to:
 * - Add a 'use_external_temperature' toggle (stored in Z2M state only)
 * - When enabled, override 'local_temperature' with the external room sensor value
 * - Always expose the TRV's own sensor value as 'internal_temperature'
 * - Automatically fall back to internal sensor when external is unavailable (-8000)
 * - Round to 1 decimal place to ensure display consistency in Home Assistant
 * 
 * This is READ-ONLY - nothing is written to the TRV device itself.
 */
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const e = exposes.presets;
const ea = exposes.access;
// Get the original Danfoss Ally definition
const danfossModule = require('zigbee-herdsman-converters/devices/danfoss');
const definitions = danfossModule.definitions || danfossModule;
const originalDevice = Array.isArray(definitions) 
    ? definitions.find(d => d.zigbeeModel?.includes('eTRV0103'))
    : Object.values(definitions).find(d => d && d.zigbeeModel?.includes('eTRV0103'));
if (!originalDevice) {
    throw new Error('Danfoss Ally Effective Temp Converter: Could not find original Danfoss eTRV0103 definition.');
}
// Wrap original fromZigbee converters to apply temperature override
const wrappedFromZigbee = originalDevice.fromZigbee.map(converter => {
    if (converter.cluster !== 'hvacThermostat') {
        return converter;
    }
    
    return {
        ...converter,
        convert: (model, msg, publish, options, meta) => {
            // Get original result first (might contain internal local_temperature)
            const result = converter.convert(model, msg, publish, options, meta) || {};

            if (msg.data.localTemp !== undefined) {
                const internalTemperature = Number(msg.data.localTemp) / 100;
                if (Number.isFinite(internalTemperature) && internalTemperature >= -273.15) {
                    result.internal_temperature = internalTemperature;
                }
            }
            
            // Check if user wants to use external temperature
            const useExternal = meta.state?.use_external_temperature === true;
            
            if (useExternal) {
                // Priority: 1. Current message data, 2. Last known state (to prevent internal temp bleed-through)
                const extVal = (msg.data.danfossExternalMeasuredRoomSensor !== undefined)
                    ? msg.data.danfossExternalMeasuredRoomSensor
                    : meta.state?.external_measured_room_sensor;
                if (typeof extVal === 'number' && extVal !== -8000) {
                    // Override local_temperature with the external value.
                    // We round to 1 decimal place (0.1 precision) to ensure consistency 
                    // between climate cards and sensor cards in Home Assistant dashboard.
                    result.local_temperature = Math.round(extVal / 10) / 10;
                }
            }
            
            return result;
        },
    };
});
// toZigbee converter for the toggle (state only, no device write)
const tzUseExternalTemperature = {
    key: ['use_external_temperature'],
    convertSet: async (entity, key, value, meta) => {
        return { state: { use_external_temperature: value } };
    },
};
// Safely combine exposes
const originalExposes = Array.isArray(originalDevice.exposes) 
    ? originalDevice.exposes 
    : (originalDevice.exposes ? [originalDevice.exposes] : []);
module.exports = [
    {
        ...originalDevice,
        description: originalDevice.description + ' (with effective temperature display)',
        fromZigbee: wrappedFromZigbee,
        toZigbee: [
            ...(originalDevice.toZigbee || []),
            tzUseExternalTemperature,
        ],
        exposes: [
            ...originalExposes,
            e.binary('use_external_temperature', ea.STATE_SET, true, false)
                .withDescription('Display external room sensor temperature as current temperature in Home Assistant'),
            e.numeric('internal_temperature', ea.STATE)
                .withUnit('°C')
                .withDescription('Temperature measured by the internal TRV sensor'),
        ],
    },
];