'use strict';

// App
const express = require('express');
const app = express();
app.use(express.static('public'));  //setup static files
app.use(express.static('/usr/src/html/public'));
app.get('/', (req,res) => {
  res.redirect('/index.html');
});


app.getA = function(path, asyncFunc) {
  this.get(path, function (request, response) {
    Promise.resolve(asyncFunc(request, response))
    .catch(err => {
      console.log('Error:', err);
      response.sendStatus(500).end();
    });
  });
};


//Mutex
let Mutex = require('async-mutex').Mutex;
let ModbusLock = new Mutex();


//Superagent
const RestClient = require('superagent');


// Constants
const PORT = 80;
const HOST = '0.0.0.0';


// list of registers and count
const AddrList = [
  [1,2],
  [3,1],
  [4,1],
  [6,2],
  [9,2],
  [13,2],
  [15,5],
  [21,5],
  [26,1],
  [27,1],
  [28,1],
  [29,1],
  [30,1],
  [31,1],
  [32,1],
  [33,1],
  [34,1],
  [35,1],
  [36,1],
  [37,1],
  [38,1],
  [39,1],
  [40,1],
  [41,1],
  [42,1],
  [46,5],
  [51,3],
  [59,5],
  [64,5],
  [69,5],
  [80,8]
];


function initClient() {
  let Modbus = require("modbus-serial");
  let mbClient = new Modbus();
  mbClient.connectAsciiSerial(
    "/dev/ttyModBus", {
      baudRate: 38400,
      dataBits: 8,
      stopBits: 1,
      parity: 'even'
    });
  mbClient.setTimeout(1000);
  mbClient.setID(1);
  return mbClient
}

var Client = initClient();


// route for test purposes: hello
app.get('/hello', (req, res) => {
  console.log('Request: /hello');
  res.send('Hello world! This is the new app. ' + new Date().toLocaleString() );
});


var AutoLoad = false;
app.get('/autoload', (req, res) => {
  res.send("" + (AutoLoad ? 1 : 0));
});
app.put('/autoload', (req, res) => {
  AutoLoad = true;
  res.end();
});
app.delete('/autoload', (req, res) => {
  AutoLoad = false;
  res.end();
});


function Byte2Hex(value) {
  value &= 0xFF;
  return (('0' + value.toString(16)).slice(-2)).toUpperCase();
}

function Int2Hex(value, delimiter) {
  return Byte2Hex(value / 256) + delimiter + Byte2Hex(value % 256);
}

function Array2Hex(value, delimiter) {
  let work = '';
  for (let i in value) {
    if (work.length > 0) {
      work = work + delimiter;
    }
    work = work  + Int2Hex(value[i], delimiter);
  }
  return work;
}

function Dummy2X(value, delimiter) {
  let work = '';
  for (let i = 0; i < value; i++) {
    if (work.length > 0) {
      work = work + delimiter;
    }
    work = work  + "xx" + delimiter + "xx";
  }
  return work;
}

app.getA('/data', async (req, res) => {
  let Work = await ModbusLock.runExclusive(async() => {
    let work = '';
    for (let i in AddrList) {
      let data = await Client.readHoldingRegisters(AddrList[i][0], AddrList[i][1])
        .catch(err => {});
      if (data) {
        work = work + Array2Hex(data.data, ' ') + "\n";
      } else {
        work = work + Dummy2X(AddrList[i][1], ' ') + "\n";
      }
    }

    return work;
  });

  res.send(Work + "\r\n");
});
  
  
app.getA('/data2', async (req, res) => {
  let Work = await ModbusLock.runExclusive(async() => {
    let work = '';
    for (let i in AddrList) {
      let data = await Client.readHoldingRegisters(AddrList[i][0], AddrList[i][1])
        .catch(err => {});
      if (data) {
        work = work + Array2Hex(data.data, ',') + ",";
      } else {
        work = work + Dummy2X(AddrList[i][1], ',') + ",";
      }
    }

    return work;
  });

  res.send(Work + "\r\n");
});
  
  
app.getA('/set', async (req, res) => {
  const Register = parseInt(req.query.register);
  const Value = parseInt(req.query.value);

  if (Register === undefined || Value === undefined ||
      !Number.isInteger(Register) || !Number.isInteger(Value)) {
    res.send('Parameter Error!');
    return;
  }

  let WriteResult = await ModbusLock.runExclusive(async() => {
    return await Client.writeRegisters(Register, [Value])
      .catch(err => {});
  });

  if (WriteResult) {
    res.send("OK");
  } else {
    res.sendStatus(500).end();
  }
});


