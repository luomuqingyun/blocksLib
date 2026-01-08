export const LOGIC_CONTENTS = [
    { kind: 'block', type: 'controls_if' },
    { kind: 'block', type: 'controls_switch' },
    { kind: 'sep', gap: 20 },
    { kind: 'block', type: 'logic_compare' },
    { kind: 'block', type: 'logic_operation' },
    { kind: 'block', type: 'logic_negate' },
    { kind: 'block', type: 'logic_boolean' },
];

export const LISTS_CONTENTS = [
    { kind: 'block', type: 'lists_create_with' },
    { kind: 'block', type: 'lists_create_with', extraState: { itemCount: 0 } },
    { kind: 'block', type: 'lists_repeat', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 5 } } } } },
    { kind: 'block', type: 'lists_length' },
    { kind: 'block', type: 'lists_isEmpty' },
    { kind: 'block', type: 'lists_indexOf' },
    { kind: 'block', type: 'lists_getIndex' },
    { kind: 'block', type: 'lists_setIndex' },
    { kind: 'block', type: 'lists_getSublist' },
    { kind: 'sep', gap: 20 },
    { kind: 'label', text: '%{BKY_LABEL_CPPVECTOR}' },
    { kind: 'block', type: 'lists_sort_num' },
    { kind: 'block', type: 'lists_reverse' },
    { kind: 'block', type: 'lists_find_index' }
];

export const C_ADVANCED_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_POINTERS}' },
    { kind: 'block', type: 'c_dereference' },
    { kind: 'block', type: 'c_address_of' },
    { kind: 'label', text: '%{BKY_LABEL_TYPEOPS}' },
    { kind: 'block', type: 'c_sizeof' },
    { kind: 'block', type: 'c_type_cast' }
];

export const LOOPS_CONTENTS = [
    { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
    { kind: 'block', type: 'controls_whileUntil' },
    { kind: 'block', type: 'controls_for', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } }, BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
    { kind: 'sep', gap: 20 },
    { kind: 'block', type: 'c_do_while' },
    { kind: 'block', type: 'c_for_custom' },
    { kind: 'sep', gap: 20 },
    { kind: 'block', type: 'controls_flow_break' },
    { kind: 'block', type: 'controls_flow_continue' }
];

