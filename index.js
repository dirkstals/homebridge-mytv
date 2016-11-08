var fetch = require('node-fetch');
var inherits = require('util').inherits;
var Service;
var Characteristic, VolumeCharacteristic;

module.exports = function(homebridge)
{
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    fixInheritance(mytvAccessory.Volume, Characteristic);
    fixInheritance(mytvAccessory.Mute, Characteristic);
    fixInheritance(mytvAccessory.Category, Characteristic);
    fixInheritance(mytvAccessory.TVService, Service);


    homebridge.registerAccessory("homebridge-mytv", "mytv", mytvAccessory);
}

function fixInheritance(subclass, superclass) {
    var proto = subclass.prototype;
    inherits(subclass, superclass);
    subclass.prototype.parent = superclass.prototype;
    for (var mn in proto) {
        subclass.prototype[mn] = proto[mn];
    }
}


function mytvAccessory(log, config) {
    this.log = log;
    this.config = config;
    this.ip = config['ip'];
    this.name = config['name'];

    this.defaultInput = config['defaultInput'] || null;
    this.defaultVolume = config['defaultVolume'] || null;
    this.minVolume = config['minVolume'] || 0;
    this.maxVolume = config['maxVolume'] || 60;

    this.api_version = 1;
    this.api_url = "http://"+this.ip+":1925/"+this.api_version+"/";
    this.json_headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
    };
    this.info = {
        manufacturer : "name",
        model : "model",
        serialnumber : "0"
    };

    this.status_url = "http://"+this.ip+":1925/"+this.api_version+"/input/key";
    this.key_body = JSON.stringify({"key": "Home"});


    this.mytv = new Mytv(this.ip);

    this.log('Getting system info');

    fetch(this.api_url + "system")
    .then(function(response) {
        return response.json();
    }).then(function(json) {
        this.log('System name is %s', json.name);
        this.log('System model is %s', json.model);
        this.log('System serialnumber is %s', json.serialnumber);
    }.bind(this));
}


