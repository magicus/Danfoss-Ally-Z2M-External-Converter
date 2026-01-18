# Danfoss Ally Effective Temperature Display (Z2M External Converter)

This external converter for Zigbee2MQTT allows your Home Assistant climate
entities to display the **actual temperature** used by the Danfoss Ally TRV for
its regulation logic.

## Why this exists?

By default, Home Assistant shows the Danfoss Ally's **internal** sensor
temperature (`local_temperature`). However, if you use an external room sensor
(e.g., via the `external_measured_room_sensor` attribute), the TRV regulates
based on that external value, but still reports its internal temperature to HA.
This converter introduces a toggle to switch the display in HA between the
internal sensor and the external "effective" temperature.

## Features

- **Display Override**: Intercepts `local_temperature` and replaces it with the
  external sensor value when desired.
- **Toggle Control**: Adds a `Use external temperature` switch to the device in
  Home Assistant.
- **Bleed-through Fix**: Ensures the display remains stable! It uses the last
  known external value if the TRV reports internal stats without an external
  update.
- **Read-Only**: This does **not** write any configuration to the TRV itself,
  preserving battery life and original device settings.
- **Rounding**: Rounds values to 0.1°C for consistent dashboard display.

## Installation

### 1. Copy the Converter

Copy the `danfoss_ally_effective_temp.js` file into your Zigbee2MQTT
`external_converters` folder.

### 2. Update Zigbee2MQTT Configuration

Add the converter to your `configuration.yaml` in Zigbee2MQTT:

```yaml
external_converters:
  - danfoss_ally_effective_temp.js
  
### 3. Restart Zigbee2MQTT
Restart your Zigbee2MQTT service/addon to load the new definition.

Usage in Home Assistant
Find your Danfoss Ally device in Home Assistant.
Look for the new switch entity: "Use external temperature".
Turn it ON: The Climate entity will now show the external room temperature.
Turn it OFF: The Climate entity reverts to the internal TRV sensor.
TIP

This works perfectly in combination with blueprints that send external room temperatures to the Danfoss Ally (like the MSL-DA blueprint).

Technical Note
This converter works by extending the official source code for the Danfoss Ally within Zigbee2MQTT. It handles both older and newer versions of zigbee-herdsman-converters.
```