export const MATH_CONTENTS = [
    { kind: 'block', type: 'math_number' },
    { kind: 'block', type: 'math_arithmetic', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
    { kind: 'block', type: 'math_random_int' },
    { kind: 'block', type: 'base_map', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, DMAX: { shadow: { type: 'math_number', fields: { NUM: 180 } } } } },
    { kind: 'block', type: 'various_constrain', inputs: { x: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, a: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, b: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
    { kind: 'block', type: 'math_single' }
];

export const TEXT_CONTENTS = [
    { kind: 'block', type: 'text' },
    { kind: 'block', type: 'text_char' },
    { kind: 'sep', gap: 20 },
    { kind: 'block', type: 'c_text_join' },
    { kind: 'block', type: 'text_length' },
    { kind: 'block', type: 'text_substring' },
    { kind: 'block', type: 'text_to_case' },
    { kind: 'block', type: 'text_to_number' },
    { kind: 'block', type: 'c_to_string' }
];

export const FUNCTIONS_CONTENTS = [
    { kind: 'block', type: 'arduino_entry_root', maxInstances: 1 },
    { kind: 'sep', gap: 20 },
    { kind: 'block', type: 'arduino_functions_def_flexible' },
    { kind: 'block', type: 'arduino_param_def' },
    { kind: 'block', type: 'arduino_functions_call_dynamic' },
    { kind: 'block', type: 'arduino_functions_call_ret' },
    { kind: 'block', type: 'arduino_functions_return' }
];

export const IO_CONTENTS = [
    { kind: 'block', type: 'arduino_digital_write' },
    { kind: 'block', type: 'arduino_digital_read' },
    { kind: 'block', type: 'arduino_analog_write', inputs: { NUM: { shadow: { type: 'math_number', fields: { NUM: 255 } } } } },
    { kind: 'block', type: 'arduino_analog_read' },
    { kind: 'block', type: 'arduino_tone' },
    { kind: 'block', type: 'arduino_map' },
    { kind: 'sep', gap: 30 },
    { kind: 'label', text: '%{BKY_LABEL_DAC}' },
    { kind: 'sep', gap: 10 },
    { kind: 'block', type: 'dac_write' },
    { kind: 'sep', gap: 30 },
    { kind: 'label', text: '%{BKY_LABEL_SHIFTREG}' },
    { kind: 'sep', gap: 10 },
    { kind: 'block', type: 'io_shiftout' },
    { kind: 'block', type: 'io_shiftin' }
];

// ------------------------------------------------------------------
// Time
// ------------------------------------------------------------------
export const RTC_CONTENTS = [
    { kind: 'block', type: 'rtc_init' },
    { kind: 'block', type: 'rtc_set_time' },
    { kind: 'block', type: 'rtc_get_element' },
    { kind: 'block', type: 'rtc_get_date_string' },
    { kind: 'block', type: 'rtc_get_time_string' }
];

export const HTTP_CLIENT_CONTENTS = [
    { kind: 'block', type: 'http_get' },
    { kind: 'block', type: 'http_post' }
];

export const TIMER_CONTENTS = [
    { kind: 'block', type: 'timer_every' },
    { kind: 'block', type: 'timer_once' }
];

export const TIME_CONTENTS = [
    { kind: 'block', type: 'arduino_delay_ms', inputs: { DELAY: { shadow: { type: 'math_number', fields: { NUM: 1000 } } } } },
    { kind: 'block', type: 'arduino_millis' },
    { kind: 'block', type: 'arduino_micros' },
    { kind: 'sep', gap: 30 },
    { kind: 'label', text: '%{BKY_LABEL_RTC}' },
    { kind: 'sep', gap: 10 },
    ...RTC_CONTENTS,
    { kind: 'sep', gap: 30 },
    { kind: 'label', text: '%{BKY_LABEL_TIMERS}' },
    { kind: 'sep', gap: 10 },
    ...TIMER_CONTENTS
];

export const SERIAL_CONTENTS = [
    { kind: 'block', type: 'arduino_serial_setup' },
    { kind: 'sep', gap: 20 },
    { kind: 'block', type: 'arduino_serial_print', inputs: { CONTENT: { shadow: { type: 'text', fields: { TEXT: 'Hello' } } } } },
    { kind: 'block', type: 'arduino_serial_write' },
    { kind: 'sep', gap: 20 },
    { kind: 'block', type: 'arduino_serial_available_check' },
    { kind: 'block', type: 'arduino_serial_read_string' },
    { kind: 'block', type: 'arduino_serial_read_char' }
];

export const SERVO_CONTENTS = [
    { kind: 'block', type: 'arduino_servo_attach' },
    { kind: 'block', type: 'arduino_servo_write', inputs: { ANGLE: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
    { kind: 'block', type: 'arduino_servo_read' },
    { kind: 'block', type: 'arduino_servo_detach' }
];

export const ESP32_CONTENTS = [
    { kind: 'block', type: 'esp32_wifi_connect' },
];

export const ESP_UTILS_CONTENTS = [
    { kind: 'block', type: 'esp_deep_sleep' },
    { kind: 'block', type: 'esp_restart' },
    { kind: 'block', type: 'esp_yield' },
    { kind: 'sep', gap: 20 },
    { kind: 'block', type: 'esp_ticker_attach' },
    { kind: 'block', type: 'esp_ticker_detach' },
    { kind: 'block', type: 'esp32_hall_read' },
    { kind: 'block', type: 'esp32_touch_read' }
];

export const STM32_CONTENTS = [
    // Placeholder for future STM32 specific blocks
    // e.g. { kind: 'block', type: 'stm32_specific_feature' }
];

export const ACTUATOR_CONTENTS = [
    { kind: 'block', type: 'actuator_relay' },
    { kind: 'block', type: 'actuator_solenoid' },
    { kind: 'block', type: 'actuator_buzzer' },
    { kind: 'block', type: 'actuator_vibration' },
];

export const RFID_CONTENTS = [
    { kind: 'block', type: 'rfid_init' },
    { kind: 'block', type: 'rfid_is_new_card' },
    { kind: 'block', type: 'rfid_read_uid' },
    { kind: 'block', type: 'rfid_halt' },
    { kind: 'block', type: 'rfid_auth' },
    { kind: 'block', type: 'rfid_write' },
    { kind: 'block', type: 'rfid_read_block' },
    { kind: 'block', type: 'rfid_write_block' },
];

export const QR_CONTENTS = [
    { kind: 'block', type: 'qr_create' },
    { kind: 'block', type: 'qr_draw_oled' },
];

export const PS2_CONTENTS = [
    { kind: 'block', type: 'ps2_init' },
    { kind: 'sep', gap: 20 },
    { kind: 'block', type: 'ps2_button' },
    { kind: 'block', type: 'ps2_analog' }
];

export const SENSORS_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_GPS}' },
    { kind: 'block', type: 'sensor_gps_init' },
    { kind: 'block', type: 'sensor_gps_read' },
    { kind: 'sep', gap: 30 },
    { kind: 'label', text: '%{BKY_LABEL_CAMERA}' },
    { kind: 'sep', gap: 10 },
    { kind: 'block', type: 'camera_init' },
    { kind: 'block', type: 'camera_take_photo' },
    { kind: 'sep', gap: 30 },
    { kind: 'label', text: '%{BKY_LABEL_ULTRASONIC}' },
    { kind: 'sep', gap: 10 },
    { kind: 'block', type: 'sensor_ultrasonic' },
    { kind: 'block', type: 'sensor_dht' },
    { kind: 'label', text: '%{BKY_LABEL_ADVANCED}' },
    { kind: 'block', type: 'sensor_pir_motion' },
    { kind: 'block', type: 'sensor_adxl362_init' },
    { kind: 'block', type: 'sensor_adxl362_read' },
    { kind: 'block', type: 'sensor_apds9960_init' },
    { kind: 'block', type: 'sensor_apds9960_gesture' },
    { kind: 'block', type: 'sensor_apds9960_read_gesture' },
    { kind: 'block', type: 'sensor_apds9960_color' },
    { kind: 'block', type: 'sensor_hx711_init' },
    { kind: 'block', type: 'sensor_hx711_read' },
    { kind: 'block', type: 'sensor_hx711_tare' },
    { kind: 'block', type: 'sensor_bmp280_init' },
    { kind: 'block', type: 'sensor_bmp280_read' },
    { kind: 'sep', gap: 30 },
    { kind: 'label', text: '%{BKY_LABEL_PRO}' },
    { kind: 'sep', gap: 10 },
    { kind: 'block', type: 'sensor_vl53l0x_init' },
    { kind: 'block', type: 'sensor_vl53l0x_read' },
    { kind: 'block', type: 'sensor_mpu6050_init' },
    { kind: 'block', type: 'sensor_mpu6050_read' },
    { kind: 'sep', gap: 30 },
    { kind: 'label', text: '%{BKY_LABEL_SPECIFIC}' },
    { kind: 'sep', gap: 10 },
    { kind: 'block', type: 'sharp_ir_init' },
    { kind: 'block', type: 'sharp_ir_read' },
    { kind: 'block', type: 'ds18b20_init' },
    { kind: 'block', type: 'ds18b20_request' },
    { kind: 'block', type: 'ds18b20_read' },
    { kind: 'block', type: 'ds18b20_set_resolution' },
    { kind: 'block', type: 'ds18b20_get_device_count' },
];

export const MOTORS_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_DCMOTOR}' },
    { kind: 'sep', gap: 10 },
    { kind: 'block', type: 'motor_dc_run' },
    { kind: 'sep', gap: 30 },
    { kind: 'label', text: '%{BKY_LABEL_STEPPERBASIC}' },
    { kind: 'sep', gap: 10 },
    { kind: 'block', type: 'motor_stepper_config' },
    { kind: 'block', type: 'motor_stepper_step' },
    { kind: 'label', text: '%{BKY_LABEL_STEPPERDRIVERS}' },
    { kind: 'block', type: 'motor_stepper_driver_init' },
    { kind: 'block', type: 'motor_stepper_driver_step' },
    { kind: 'block', type: 'motor_stepper_enable' },
    { kind: 'block', type: 'motor_stepper_move_relative' },
    { kind: 'label', text: '%{BKY_LABEL_ACCELSTEPPER}' },
    { kind: 'block', type: 'stepper_accel_init' },
    { kind: 'block', type: 'stepper_accel_setup' },
    { kind: 'block', type: 'stepper_accel_run' },
    { kind: 'block', type: 'stepper_accel_move' },
    { kind: 'label', text: '%{BKY_LABEL_SERVODRIVER}' },
    { kind: 'block', type: 'pca9685_init' },
    { kind: 'block', type: 'pca9685_set_servo' },
    { kind: 'block', type: 'pca9685_set_pwm' }
];

