const fabric = require("fabric");
const nanoid = require("nanoid");

async function test() {
  const svg = `<svg width="100" height="100"><rect x="10" y="10" width="80" height="80" fill="red"/></svg>`;
  
  const results = await fabric.loadSVGFromString(svg);
  const objects = results.objects.filter(o => o !== null);
  
  const group = new fabric.Group(objects, {
    left: 400, top: 300, scaleX: 3, scaleY: 3
  });
  
  const jsonOutput = group.toObject();
  console.log("JSON Output: ", JSON.stringify(jsonOutput, null, 2));
}

test().catch(console.error);
