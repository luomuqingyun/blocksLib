console.log("Loaded Super Sensor Kit v2.0.0");
module.exports = {
    blocks: "blocks.json",
    generator: {
        "sensor_read_temp": function (block, generator) {
            var pin = block.getFieldValue('PIN');
            return ["analogRead(" + pin + ") * 0.488", generator.ORDER_ATOMIC];
        },
        "sensor_read_humidity": function (block, generator) {
            var pin = block.getFieldValue('PIN');
            return ["analogRead(" + pin + ") / 10.0", generator.ORDER_ATOMIC];
        }
    }
};
