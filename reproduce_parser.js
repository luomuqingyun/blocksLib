const fs = require('fs');

const fileContent = `{
  "metadata": {
    "version": "1.0.0",
    "name": "MyProject",
    "boardId": "uno",
    "createdAt": 1765441378744,
    "lastModified": 1765512389553
  },
  "blocks": {
    "blocks": {
      "languageVersion": 0,
      "blocks": [
        {
          "type": "arduino_var_declare",
          "id": "^/vvY{^zjm8KE.E,E*)}",
          "x": -950,
          "y": -530,
          "fields": {
            "QUALIFIER": "NONE",
            "TYPE": "int",
            "VAR": "myVar"
          }
        }
      ]
    }
  }
}`;

const rawJson = JSON.parse(fileContent);
let blocks = rawJson.blocks;

console.log("Initial blocks:", JSON.stringify(blocks, null, 2));

if (blocks && blocks.blocks && !Array.isArray(blocks.blocks)) {
    console.log("[ProjectService] Migrating nested blocks structure");
    blocks = blocks.blocks;
}

console.log("Final blocks:", JSON.stringify(blocks, null, 2));

const expected = {
    "languageVersion": 0,
    "blocks": [
        {
            "type": "arduino_var_declare",
            "id": "^/vvY{^zjm8KE.E,E*)}",
            "x": -950,
            "y": -530,
            "fields": {
                "QUALIFIER": "NONE",
                "TYPE": "int",
                "VAR": "myVar"
            }
        }
    ]
};

console.log("Check:", JSON.stringify(blocks) === JSON.stringify(expected) ? "PASS" : "FAIL");
