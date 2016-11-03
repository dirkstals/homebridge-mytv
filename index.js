var fetch = require('node-fetch');
var Service;
var Characteristic;

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-mytv", "mytv", mytvAccessory);
}

function mytvAccessory(log, config) {
    this.log = log;
    this.config = config;
    this.name = config["name"];
    this.ip_address	= config["ip_address"];
    this.api_version = 1;
    this.api_url = "http://"+this.ip_address+":1925/"+this.api_version+"/";
    this.json_headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };

    this.status_url = "http://"+this.ip_address+":1925/"+this.api_version+"/input/key";
    this.key_body = JSON.stringify({"key": "Home"});

    fetch(this.api_url + "system")
    .then(function(repsonse) {
        return response.json();
    }).then(function(json) {
        this.info.Manufacturer = json.name;
        this.info.model = json.model;
        this.info.serialnumber = json.serialnumber;
    }.bind(this));
}

mytvAccessory.prototype = {

    setSource: function(source, callback, context) {

        this.log('Setting source to %s.', source);

        fetch(this.api_url + "sources/current", {
            method: 'POST',
            headers: this.json_headers,
            body: JSON.stringify({
                'id': source
            })
        }).then(function (response) {
            this.log('Source set to %s.', source);
            callback();
        }.bind(this)).catch(function(error) {
            this.log(error);
            callback(error);
        }.bind(this));
    },

    getSource: function(callback, context) {

        this.log('Getting source');

        fetch(this.api_url + "sources/current")
        .then(function(repsonse) {
            return response.json();
        }).then(function(json) {
            this.log('Current source is %s.', json.id);
            callback(null, json.id);
        });
    },

    getVolume: function(callback, context) {

        this.log('Getting volume');

        fetch(this.api_url + "/audio/volume")
        .then(function(repsonse) {
            return response.json();
        }).then(function(json) {
            this.log('Current volume is %s', json.current);
            callback(null, json.current);
        }.bind(this));
    },

    setVolume: function(level, callback) {

        this.log('Setting volume to %s', level);

        fetch(this.api_url + "/audio/volume", {
            method: 'POST',
            headers: this.json_headers,
            body: JSON.stringify({
                'muted': false,
                'current': level
            })
        })
        .then(function(repsonse) {
            this.log('Volume is set to %s', level);
            callback();
        }.bind(this));
    },

    getServices: function() {
      	var informationService = new Service.AccessoryInformation();
      	var switchService = new Service.Switch(this.name);

    		informationService
        		.setCharacteristic(Characteristic.Manufacturer, this.info.manufacturer)
        		.setCharacteristic(Characteristic.Model, this.info.model)
        		.setCharacteristic(Characteristic.SerialNumber, this.info.serialnumber);

      	switchService
        		.getCharacteristic(Characteristic.On)
        		.on('get', this.getSource.bind(this))
        		.on('set', this.setSource.bind(this));

        switchService
            .addCharacteristic(new Characteristic.Volume())
					  .on('get', this.getVolume.bind(this))
					  .on('set', this.setVolume.bind(this));

      	return [informationService, switchService];
    }
};

/*
function makeVolumeCharacteristic() {

	VolumeCharacteristic = function() {
		Characteristic.call(this, 'Volume', '91288267-5678-49B2-8D22-F57BE995AA00');
		this.setProps({
			format: Characteristic.Formats.INT,
			unit: Characteristic.Units.PERCENTAGE,
			maxValue: 10,
			minValue: -10,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
		});
		//this.value = this.getDefaultValue();
		this.value = 1;
	};

	inherits(VolumeCharacteristic, Characteristic);
}
*/