// read actual spill current from grid meter
async function GetGridCurrent() {
  const PowerData = await RestClient
    .get('http://homehab:8080/rest/items/SolarEdgeMeter_AcGeneral_TotalRealPowerValue')
    .set('Accept', 'application/json');
  const VoltageData = await RestClient
    .get('http://homehab:8080/rest/items/SolarEdgeMeter_AcGeneral_AverageLineToNeutralACVoltage')
    .set('Accept', 'application/json');
  return parseFloat(PowerData.body.state) / parseFloat(VoltageData.body.state);
}


// read actual values from wallbox
async function GetWallboxData() {
  const Data = await ModbusLock.runExclusive(async() => {
    // first try read id register up to two times
    await Client.readHoldingRegisters(1,2).catch(err => {});
    await Client.readHoldingRegisters(1,2);

    // read values
    const DataPower = await Client.readHoldingRegisters(0x2E, 5);
    const DataPWM = await Client.readHoldingRegisters(0x0F, 5);
    return [DataPower, DataPWM];
  });

  return Data;
}


// write curent to wallbox
async function WriteCurrent(Current){
  if (Current < 6) {
    Current = 0;
  } else if (Current > 16) {
    Current = 16;
  }

  let PWM = 1000;
  if (Current > 0) {
    PWM = PWM = Math.round(Current / 0.06);
  }

  let WriteResult = await ModbusLock.runExclusive(async() => {
    return await Client.writeRegisters(0x14, [PWM])
      .catch(err => {});
  });
}


// the servo loop
var AutoLock = false;
var AutoInterval = 0;
async function PowerSet() {
  AutoLock = true;

  const SpillCurrent = await GetGridCurrent();

  var [DataPower, DataPWM] = await GetWallboxData();

  var LoadingCurrent = 
    0.1 * DataPower.data[2] +
    0.1 * DataPower.data[3] +
    0.1 * DataPower.data[4];
  if (LoadingCurrent > 100) { LoadingCurrent = 0; }

  // extract actual set loading current
  var CurrentSet = 0;
  const PWM = DataPWM.data[3];
  if (PWM == 1000) {
    CurrentSet = 0;
  } else if (PWM < 100) {
    CurrentSet = 0;
  } else if (PWM <= 267) {
    CurrentSet = Math.round(PWM * 0.06);
  }

  // Calculation
  var NewCurrent = CurrentSet;
  if (SpillCurrent < 0) {
    NewCurrent = Math.trunc(
      Math.max(LoadingCurrent, CurrentSet)
      + SpillCurrent);
    if (NewCurrent < 6) {NewCurrent = 6;} // minimal current
    if (NewCurrent != CurrentSet)
      AutoInterval = 60;
  } else if (SpillCurrent > 1) {
    NewCurrent = Math.trunc(
      Math.min(LoadingCurrent, CurrentSet)
      + SpillCurrent);
    if (NewCurrent < 6) {NewCurrent = 6;} // minimal current
    if (NewCurrent != CurrentSet)
      AutoInterval = 60;
  }
  
  await WriteCurrent(NewCurrent);

  console.log(new Date().toLocaleString(), SpillCurrent.toFixed(2), CurrentSet, LoadingCurrent.toFixed(2), NewCurrent);

  AutoLock = false;
}


// timer for autoload
setInterval(() => {
  if (!AutoLoad) {return;}
  if (AutoLock) {return;}
  if (AutoInterval > 0) {
    AutoInterval--;
    return;
  }
  AutoInterval = 10;
  PowerSet()
    .then(res => {})
    .catch(err => {});
}, 1000);


// start server
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
