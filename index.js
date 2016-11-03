var Service;
var Characteristic;

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-mytv", "TV", TVAccessory);
}

function TVAccessory(log, config) {
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
    .then(function(repsonse){
        this.info.Manufacturer = response.name;
        this.info.model = response.model;
        this.info.serialnumber = response.serialnumber;
    }.bind(this));
}

TVAccessory.prototype = {

    setSource: function(source, callback, context) {

        this.log('source' + source);

        fetch(this.api_url + "sources/current", {
            method: 'POST',
            headers: this.json_headers,
            body: JSON.stringify({
                'id': source
            })
        }).then(function (response) {
            console.log(response);
            callback(null, response);
        }).catch(function(error) {
            this.log(error);
            callback(error);
        })
    },

    getSource: function(callback, context) {

        fetch(this.api_url + "sources/current")
        .then(function(repsonse){
            callback(null, response.id);
        });
    },

    getVolume: function(callback, context) {

        this.log('Getting volume');

        fetch(this.api_url + "/audio/volume")
        .then(function(repsonse){
            this.log('Current volume is %s', response.current);
            callback(null, response.current);
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
        .then(function(repsonse){
            this.log('Volume is set to %s', level);
            callback();
        }.bind(this));
    },

    getServices: function() {
      	var informationService = new Service.AccessoryInformation();
      	var switchService = new Service.Switch(this.name);
        var volumeService = new Service.Volume();

    		informationService
        		.setCharacteristic(Characteristic.Manufacturer, this.info.manufacturer)
        		.setCharacteristic(Characteristic.Model, this.info.model)
        		.setCharacteristic(Characteristic.SerialNumber, this.info.serialnumber);

      	switchService
        		.getCharacteristic(Characteristic.On)
        		.on('get', this.getSource.bind(this))
        		.on('set', this.setSource.bind(this));

        volumeService
            .addCharacteristic(Characteristic.On)
					  .on('get', this.getVolume.bind(this))
					  .on('set', this.setVolume.bind(this));

      	return [informationService, switchService];
    }
};