export const DISPLAYS_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_LCD}' },
    { kind: 'block', type: 'display_lcd_init' },
    { kind: 'block', type: 'display_lcd_print' },
    { kind: 'block', type: 'display_lcd_clear' },
    { kind: 'block', type: 'display_lcd_backlight' },
    { kind: 'label', text: '%{BKY_LABEL_OLED}' },
    { kind: 'block', type: 'oled_init' },
    { kind: 'block', type: 'oled_print' },
    { kind: 'block', type: 'oled_clear' },
    { kind: 'block', type: 'oled_draw_line' },
    { kind: 'block', type: 'oled_draw_rect' },
    { kind: 'block', type: 'oled_draw_circle' },
    { kind: 'block', type: 'oled_display' },
    { kind: 'label', text: '%{BKY_LABEL_MATRIX}' },
    { kind: 'block', type: 'display_matrix_init' },
    { kind: 'block', type: 'display_matrix_set_led' },
    { kind: 'block', type: 'display_matrix_clear' },
    { kind: 'block', type: 'display_matrix_brightness' },
    { kind: 'block', type: 'display_matrix_write_char' },
    { kind: 'block', type: 'display_matrix_row' },
    { kind: 'block', type: 'display_matrix_col' },
    { kind: 'label', text: '%{BKY_LABEL_NEXTION}' },
    { kind: 'block', type: 'nextion_init' },
    { kind: 'block', type: 'nextion_set_text' },
    { kind: 'block', type: 'nextion_set_val' },
    { kind: 'block', type: 'nextion_page' },
    { kind: 'label', text: '%{BKY_LABEL_NEOPIXEL}' },
    { kind: 'block', type: 'display_neopixel_init' },
    { kind: 'block', type: 'display_neopixel_set' },
    { kind: 'block', type: 'display_neopixel_fill' },
    { kind: 'block', type: 'display_neopixel_clear' },
    { kind: 'block', type: 'display_neopixel_rainbow' },
];

