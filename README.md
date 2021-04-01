# Wallbox-Test
Test wallbox communication for boxes using modbus ASCII protocoll.

This software is not intended for productive use. It's to test the communication. No warranty given.

## Installation
Clone the repository to an Raspberry Pi. Docker has to be installed in advance. Make should be available. The file docker-compose.yaml has to be changed to use the proper serial port.

Run 'make start' to spin up the server. The webpage is available on localhost:8085.
## Function
The software installs a small webserver with only on page and a basic api to read data from the wallbox and make some basic settings.

The raw data window shows an overview of all known registers. Hitting "Get All" button refreshes all data.

"Reset Box" performs a wallbox reset.

Setting "Reg" with register address and "Value" with an 16bit value will allow wirting into a wallbox register when hitting "Write Register"

The loading current can be set by the direct buttons "6A" to "16A".

 The "Auto Load" function is a test with grid data read from a REST interface providing voltage and grid power. Don't use if you do not know what you are doing. The read function has to be changed accordingly.

 ## Under the hood
The website uses AngularJS to display dynamic data. the server is build with NodeJS. This allows the same language on both client (browser) and server. Promises and async/await is used to avoid the "callback hell". Modbus interface is protected by a mutex to prevent different client to disturb data transfer to and fro the wallbox.

## License
MIT license is used. Please see LICENSE file for details. Thanks to Yaacov Zamir for providing node-modbus-serial, which des the most of modbus communications.
