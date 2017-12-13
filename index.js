'use strict';

const EventEmitter = require('events');
const Spawn = require('child_process').spawn;
const _ = require('lodash');

class btPresence extends EventEmitter {

    constructor(){
        super();
        
        // stores bluetooth MAC addresses of devices to ping
        this.btDevicesToPing = [];

        // stores bluetooth MAC addresses of detected devices
        this.btDevicesPresent = [];

        // default time between scanning for list of devices
        this.scanIntervalSecs = 15;

        // serves as a cached status reflecting whether l2ping is available on this system
        this.isL2PingAvailable = false;

        // holds the timer for the next scan, mainly so we can clear it if asked to stop
        this.nextScanTimer = undefined;
    }

    /**
     * Checks for the presence of l2ping on the local system
     * @param {function} next the calback function to call if l2ping is present
     */
    checkForL2Ping(next){
        var process = Spawn('which', ['l2ping']);
        
        process.on("error", (error) => {
            console.error(`Error trying to locate l2ping: `);
            throw error;
        });

        process.on("exit", (code, signal) => {
            // update the variable other functions check
            this.isL2PingAvailable = code === 0 ? true : false;

            if (this.isL2PingAvailable){
                if (next) next();
            } else {
                throw new Error(`dependency l2ping is not installed on the local system or is not on the PATH`);
            }
        });
    }

    /**
     * Adds MAC addresses to the list of devices whose presence we want to detect
     * @param {array} btMacAddressArray an array of bluetooth MAC addresses to add
     */
    addDevices(btMacAddressArray) {
        if (typeof btMacAddressArray != 'undefined')
            this.btDevicesToPing = _.uniq(_.concat(this.btDevicesToPing, btMacAddressArray));
    }

    /**
     * Removes MAC addresses from the list of devices whose presence we want to detect
     * @param {array} btMacAddressArray an array of bluetooth MAC addresses to remove
     */
    removeDevices(btMacAddressArray) {
        if (typeof btMacAddressArray != 'undefined')
            this.btDevicesToPing = _.uniq(_.pullAll(this.btMacAddressesToPing, btMacAddress));
    }

    /**
     * Sets the number of seconds between successive scans
     * @param {number} secs the number of seconds between successive scans
     */
    setScanInterval(secs) {
        if (typeof secs != 'undefined')
            this.scanIntervalSecs = secs;
    }

    /**
     * Starts a repeated scan through the list of bluetooth devices.
     * NOTE: this function is NOT intended to be called by external code.
     */
    scanForAllDevices() {
        if (this.btDevicesToPing.length <= 0) {
            // console.log(`[${new Date()}] no BT devices to ping`);
        } else {
            // console.log(`[${new Date()}] scanning for presence of any of ${this.btDevicesToPing.length} BT devices`);

            // scan for each device
            _.forEach(this.btDevicesToPing, (macAddress) => {
                this.pingBluetoothDevice(macAddress, this.onPingResult.bind(this));
            });
        }

        // sleep for interval and then repeat the scan
        this.nextScanTimer = setTimeout(this.scanForAllDevices.bind(this), this.scanIntervalSecs * 1000);
    }

    /**
     * This verifies that l2ping is available and then starts the continuous scan.
     * NOTE: This function should be called by external code in order to start scans.
     */
    start() {
        if (this.isL2PingAvailable){
            this.scanForAllDevices().bind(this);
        } else {
            this.checkForL2Ping(this.scanForAllDevices.bind(this));
        }
    }

    /**
     * Stops any continuous scan that may be running
     */
    stop() {
        if (typeof this.nextScanTimer != 'undefined')
            clearTimeout(this.nextScanTimer)
    }

    /**
     * Uses the l2ping binary on the local system to determine if a bluetooth device is within range
     * @param {string} macAddress the MAC of the bluetooth device to ping
     * @param {function} callback the callback function
     */
    pingBluetoothDevice(macAddress, callback) {
        // start a process to ping the device
        var process = Spawn('l2ping', ['-c', '1', '-t', '5', macAddress]);
        
        process.on("error", (error) => {
            console.error("Error running l2ping: ");
            throw error
        });
    
        // l2ping writes to stdout if the device is found
        process.stdout.on('data', (data) => {
            if (callback) callback({ address: macAddress, isPresent: true });
        });
    
        // l2ping writes to stderr if the device is found
        process.stderr.on('data', () => {
            if (callback) callback({ address: macAddress, isPresent: false });
        });
    }

    /**
     * Callback function executed when l2ping has returned with a result
     * @param {object} result an object containing the result of the ping
     */
    onPingResult(result){
        // save whether any devices were present prior to this ping result
        const devicesPresentAtLastCheck = this.btDevicesPresent.length > 0;

        // update the device presence list based on the result of the ping
        if (result.isPresent){
            this.btDevicesPresent = _.uniq(_.concat(this.btDevicesPresent, result.address));
        } else {
            this.btDevicesPresent = _.pull(this.btDevicesPresent, result.address);
        }

        // detect changes in presence and emit events if necessary
        if (this.btDevicesPresent.length > 0){
            if (!devicesPresentAtLastCheck){
                this.emit('present', result.address);
            }
        } else {
            if (devicesPresentAtLastCheck){
                this.emit('not-present', result.address);
            }
        }
    }
}

module.exports = new btPresence()