export const IOT_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_NETWORK}' },
    { kind: 'block', type: 'net_wifi_connect_generic' },
    { kind: 'block', type: 'net_wifi_status' },
    { kind: 'block', type: 'net_wifi_softap' },
    { kind: 'label', text: '%{BKY_LABEL_ETHERNET}' },
    { kind: 'block', type: 'ethernet_w5500_init' },
    { kind: 'block', type: 'ethernet_w5500_get_ip' },
    { kind: 'block', type: 'net_ethernet_begin' },
    { kind: 'block', type: 'net_ethernet_local_ip' },
    { kind: 'label', text: '%{BKY_LABEL_HTTP}' },
    { kind: 'block', type: 'net_http_get' },
    { kind: 'block', type: 'net_http_post' },
    { kind: 'block', type: 'web_server_init' },
    { kind: 'block', type: 'web_server_on' },
    { kind: 'block', type: 'web_server_send' },
    { kind: 'block', type: 'web_server_start' },
    { kind: 'block', type: 'web_server_handle_client' },
    { kind: 'label', text: '%{BKY_LABEL_SERVICES}' },
    { kind: 'block', type: 'net_ntp_init' },
    { kind: 'block', type: 'net_ntp_get_time' },
    { kind: 'block', type: 'net_ntp_get_epoch' },
    { kind: 'block', type: 'mqtt_setup' },
    { kind: 'block', type: 'mqtt_connect' },
    { kind: 'block', type: 'mqtt_publish' },
    { kind: 'block', type: 'mqtt_subscribe' },
    { kind: 'block', type: 'mqtt_loop' },
    { kind: 'block', type: 'mqtt_callback_define' },
    { kind: 'block', type: 'mqtt_get_topic' },
    { kind: 'block', type: 'mqtt_get_message' },
    { kind: 'label', text: '%{BKY_LABEL_BLYNK}' },
    { kind: 'block', type: 'blynk_setup_wifi' },
    { kind: 'block', type: 'blynk_write' },
    { kind: 'block', type: 'blynk_notify' },
    { kind: 'block', type: 'blynk_email' },
    { kind: 'block', type: 'blynk_connected' },
    { kind: 'label', text: '%{BKY_LABEL_CLOUD}' },
    { kind: 'block', type: 'telegram_config' },
    { kind: 'block', type: 'telegram_check' },
    { kind: 'block', type: 'telegram_msg_text' },
    { kind: 'block', type: 'telegram_send' },
    { kind: 'block', type: 'openai_init' },
    { kind: 'block', type: 'openai_ask' },
    { kind: 'block', type: 'firebase_config' },
    { kind: 'block', type: 'firebase_set_int' },
    { kind: 'block', type: 'firebase_get_int' },
    { kind: 'block', type: 'firebase_set_string' },
    { kind: 'block', type: 'ws_server_init' },
    { kind: 'block', type: 'ws_on_event' },
    { kind: 'block', type: 'ws_check_type' },
    { kind: 'block', type: 'ws_send_all' },
    { kind: 'block', type: 'esp_now_init' },
    { kind: 'block', type: 'esp_now_add_peer' },
    { kind: 'block', type: 'esp_now_send' },
    { kind: 'block', type: 'esp_now_on_recv' },
    { kind: 'label', text: '%{BKY_LABEL_OTA}' },
    { kind: 'block', type: 'ota_setup' },
    { kind: 'block', type: 'ota_handle' },
    { kind: 'label', text: '%{BKY_LABEL_HTTPCLIENT}' },
    ...HTTP_CLIENT_CONTENTS
];

