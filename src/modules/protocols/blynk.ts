import * as Blockly from 'blockly';
import { arduinoGenerator, Order, registerBlock } from '../../generators/arduino-base';
import { BlockModule } from '../../registries/ModuleRegistry';

const init = () => {

    // =========================================================================
    // Blynk IoT (BlynkSimpleEsp8266.h / Generic)
    // =========================================================================
    // Clean room strategy: Generic Blynk setup assuming WiFi usage (most common).

    registerBlock('blynk_setup_wifi', {
        init: function () {
            this.appendDummyInput()
                .appendField("Blynk Setup (WiFi)");
            this.appendValueInput("AUTH")
                .setCheck("String")
                .appendField("Auth Token");
            this.appendValueInput("SSID")
                .setCheck("String")
                .appendField("SSID");
            this.appendValueInput("PASS")
                .setCheck("String")
                .appendField("Password");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLYNK_INIT_TOOLTIP);
        }
    }, (block: any) => {
        const auth = arduinoGenerator.valueToCode(block, 'AUTH', Order.ATOMIC) || '""';
        const ssid = arduinoGenerator.valueToCode(block, 'SSID', Order.ATOMIC) || '""';
        const pass = arduinoGenerator.valueToCode(block, 'PASS', Order.ATOMIC) || '""';

        arduinoGenerator.addInclude('blynk_lib', '#include <BlynkSimpleEsp32.h>');
        arduinoGenerator.addVariable('blynk_auth', `char auth[] = ${auth};`);
        arduinoGenerator.addVariable('blynk_wifi', `char blynk_ssid[] = ${ssid};
char blynk_pass[] = ${pass};`);

        arduinoGenerator.addSetup('blynk_begin', `Blynk.begin(auth, ssid, pass);`);
        arduinoGenerator.addLoop('blynk_run', 'Blynk.run();');

        return '';
    });

    registerBlock('blynk_write', {
        init: function () {
            this.appendDummyInput()
                .appendField("Blynk Write Virtual");
            this.appendDummyInput()
                .appendField("Pin V")
                .appendField(new Blockly.FieldTextInput("1"), "PIN");
            this.appendValueInput("VAL")
                .setCheck("Number")
                .appendField("Value");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLYNK_WRITE_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const pin = block.getFieldValue('PIN');
        const val = arduinoGenerator.valueToCode(block, 'VAL', Order.ATOMIC) || '0';
        return `Blynk.virtualWrite(V${pin}, ${val});\n`;
    });

    registerBlock('blynk_notify', {
        init: function () {
            this.appendDummyInput()
                .appendField("Blynk Notify");
            this.appendValueInput("MSG")
                .setCheck("String")
                .appendField("Message");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLYNK_NOTIFY_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const msg = arduinoGenerator.valueToCode(block, 'MSG', Order.ATOMIC) || '"Notification"';
        return `Blynk.notify(${msg});\n`;
    });

    registerBlock('blynk_email', {
        init: function () {
            this.appendDummyInput()
                .appendField("Blynk Email");
            this.appendValueInput("ADDR")
                .setCheck("String")
                .appendField("To");
            this.appendValueInput("SUBJ")
                .setCheck("String")
                .appendField("Subject");
            this.appendValueInput("BODY")
                .setCheck("String")
                .appendField("Body");
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLYNK_EMAIL_TOOLTIP);
            this.setInputsInline(true);
        }
    }, (block: any) => {
        const addr = arduinoGenerator.valueToCode(block, 'ADDR', Order.ATOMIC) || '"email@example.com"';
        const subj = arduinoGenerator.valueToCode(block, 'SUBJ', Order.ATOMIC) || '"Subject"';
        const body = arduinoGenerator.valueToCode(block, 'BODY', Order.ATOMIC) || '"Body"';
        return `Blynk.email(${addr}, ${subj}, ${body});\n`;
    });

    registerBlock('blynk_connected', {
        init: function () {
            this.appendDummyInput()
                .appendField("Blynk Connected?");
            this.setOutput(true, "Boolean");
            this.setColour(200);
            this.setTooltip(Blockly.Msg.ARD_BLYNK_CONN_TOOLTIP);
        }
    }, (block: any) => {
        return ['Blynk.connected()', Order.ATOMIC];
    });

    // Read Virtual Pin (Requires BLYNK_WRITE callback mechanism)
    // For simplicity in blocks, we currently omit complex callback generation 
    // or we implement a listener block structure if requested.
    // Clean room decision: Start with Write as it's simplest and most common.

};

export const BlynkModule: BlockModule = {
    id: 'protocols.blynk',
    name: 'Blynk IoT',
    category: 'Blynk',
    init
};
