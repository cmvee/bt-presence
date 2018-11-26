'use strict';

import { setTimeout } from "timers";
import { EventEmitter } from "events";
import * as _ from "lodash";
import { spawn, ChildProcess } from 'child_process';

interface L2pingOptions {
    count : number;
    timeoutSecs : number;
}

interface PingResult {
    address : string;
    isPresent : boolean;
}

class btPresence extends EventEmitter {

    // stores bluetooth MAC addresses of devices to ping
    private btDevicesToPing: Array<string> = [];

    // stores bluetooth MAC addresses of detected devices
    private btDevicesPresent: Array<string> = [];

    // default time between scanning for list of devices
    private scanIntervalSecs: number = 15;

    // serves as a cached status reflecting whether l2ping is available on this system
    private isL2PingAvailable: boolean = false;

    // the timer used by setTimeout or setInterval; track it so we can clear it if needed
    private timer: NodeJS.Timer;

    // whether or not to emit an event on the first scan regardless of change
    private reportFirstResult: boolean = true;

    // tracks the running ping processes
    private runningPings: Array<ChildProcess> = [];

    // parameters for the l2ping call
    private l2pingOptions: L2pingOptions = {
        count: 1,
        timeoutSecs: 5
    };

    constructor (){
        super();
    }
    
    /**
     * Checks for the presence of l2ping on the local system
     * @param {function} next the calback function to call if l2ping is present
     */
    private checkForL2Ping = (next: Function) => {
        var process = spawn('which', ['l2ping']);
        
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
    public addDevices = (btMacAddressArray: Array<string>) => {
        if (typeof btMacAddressArray != 'undefined'){
            const macsLowerCase = _.map(btMacAddressArray, _.toLower);
            this.btDevicesToPing = _.uniq( _.concat(this.btDevicesToPing, macsLowerCase) );
        }
    }

    /**
     * Removes MAC addresses from the list of devices whose presence we want to detect
     * @param {array} btMacAddressArray an array of bluetooth MAC addresses to remove
     */
    public removeDevices = (btMacAddressArray: Array<string>) => {
        if (typeof btMacAddressArray != 'undefined'){
            const macsLowerCase = _.map(btMacAddressArray, _.toLower);
            this.btDevicesToPing = _.uniq( _.pullAll(this.btDevicesToPing, macsLowerCase) );
        }
    }

    /**
     * Returns list of MAC addresses of devices whose presence we want to detect
     */
    public getDevices = () => {
        return this.btDevicesToPing;
    }

    /**
     * Replaces list of MAC addresses of devices whose presence we want to detect
     * @param {array} btMacAddressArray an array of bluetooth MAC addresses to detect
     */
    public setDevices = (btMacAddressArray: Array<string>) => {
        const macsLowerCase = _.map(btMacAddressArray, _.toLower);
        this.btDevicesToPing = _.uniq(macsLowerCase);
    }

    /**
     * Returns an object with the options for l2ping
     */
    public getPingOptions = () => {
        return this.l2pingOptions;
    }

    /**
     * Sets the l2ping options
     * @param {Object} options an object with "count" and "timeoutSecs" values
     */
    public setPingOptions = (options: L2pingOptions) => {
        var newOptions: L2pingOptions = {
            count: options.count ? options.count : 1,
            timeoutSecs: options.timeoutSecs ? options.timeoutSecs : 5
        };

        this.l2pingOptions = newOptions;
    }

    /**
     * Returns the number of seconds between successive scans
     */
    public getIntervalSeconds = () => {
        return this.scanIntervalSecs;
    }

    /**
     * Sets the number of seconds between successive scans
     * @param {number} secs the number of seconds between successive scans
     */
    public setIntervalSeconds = (secs: number) => {
        if (typeof secs != 'undefined')
            this.scanIntervalSecs = secs;
    }

    /**
     * Starts a repeated scan through the list of bluetooth devices.
     * NOTE: this function is NOT intended to be called by external code.
     */
    private scanForAllDevices = () => {
        if (this.btDevicesToPing.length <= 0) {
            // console.log(`[${new Date().toISOString()}] no BT devices to ping`);
        } else {
            // console.log(`[${new Date().toISOString()}] scanning for presence of any of ${this.btDevicesToPing.length} BT devices`);

            // scan for each device
            _.forEach(this.btDevicesToPing, (macAddress) => {
                this.pingBluetoothDevice(macAddress, this.onPingResult.bind(this));
            });
        }

        // sleep for interval and then repeat the scan
        this.timer = setTimeout(this.scanForAllDevices.bind(this), this.scanIntervalSecs * 1000);
    }

    /**
     * This verifies that l2ping is available and then starts the continuous scan.
     * NOTE: This function should be called by external code in order to start scans.
     * * @param {boolean} reportFirstResult whether to report the first scan result regardless of change in presence
     */
    public start = (reportFirstResult?: boolean) => {

        if (typeof reportFirstResult != 'undefined'){
            this.reportFirstResult = reportFirstResult;
        }

        if (this.isL2PingAvailable){
            this.scanForAllDevices.apply(this);
        } else {
            this.checkForL2Ping(this.scanForAllDevices.bind(this));
        }
    }

    /**
     * Stops any continuous scan that may be running
     */
    public stop = () => {
        if (typeof this.timer != 'undefined'){
            // stop any future execution
            clearTimeout(this.timer);

            // kill any remaining processes
            _.forEach(this.runningPings, (p: ChildProcess) => {
                if (!p.killed) {
                    p.kill();
                }
            });
        }
    }

    /**
     * Uses the l2ping binary on the local system to determine if a bluetooth device is within range
     * @param {string} macAddress the MAC of the bluetooth device to ping
     * @param {function} callback the callback function
     */
    private pingBluetoothDevice = (macAddress: string, callback: Function) => {
        // start a process to ping the device
        var process = spawn('l2ping', ['-c', String(this.l2pingOptions.count), '-t', String(this.l2pingOptions.timeoutSecs), macAddress]);
        
        // add to the list of running processes
        this.runningPings.push(process);

        process.on("error", (error) => {
            console.error("Error running l2ping: ");
            throw error;
        });
    
        // l2ping writes to stdout if the device is found
        process.stdout.on('data', (data) => {
            if (callback) callback({ address: macAddress, isPresent: true });
        });
    
        // l2ping writes to stderr if the device is not found
        process.stderr.on('data', () => {
            if (callback) callback({ address: macAddress, isPresent: false });
        });

        process.on("close", (code, signal) => {
            // remove from the list of running processes
            _.remove(this.runningPings, (p: ChildProcess) => {
                return p.pid == process.pid;
            });
        })
    }

    /**
     * Callback function executed when l2ping has returned with a result
     * @param {object} result an object containing the result of the ping
     */
    public onPingResult = (result: PingResult) => {
        // save whether any devices were present prior to this ping result
        const devicesPresentAtLastCheck = this.btDevicesPresent.length > 0;

        this.emit('ping-result', result);

        // update the device presence list based on the result of the ping
        if (result.isPresent){
            this.btDevicesPresent = _.uniq(_.concat(this.btDevicesPresent, result.address));
        } else {
            this.btDevicesPresent = _.pull(this.btDevicesPresent, result.address);
        }

        // detect changes in presence and emit events if necessary
        if (this.btDevicesPresent.length > 0){
            if (!devicesPresentAtLastCheck || this.reportFirstResult){
                this.emit('present', result.address);
            }
        } else {
            if (devicesPresentAtLastCheck || this.reportFirstResult){
                this.emit('not-present', result.address);
            }
        }

        this.reportFirstResult = false;
    }
}

export { L2pingOptions, PingResult, btPresence };