export const PROTOCOLS_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_WIRELESS}' },
    { kind: 'block', type: 'ir_recv_setup' },
    { kind: 'block', type: 'ir_recv_available' },
    { kind: 'block', type: 'ir_recv_resume' },
    { kind: 'block', type: 'ir_recv_get_hex' },
    { kind: 'block', type: 'ir_send_nec' },
    { kind: 'block', type: 'bt_serial_init' },
    { kind: 'block', type: 'bt_serial_available' },
    { kind: 'block', type: 'bt_serial_read' },
    { kind: 'block', type: 'bt_serial_print' },
    { kind: 'block', type: 'radio_tx_init' },
    { kind: 'block', type: 'radio_tx_send' },
    { kind: 'block', type: 'radio_rx_init' },
    { kind: 'block', type: 'radio_rx_available' },
    { kind: 'block', type: 'radio_rx_get' },
    { kind: 'block', type: 'radio_rx_reset' },
    { kind: 'block', type: 'radio_rx_info' },
    { kind: 'block', type: 'nrf24_init' },
    { kind: 'block', type: 'nrf24_send' },
    { kind: 'block', type: 'nrf24_available' },
    { kind: 'block', type: 'nrf24_read' },
    { kind: 'block', type: 'nrf24_config' },
    { kind: 'block', type: 'nrf24_open_pipe' },
    { kind: 'block', type: 'lora_init' },
    { kind: 'block', type: 'lora_config' },
    { kind: 'block', type: 'lora_packet_begin' },
    { kind: 'block', type: 'lora_print' },
    { kind: 'block', type: 'lora_packet_end' },
    { kind: 'block', type: 'lora_parse_packet' },
    { kind: 'block', type: 'lora_read' },
    { kind: 'block', type: 'lora_available' },
    { kind: 'block', type: 'lora_packet_rssi' },
    { kind: 'block', type: 'lora_packet_snr' },
    { kind: 'block', type: 'lora_read_string' },
    { kind: 'label', text: '%{BKY_LABEL_INDUSTRIAL}' },
    { kind: 'block', type: 'can_init' },
    { kind: 'block', type: 'can_send' },
    { kind: 'block', type: 'modbus_init' },
    { kind: 'block', type: 'modbus_read_regs' },
    { kind: 'block', type: 'modbus_get_buffer' }
];

