[![npm](https://img.shields.io/npm/dt/bt-presence.svg)](https://www.npmjs.com/package/bt-presence)

# bt-presence
A node.js module that uses the Linux-based BlueZ package's `l2ping` binary to detect the _collective_ presence (or absence) of 1 or more bluetooth devices.

## Assumptions / Dependencies
* You're running a Linux-based host
* The [BlueZ](http://www.bluez.org) bluetooth package is installed, including the `l2ping` cmd-line tool
* [node.js](nodejs.org) is installed

## Installation
run `npm install --save bt-presence`

## Usage

### Including the package
`const btPresence = require('btPresence')`

### Adding Addresses to Scan
You can add addresses to scan by supplying an array of MAC addresses. The devices in the supplied array are concatenated to, and do not replace, any existing devices that may have already been added.

`btPresence.addDevices(["00:12:34:56:78:90", "09:87:65:43:21:00"])`

### Detecting Change: from No Devices Present to 1+ Devices Present
Subscribe to the `'present'` event in order to know when 1 or more devices have appeared after a state where none were present prior.

`btPresence.on('present', (macAddress) => console.log(`A device [${macAddress}] is now present`))`

### Detecting Change: from No Devices Present to 1+ Devices Present
Subscribe to the `'not-present'` event in order to know when all devices are gone.

`btPresence.on('not-present', (macAddress) => console.log(`All devices have disappeared`))`

### Starting the Scan

`btPresence.start()`

### Stopping the Scan

`btPresence.stop()`

### Adjusting the Scan Interval
You can adjust the time interval upon which the entire list of devices is pinged to detect presence or absence. The default scan interval is 15 seconds; use the function below to adjust it. The underlying ping tool, `l2ping`, takes around 2-3 secs to complete when a device is present, and 5-10 secs to complete when a device is not present. So, consider how many devices you are scanning before you set this.

`btPresence.setScanInterval(60)`
