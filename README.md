[![npm](https://img.shields.io/npm/dt/bt-presence.svg)](https://www.npmjs.com/package/bt-presence)

<a href="https://www.buymeacoffee.com/cmvee"><img src="https://www.buymeacoffee.com/assets/img/custom_images/yellow_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;-webkit-box-shadow: 0px 3px 2px 0px rgba(190, 190, 190, 0.5) !important;" target="_blank"></a>

# bt-presence
A node.js module that uses the Linux-based BlueZ package's `l2ping` binary to detect the _collective_ presence (or absence) of 1 or more bluetooth devices.

## Assumptions / Dependencies
* You're running a Linux-based host
* The [BlueZ](http://www.bluez.org) bluetooth package is installed, including the `l2ping` cmd-line tool
* [node.js](nodejs.org) is installed

## Installation
`npm install --save bt-presence`

### A Note on Requirement for Root Priveleges

The `l2ping` linux binary requires root priveleges in order to write to bluetooth. You have 2 options for addressing this issue:
1. Run ``sudo setcap 'cap_net_raw+eip' `which l2ping` `` in order to grant root priveleges to `l2ping`
2. Run whichever software you are integrating `bt-presence` into as a user with root priveleges

Option #1 is recommended since it prevents bt-presence (and your code that may depend on it) from needing to run with escalated priveleges.

## Usage

### Including the package
`const btPresence = require('bt-presence').btPresence`

### Instantiating a New Scanner
You must instantiate a new instance of btPresence prior to use

`let btp = new btPresence()`

### Adding Addresses to Scan
You can add addresses to scan by supplying an array of MAC addresses. The devices in the supplied array are concatenated to, and do not replace, any existing devices that may have already been added.

`btp.addDevices(["00:12:34:56:78:90", "09:87:65:43:21:00"])`

### Removing Addresses from Scan
You can remove addresses from the scan by supplying an array of MAC addresses.

`btp.removeDevices(["00:12:34:56:78:90", "09:87:65:43:21:00"])`

### Setting/Replacing List of Addresses to Scan
You can replace the entire list of addresses to scan by supplying an array of MAC addresses.

`btp.setDevices(["00:12:34:56:78:90", "09:87:65:43:21:00"])`

### Getting List of Addresses to Scan
Returns the entire list of addresses to scan.

`btp.getDevices()`

### Configuring Ping Options
If you desire to change the parameters used with `l2ping` (for ping count and timeout):

`btp.setScanOptions({ count: 3, timeoutSecs: 8 })`

### Getting Ping Options
Returns the current `l2ping` scan options

`btp.getPingOptions()`

### Detecting Change: from No Devices Present to 1+ Devices Present
Subscribe to the `'present'` event in order to know when 1 or more devices have appeared after a state where none were present prior.

``btp.on('present', (macAddress) => console.log(`A device [${macAddress}] is now present`))``

### Detecting Change: from No Devices Present to 1+ Devices Present
Subscribe to the `'not-present'` event in order to know when all devices are gone.

``btp.on('not-present', (macAddress) => console.log(`All devices have disappeared`))``

### Starting the Scan
This starts the scan. By default, the first positive or negative reponse from any device in a newly started scan will be emitted as a change. To disable this, call `btp.start(false)`.

`btp.start(true)`

### Stopping the Scan

`btp.stop()`

### Adjusting the Scan Interval
You can adjust the time interval upon which the entire list of devices is pinged to detect presence or absence. The default scan interval is 15 seconds; use the function below to adjust it. The underlying ping tool, `l2ping`, takes around 2-3 secs to complete when a device is present, and 5-10 secs to complete when a device is not present. So, consider how many devices you are scanning before you set this.

`btp.setScanInterval(60)`

### Getting the Scan Interval
Returns the number of seconds between scans

`btp.getScanInterval()`

## Contributing / Modifying
The project is now developed in TypeScript. To modify the code for your own use:

1. Clone the repo with `git clone https://github.com/cmvee/bt-presence.git`
2. Edit the `.ts` files in the `src` directory
3. `npm run build` to transpile the TypeScript `.ts` source files into Javascript
4. Look in the `dist` directory for the fresh Javascript files
