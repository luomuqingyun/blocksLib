console.log("Loaded Smart Home IoT v1.1.0");
module.exports = {
    blocks: "blocks.json",
    generator: {
        "biot_set_relay": function (block, generator) {
            var relay = block.getFieldValue('RELAY');
            var state = block.getFieldValue('STATE');
            return "digitalWrite(PIN_" + relay + ", " + state + ");\n";
        }
    }
};