export const AUDIO_CONTENTS = [
    { kind: 'block', type: 'audio_tone' },
    { kind: 'block', type: 'audio_notone' },
    { kind: 'block', type: 'actuator_buzzer_notone' },
    { kind: 'block', type: 'audio_note_freq' },
    { kind: 'block', type: 'mp3_init' },
    { kind: 'block', type: 'mp3_play' },
    { kind: 'block', type: 'mp3_control' },
    { kind: 'block', type: 'mp3_volume' },
    { kind: 'block', type: 'speech_init' },
    { kind: 'block', type: 'speech_say' },
];

export const STORAGE_CONTENTS = [
    { kind: 'block', type: 'storage_sd_init' },
    { kind: 'block', type: 'storage_sd_write' },
    { kind: 'block', type: 'storage_sd_read' },
    { kind: 'block', type: 'storage_sd_exists' },
    { kind: 'block', type: 'storage_eeprom_write' },
    { kind: 'block', type: 'storage_eeprom_read' },
    { kind: 'block', type: 'storage_eeprom_commit' },
    { kind: 'block', type: 'storage_spiffs_begin' },
    { kind: 'block', type: 'storage_spiffs_write' },
    { kind: 'block', type: 'nvs_begin' },
    { kind: 'block', type: 'nvs_put_int' },
    { kind: 'block', type: 'nvs_get_int' },
    { kind: 'block', type: 'nvs_put_string' },
    { kind: 'block', type: 'nvs_get_string' },
];

export const INPUTS_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_KEYPAD}' },
    { kind: 'block', type: 'input_keypad_init' },
    { kind: 'block', type: 'input_keypad_get_key' },
    { kind: 'label', text: '%{BKY_LABEL_JOYSTICK}' },
    { kind: 'block', type: 'input_joystick_read' },
    { kind: 'label', text: '%{BKY_LABEL_ROTARY}' },
    { kind: 'block', type: 'input_rotary_init' },
    { kind: 'block', type: 'input_rotary_read' },
    { kind: 'block', type: 'input_rotary_reset' },
    { kind: 'label', text: '%{BKY_LABEL_WII}' },
    { kind: 'block', type: 'wii_init' },
    { kind: 'block', type: 'wii_update' },
    { kind: 'block', type: 'wii_read_axis' },
    { kind: 'block', type: 'wii_button' },
    { kind: 'label', text: '%{BKY_LABEL_TOUCH}' },
    { kind: 'block', type: 'touch_read' },
    { kind: 'block', type: 'touch_is_touched' },
    { kind: 'label', text: '%{BKY_LABEL_BARCODE}' },
    { kind: 'block', type: 'barcode_init' },
    { kind: 'block', type: 'barcode_available' },
    { kind: 'block', type: 'barcode_read' }
];

export const EXPANSION_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_IOEXPANDER}' },
    { kind: 'block', type: 'pcf8574_init' },
    { kind: 'block', type: 'pcf8574_pin_mode' },
    { kind: 'block', type: 'pcf8574_write' },
    { kind: 'block', type: 'pcf8574_read' },
    { kind: 'label', text: '%{BKY_LABEL_SHIFTREGISTER}' },
    { kind: 'block', type: 'shift_out_74hc595' },
    { kind: 'block', type: 'shift_in_74hc165' }
];

export const HID_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_USB_KB}' },
    { kind: 'block', type: 'usb_keyboard_init' },
    { kind: 'block', type: 'usb_keyboard_print' },
    { kind: 'block', type: 'usb_keyboard_press' },
    { kind: 'label', text: '%{BKY_LABEL_USB_MOUSE}' },
    { kind: 'block', type: 'usb_mouse_init' },
    { kind: 'block', type: 'usb_mouse_move' },
    { kind: 'block', type: 'usb_mouse_click' },
    { kind: 'label', text: '%{BKY_LABEL_BLE_KB}' },
    { kind: 'block', type: 'ble_keyboard_init' },
    { kind: 'block', type: 'ble_keyboard_print' },
    { kind: 'block', type: 'ble_keyboard_press' },
    { kind: 'label', text: '%{BKY_LABEL_BLE_MOUSE}' },
    { kind: 'block', type: 'ble_mouse_init' },
    { kind: 'block', type: 'ble_mouse_move' },
    { kind: 'block', type: 'ble_mouse_click' }
];

