const initColorUtils = () => {
    const hid = require('node-hid');

    Array.prototype.zeroFill = function (len) {
        const isWin = () => process.platform === "win32";
        if (isWin()) {
            for (let i = this.length - 1; i >= 0; i--)
                this[i+1] = this[i];
            this[0] = 0;
        }
        return this;
    };

    const vendorId = 0x048d, productId = 0xce00;
    const generic = [
        [0xff, 0x00, 0x00],
        [0xff, 0x5a, 0x00],
        [0xff, 0xb4, 0x00],
        [0x00, 0xb4, 0x00],
        [0x00, 0x00, 0xff],
        [0x00, 0xb4, 0xff],
        [0xff, 0x00, 0xff]
    ];
    const rainbowColor = [
        [0xff, 0x00, 0x00],
        [0x00, 0xb4, 0x00],
        [0x00, 0x00, 0xff],
        [0xff, 0x00, 0xff]
    ];
    
    let device;
    try {
        device = new hid.HID(vendorId, productId);
    } catch (e) {
        console.error(e);
        device = null;
    }
    
    if (device == null) {
        console.error("No compatible device found!");
        return false;
    }
    
    const sendGenericPacket = () => {
        for (let i = 1; i <= 7; i++)
            device.sendFeatureReport([ 0x14, 0x00, i, ...generic[i-1], 0x00, 0x00 ].zeroFill(16));
    };
    
    const monoColor = (red, green, blue, save, block, brightness) => {
        const packet = [0x14, 0x00, 0x01, red, green, blue, 0x00, 0x00],
            endPacket = [0x08, 0x02, 0x01, 0x05, brightness, 0x08, 0x00, save ? 0x00 : 0x01];

        if (block) {        // set specific block
            packet[2] = block;
            device.sendFeatureReport(packet.zeroFill(16));
        } else {
            // keyboard has 4 discrete color areas
            for (let i = 1; i <= 4; i++) {
                device.sendFeatureReport(packet.zeroFill(16));
                packet[2]++;
            }
        }
        // send ending packet
        device.sendFeatureReport(endPacket.zeroFill(16));
    };
    
    const breathing = (save, speed, brightness) => {
        const endPacket = [0x08, 0x02, 0x02, speed, brightness, 0x08, 0x00, save ? 0x00 : 0x01];
        sendGenericPacket();
        device.sendFeatureReport(endPacket.zeroFill(16));
    };

    const wave = (save, speed, brightness, direction) => {
        const endPacket = [0x08, 0x02, 0x03, speed, brightness, 0x08, direction, save ? 0x00 : 0x01];
        sendGenericPacket();
        device.sendFeatureReport(endPacket.zeroFill(16));
    };
    
    const rainbow = (save, brightness) => {
        for (let i = 1; i <= 4; i++)
            device.sendFeatureReport([0x14, 0x00, i, ...rainbowColor[i-1], 0x00, 0x00].zeroFill(9));
        const endPacket = [0x08, 0x02, 0x05, 0x05, brightness, 0x08, 0x00, save ? 0x00 : 0x01];
        console.log(endPacket);
        device.sendFeatureReport(endPacket.zeroFill(9));
    };
    
    const flash = (save, speed, brightness, direction) => {
        const endPacket = [0x08, 0x02, 0x12, speed, brightness, 0x08, direction, save ? 0x00 : 0x01];
        sendGenericPacket();
        device.sendFeatureReport(endPacket.zeroFill(16));
    };
    
    const mix = (save, speed, brightness) => {
        const endPacket = [0x08, 0x02, 0x13, speed, brightness, 0x08, 0x00, save ? 0x00 : 0x01];
        sendGenericPacket();
        device.sendFeatureReport(endPacket.zeroFill(16));
    };

    const disabler = () => {
        const endPacket = [0x08, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        device.sendFeatureReport(endPacket.zeroFill(16));
    }

    return {
        monoColor,
        breathing,
        rainbow,
        wave,
        flash,
        mix,
        device,
        disabler
    };
};

window.initColorUtils = initColorUtils;