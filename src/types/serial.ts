export interface SerialPortInfo {
    path: string;
    manufacturer?: string;
    friendlyName?: string; // Windows full device name
    vendorId?: string; // Hex string '1234'
    productId?: string; // Hex string '5678'
}

export interface LogEntry {
    id: string; // Unique ID for key
    timestamp?: string;
    text: string;
    type: 'rx' | 'tx';
    noNewline?: boolean;
    lineEndingType?: 'none' | 'lf' | 'cr' | 'crlf' | 'mixed';
    isHex?: boolean;
}