export const AI_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_TINYML}' },
    { kind: 'block', type: 'tinyml_knn_init' },
    { kind: 'block', type: 'tinyml_knn_add' },
    { kind: 'block', type: 'tinyml_knn_classify' }
];

export const DATA_SC_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_DICTIONARY}' },
    { kind: 'block', type: 'dict_create' },
    { kind: 'block', type: 'dict_set' },
    { kind: 'block', type: 'dict_get' },
    { kind: 'block', type: 'dict_exists' },
    { kind: 'label', text: '%{BKY_LABEL_CRYPTO}' },
    { kind: 'block', type: 'crypto_md5' },
    { kind: 'block', type: 'crypto_sha256' },
    { kind: 'block', type: 'crypto_base64_encode' },
    { kind: 'block', type: 'crypto_base64_decode' }
];

export const DATA_FMT_CONTENTS = [
    { kind: 'block', type: 'data_csv_create' },
    { kind: 'block', type: 'data_csv_parse' }
];

export const SIGNAL_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_KALMAN}' },
    { kind: 'block', type: 'filter_kalman_init' },
    { kind: 'block', type: 'filter_kalman_update' },
    { kind: 'label', text: '%{BKY_LABEL_LOWPASS}' },
    { kind: 'block', type: 'filter_lowpass' }
];

export const STATS_CONTENTS = [
    { kind: 'block', type: 'stats_average' },
    { kind: 'block', type: 'stats_min_max' }
];

export const AUDIO_IN_CONTENTS = [
    { kind: 'block', type: 'audio_read_volume' },
    { kind: 'block', type: 'audio_is_loud' }
];



export const SYSTEM_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_INTERRUPTS}' },
    { kind: 'block', type: 'system_interrupt_attach' },
    { kind: 'block', type: 'system_interrupt_referrer' },
    { kind: 'block', type: 'system_interrupts_enable' },
    { kind: 'block', type: 'system_interrupts_disable' },
    { kind: 'label', text: '%{BKY_LABEL_PULSETIME}' },
    { kind: 'block', type: 'system_pulse_in' },
    { kind: 'block', type: 'system_millis' },
    { kind: 'block', type: 'system_micros' },
    { kind: 'label', text: '%{BKY_LABEL_RESET}' },
    { kind: 'block', type: 'system_software_reset' }
];

export const RTOS_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_MULTITASKING}' },
    { kind: 'block', type: 'rtos_task_create' },
    { kind: 'block', type: 'rtos_delay' }
];

export const GAME_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_GAMEENGINE}' },
    { kind: 'block', type: 'game_init' },
    { kind: 'block', type: 'game_create_sprite' },
    { kind: 'block', type: 'game_set_velocity' },
    { kind: 'block', type: 'game_update_all' },
    { kind: 'block', type: 'game_check_collision' },
    { kind: 'block', type: 'game_get_prop' }
];

export const ROBOTS_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_OTTO}' },
    { kind: 'block', type: 'otto_init' },
    { kind: 'block', type: 'otto_home' },
    { kind: 'block', type: 'otto_move' },
    { kind: 'block', type: 'otto_dance' },
    { kind: 'block', type: 'otto_sound' },
    { kind: 'block', type: 'otto_gesture' },
    { kind: 'block', type: 'otto_mouth' },
    { kind: 'label', text: '%{BKY_LABEL_MBOT}' },
    { kind: 'block', type: 'mbot_motor_move' },
    { kind: 'block', type: 'mbot_motor_stop' },
    { kind: 'block', type: 'mbot_motor' },
    { kind: 'block', type: 'mbot_ultrasonic' },
    { kind: 'block', type: 'mbot_line_follower' },
    { kind: 'block', type: 'mbot_rgb' }
];