//custom characteristics
mytvAccessory.Volume = function () {
    Characteristic.call(this, 'Volume', '00001001-0000-1000-8000-135D67EC4377');
    this.setProps({
        format: Characteristic.Formats.UINT8,
        unit: Characteristic.Units.PERCENTAGE,
        maxValue: 100,
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
};


mytvAccessory.Mute = function () {
    Characteristic.call(this, 'Mute', '6b5e0bed-fdbe-40b6-84e1-12ca1562babd');
    this.setProps({
        format: Characteristic.Formats.UINT8,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
    });
    this.value = this.getDefaultValue();
}


mytvAccessory.Category = function() {
  Characteristic.call(this, 'Category', '000000A3-0000-1000-8000-0026BB765291');
  this.setProps({
    format: Characteristic.Formats.UINT16,
    maxValue: 16,
    minValue: 1,
    minStep: 1,
    perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
  });
  this.value = this.getDefaultValue();
};


mytvAccessory.TVService = function (displayName, subtype) {
    Service.call(this, displayName, '48a7057e-cb08-407f-bf03-6317700b3085', subtype);
    this.addCharacteristic(mytvAccessory.Volume);
    this.addCharacteristic(mytvAccessory.Category);
    this.addOptionalCharacteristic(mytvAccessory.Mute);
};


mytvAccessory.prototype.setSource = function(source, callback) {

    this.mytv.setSource(source, function (err) {
        if (err) {
            this.log('set Source error: ' + err);
            callback(err);
        } else {
            this.log('set Source to: ' + source);
            callback(null);
        }
    }.bind(this));
};

mytvAccessory.prototype.getSource = function(callback) {

    this.mytv.getSource(function (err, source) {
        if (err) {
            this.log('get source error: ' + err);
            callback(err);
        } else {
            callback(source);
        }
    }.bind(this));
};

mytvAccessory.prototype.getPowerState = function (callback) {
    this.mytv.getPowerState(function (err, state) {
        if (err) {
            this.log(err);
            callback(err);
        } else
            this.log('current power state is: %s', (state) ? 'ON' : 'OFF');
        callback(null, state);
    }.bind(this));
};

mytvAccessory.prototype.setPowerState = function (powerState, callback) {

    if(!powerState) {
        this.mytv.setPowerState(powerState, function (err, state) {
            if (err) {
                this.log(err);
                callback(err);
            } else {
                this.log('Powered OFF');
            }
        }.bind(this));
    }

    callback(null);
};

mytvAccessory.prototype.getVolume = function (callback) {
    this.mytv.getVolume(function (err, volume) {
        if (err) {
            this.log('get Volume error: ' + err)
            callback(err);
        } else {
            this.log('current volume is: ' + volume);
            var pVol = Math.round(volume / this.maxVolume * 100);
            callback(null, pVol);
        }
    }.bind(this))
};

mytvAccessory.prototype.setVolume = function(pVol, callback) {

    var volume = Math.round(pVol / 100 * this.maxVolume);

    this.mytv.setVolume(volume, function (err) {
        if (err) {
            this.log('set Volume error: ' + err);
            callback(err);
        } else {
            this.log('set Volume to: ' + volume);
            callback(null);
        }
    }.bind(this));
};

mytvAccessory.prototype.setMuteState = function (state, callback) {
    this.mytv.setMuteState(state, function (err) {
        if (err) {
            this.log('set mute error: ' + err);
            callback(err);
        } else {
            callback(null);
        }
    }.bind(this));
};


mytvAccessory.prototype.getMuteState = function (callback) {
    this.mytv.getMuteState(function (err, state) {
        if (err) {
            this.log('get mute error: ' + err);
            callback(err);
        } else {
            callback(state);
        }
    }.bind(this));
};

mytvAccessory.prototype.getServices = function() {

  	var informationService = new Service.AccessoryInformation();
		informationService
        .setCharacteristic(Characteristic.Manufacturer, this.name)
    		.setCharacteristic(Characteristic.Model, this.info.model)
    		.setCharacteristic(Characteristic.SerialNumber, this.info.serialnumber);

    var switchService = new Service.Switch(this.name);
  	switchService
    		.getCharacteristic(Characteristic.On)
    		.on('get', this.getPowerState.bind(this))
    		.on('set', this.setPowerState.bind(this));

    var tvService = new mytvAccessory.TVService('TV Service');
    tvService.getCharacteristic(mytvAccessory.Volume)
        .on('get', this.getVolume.bind(this))
        .on('set', this.setVolume.bind(this));
    tvService.getCharacteristic(mytvAccessory.Category)
        .on('get', this.getSource.bind(this))
        .on('set', this.setSource.bind(this));

  	return [informationService, switchService, tvService];
};

var Mytv = function (ip) {
    this.ip = ip;
    this.port = 1925;
    this.api_url = 'http://' + this.ip + ':' + this.port + '/' + this.api_version;
};

Mytv.prototype.setVolume = function(volume, callback) {

    // var vol = (volume - 80).toFixed(1);  //volume fix

    fetch(this.api_url + '/audio/volume', {
        method: 'POST',
        headers: this.json_headers,
        body: JSON.stringify({
            'muted': false,
            'current': volume
        })
    })
    .then(function(response) {
        callback(null);
    })
    .catch(callback);
};


Mytv.prototype.getVolume = function (callback) {

    fetch(this.api_url + '/audio/volume')
    .then(function(response) {
        return response.json();
    }).then(function(json) {
        callback(null, json.current);
    })
    .catch(callback);
};

Mytv.prototype.getMuteState = function (callback) {

    fetch(this.api_url + '/audio/volume')
    .then(function(response) {
        return response.json();
    }).then(function(json) {
        callback(null, json.muted);
    })
    .catch(callback);
};

Mytv.prototype.setMuteState = function(muted, callback) {

    fetch(this.api_url + '/audio/volume', {
        method: 'POST',
        headers: this.json_headers,
        body: JSON.stringify({
            'muted': muted
        })
    })
    .then(function(response) {
        callback(null);
    })
    .catch(callback);
};

Mytv.prototype.getSource = function(callback){

    fetch(this.api_url + "sources/current")
    .then(function(response) {
        return response.json();
    }).then(function(json) {
        callback(null, json.id);
    })
    .catch(callback);
}

Mytv.prototype.setSource = function(source, callback) {

    fetch(this.api_url + "sources/current", {
        method: 'POST',
        headers: this.json_headers,
        body: JSON.stringify({
            'id': source
        })
    }).then(function (response) {
        callback(null);
    }).catch(callback);
};


Mytv.prototype.getPowerState = function (callback) {

    fetch(this.api_url + "system")
    .then(function(response) {
        return response.json();
    }).then(function(json) {
        callback(null, true);
    })
    .catch(function(error){
        callback(null, false);
    });
};

Mytv.prototype.setPowerState = function (powerState, callback) {
    fetch(this.api_url + "input/key", {
        method: 'POST',
        headers: this.json_headers,
        body: JSON.stringify({
            'key': 'Standby'
        })
    }).then(function (response) {
        callback(null);
    }).catch(callback);
};