export const MENU_CONTENTS = [
    { kind: 'block', type: 'menu_create' },
    { kind: 'block', type: 'menu_add_item' },
    { kind: 'block', type: 'menu_manage_input' },
    { kind: 'block', type: 'menu_nav' },
    { kind: 'block', type: 'menu_get_current' }
];

export const PID_CONTENTS = [
    { kind: 'block', type: 'pid_create' },
    { kind: 'block', type: 'pid_compute' },
    { kind: 'block', type: 'pid_tunings' }
];

export const LOGGING_CONTENTS = [
    { kind: 'block', type: 'log_to_serial_csv' },
    { kind: 'block', type: 'log_plotter_print' }
];

export const DIAGNOSTICS_CONTENTS = [
    { kind: 'block', type: 'temp_read' },
    { kind: 'block', type: 'diag_free_heap' },
    { kind: 'block', type: 'diag_uptime' },
    { kind: 'block', type: 'diag_restart_reason' },
    { kind: 'block', type: 'diag_chip_model' }
];

export const JSON_CONTENTS = [
    { kind: 'block', type: 'json_create_doc' },
    { kind: 'block', type: 'json_parse' },
    { kind: 'block', type: 'json_get_key' },
    { kind: 'block', type: 'json_set_key' },
    { kind: 'block', type: 'json_serialize' }
];

export const VENDOR_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_DFROBOT}' },
    { kind: 'block', type: 'dfrobot_player_init' },
    { kind: 'block', type: 'dfrobot_player_play' },
    { kind: 'block', type: 'dfrobot_player_volume' },
    { kind: 'block', type: 'dfrobot_player_control' },
    { kind: 'block', type: 'dfrobot_player_loop' },
    { kind: 'block', type: 'dfrobot_player_eq' },
    { kind: 'label', text: '%{BKY_LABEL_SEEEDGROVE}' },
    { kind: 'block', type: 'grove_led_init' },
    { kind: 'block', type: 'grove_led_set' },
    { kind: 'block', type: 'grove_led_set_hsl' },
    { kind: 'block', type: 'grove_display_4digit_init' },
    { kind: 'block', type: 'grove_display_4digit_print' }
];

export const ADVANCED_VARS_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_STRUCTS}' },
    { kind: 'block', type: 'c_struct_define' },
    { kind: 'block', type: 'c_struct_member_item' },
    { kind: 'block', type: 'c_struct_var_declare' },
    { kind: 'block', type: 'c_struct_set_member' },
    { kind: 'block', type: 'c_struct_get_member' },
    { kind: 'label', text: '%{BKY_LABEL_ENUMS}' },
    { kind: 'block', type: 'c_enum_define' },
    { kind: 'block', type: 'c_enum_item' },
    { kind: 'block', type: 'c_enum_var_declare' },
    { kind: 'block', type: 'c_enum_set' },
    { kind: 'block', type: 'c_enum_get' },
    { kind: 'label', text: '%{BKY_LABEL_ARRAYS}' },
    { kind: 'block', type: 'c_array_define' },
    { kind: 'block', type: 'c_array_get_element' },
    { kind: 'block', type: 'c_array_set_element' },
    { kind: 'label', text: '%{BKY_LABEL_MACROS}' },
    { kind: 'block', type: 'c_macro_define' },
    { kind: 'block', type: 'c_macro_get' },
    { kind: 'block', type: 'c_include' }
];


export const SPECIAL_SENSORS_CONTENTS = [
    { kind: 'label', text: '%{BKY_LABEL_CAPPULSE}' },
    { kind: 'block', type: 'sensor_capacitive_init' },
    { kind: 'block', type: 'sensor_capacitive_read' },
    { kind: 'block', type: 'sensor_pulse_read' },
    { kind: 'label', text: '%{BKY_LABEL_LIGHTSENSOR}' },
    { kind: 'block', type: 'sensor_tsl2561_init' },
    { kind: 'block', type: 'sensor_tsl2561_read' }
];

export const TEST_DEV_CONTENTS = [
    { kind: 'label', text: 'Dev Test' },
    { kind: 'block', type: 'test_dev_log' }
];
